import Incident from "../Models/Incident.js";
import RiskZone from "../Models/RiskZone.js";
import { predictRiskWithModel } from "./aiRiskPredictor.js";

const INCIDENT_WINDOW_DEGREES = 0.08;
const ZONE_MERGE_MAX_DISTANCE_METERS = 220;
const ZONE_MERGE_SEARCH_DEGREES = ZONE_MERGE_MAX_DISTANCE_METERS / 111320;

const incidentTypeWeights = {
  theft: 1.0,
  suspicious: 0.8,
  accident: 0.7,
  lost: 0.4,
  other: 0.5,
};

const incidentTypeToDescription = {
  theft: "city tourism",
  suspicious: "night travel",
  accident: "trekking route",
  lost: "remote village visit",
  other: "city tourism",
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const toRadians = (degree) => degree * (Math.PI / 180);

const haversineDistanceMeters = (lat1, lon1, lat2, lon2) => {
  const earthRadius = 6371000;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadius * c;
};

const getNearbyWindowQuery = (location, delta = INCIDENT_WINDOW_DEGREES) => ({
  "location.lat": { $gte: location.lat - delta, $lte: location.lat + delta },
  "location.lon": { $gte: location.lon - delta, $lte: location.lon + delta },
});

const reverseGeocodeFromOpenMeteo = async (location, signal) => {
  const url = `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${location.lat}&longitude=${location.lon}&language=en&format=json`;
  const response = await fetch(url, { signal });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  const first = data?.results?.[0];
  return first?.admin1 || first?.country || null;
};

const reverseGeocodeFromNominatim = async (location, signal) => {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${location.lat}&lon=${location.lon}&zoom=10&addressdetails=1`;
  const response = await fetch(url, {
    signal,
    headers: {
      "User-Agent": "SafeVoyage/1.0 (tourist-safety-platform)",
      "Accept-Language": "en",
    },
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  const address = data?.address || {};
  return address.state || address.region || address.county || address.country || null;
};

const reverseGeocodeState = async (location) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 7000);

  try {
    const fromOpenMeteo = await reverseGeocodeFromOpenMeteo(location, controller.signal);
    if (fromOpenMeteo) {
      return fromOpenMeteo;
    }

    const fromNominatim = await reverseGeocodeFromNominatim(location, controller.signal);
    if (fromNominatim) {
      return fromNominatim;
    }

    return "unknown";
  } catch {
    return "unknown";
  } finally {
    clearTimeout(timeoutId);
  }
};

const getDominantIncidentType = (incidents, currentType) => {
  const scoreByType = new Map();

  for (const incident of incidents) {
    const type = incident.incidentType || "other";
    const weight = incidentTypeWeights[type] || incidentTypeWeights.other;
    scoreByType.set(type, (scoreByType.get(type) || 0) + weight);
  }

  if (currentType) {
    const type = currentType || "other";
    const weight = incidentTypeWeights[type] || incidentTypeWeights.other;
    scoreByType.set(type, (scoreByType.get(type) || 0) + weight * 1.2);
  }

  if (!scoreByType.size) {
    return "other";
  }

  return [...scoreByType.entries()].sort((a, b) => b[1] - a[1])[0][0];
};

const deriveRiskSignals = (incidents, currentIncident = {}) => {
  const weightedIncidentLoad = incidents.reduce((sum, incident) => {
    const weight = incidentTypeWeights[incident.incidentType] || incidentTypeWeights.other;
    return sum + weight;
  }, 0);

  const currentWeight = incidentTypeWeights[currentIncident.incidentType] || incidentTypeWeights.other;
  const incidentPressure = weightedIncidentLoad + currentWeight;
  const crimeRate = clamp(incidentPressure / 18, 0.02, 1);

  const uniqueDevices = new Set(incidents.map((incident) => incident.deviceId).filter(Boolean));
  if (currentIncident.deviceId) {
    uniqueDevices.add(currentIncident.deviceId);
  }
  const touristDensity = clamp(uniqueDevices.size / 25, 0.05, 1);

  const dominantIncidentType = getDominantIncidentType(incidents, currentIncident.incidentType);
  const description = incidentTypeToDescription[dominantIncidentType] || "city tourism";

  return {
    crimeRate,
    touristDensity,
    description,
    incidentCount: incidents.length,
    dominantIncidentType,
  };
};

const calculateGeofenceRadius = (location, incidents) => {
  if (!incidents.length) {
    return 450;
  }

  const distances = incidents
    .map((incident) =>
      haversineDistanceMeters(location.lat, location.lon, incident.location.lat, incident.location.lon)
    )
    .filter((distance) => distance <= 3000)
    .sort((a, b) => a - b)
    .slice(0, 8);

  if (!distances.length) {
    return 450;
  }

  const averageDistance = distances.reduce((sum, distance) => sum + distance, 0) / distances.length;
  return Math.round(clamp(averageDistance * 1.4, 200, 2200));
};

export const buildAreaPrediction = async ({
  location,
  incidentType,
  deviceId,
  state,
  description,
  crimeRate,
  tourist_density,
}) => {
  const nearbyIncidents = await Incident.find(
    getNearbyWindowQuery(location),
    "location incidentType deviceId createdAt"
  )
    .sort({ createdAt: -1 })
    .limit(120)
    .lean();

  const derived = deriveRiskSignals(nearbyIncidents, { incidentType, deviceId });
  const resolvedState = state || (await reverseGeocodeState(location));

  const predictionInputs = {
    state: resolvedState || "unknown",
    description: description || derived.description,
    crimeRate: clamp(Number(crimeRate ?? derived.crimeRate), 0, 1),
    touristDensity: clamp(Number(tourist_density ?? derived.touristDensity), 0, 1),
  };

  const prediction = await predictRiskWithModel({
    state: predictionInputs.state,
    description: predictionInputs.description,
    crimeRate: predictionInputs.crimeRate,
    location,
    touristDensity: predictionInputs.touristDensity,
  });

  return {
    prediction,
    predictionInputs,
    derived,
    nearbyIncidents,
  };
};

export const upsertRiskZoneFromIncident = async (incident) => {
  const location = incident.location;
  const area = await buildAreaPrediction({
    location,
    incidentType: incident.incidentType,
    deviceId: incident.deviceId,
    description: incident.description,
  });

  const mergeCandidates = await RiskZone.find(getNearbyWindowQuery(location, ZONE_MERGE_SEARCH_DEGREES));
  const existingZone = mergeCandidates
    .map((zone) => ({
      zone,
      distance: haversineDistanceMeters(
        location.lat,
        location.lon,
        zone.location.lat,
        zone.location.lon
      ),
    }))
    .filter((entry) => entry.distance <= ZONE_MERGE_MAX_DISTANCE_METERS)
    .sort((a, b) => a.distance - b.distance)[0]?.zone;
  const geofenceRadius = calculateGeofenceRadius(location, area.nearbyIncidents);

  const zonePayload = {
    name: existingZone?.name || `Auto Zone ${location.lat.toFixed(3)}, ${location.lon.toFixed(3)}`,
    location,
    state: area.predictionInputs.state,
    description: area.predictionInputs.description,
    crimeRate: area.predictionInputs.crimeRate,
    tourist_density: area.predictionInputs.touristDensity,
    weatherScore: area.prediction.feature_snapshot?.weather_risk ?? 0.5,
    terrainScore: area.prediction.feature_snapshot?.terrain_difficulty ?? 0.5,
    timeScore: area.prediction.feature_snapshot?.time_of_day ?? 0,
    riskScore: area.prediction.risk_score,
    riskLevel: area.prediction.risk_level,
    geofenceRadius,
  };

  if (existingZone) {
    Object.assign(existingZone, zonePayload);
    await existingZone.save();
    return existingZone;
  }

  return RiskZone.create(zonePayload);
};
