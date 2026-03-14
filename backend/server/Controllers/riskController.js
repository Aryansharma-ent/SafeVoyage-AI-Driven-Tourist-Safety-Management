import RiskZone from "../Models/RiskZone.js";
import Incident from "../Models/Incident.js";
import AsyncHandler from 'express-async-handler'
import { buildAreaPrediction } from "../utils/riskZoneEngine.js";

const SURGE_RECENT_MINUTES = 30;
const SURGE_BASELINE_MINUTES = 360;
const SURGE_MIN_INCIDENTS = 2;

const toRadians = (degree) => degree * (Math.PI / 180);

const haversineDistanceMeters = (lat1, lon1, lat2, lon2) => {
    const earthRadius = 6371000;
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadius * c;
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const metersToLatitudeDelta = (meters) => meters / 111320;

const metersToLongitudeDelta = (meters, latitude) => {
    const cosValue = Math.cos(toRadians(latitude));
    const safeCos = Math.abs(cosValue) < 0.1 ? 0.1 : Math.abs(cosValue);
    return meters / (111320 * safeCos);
};

const getNearbyIncidentQuery = (lat, lon, radiusMeters, createdAtRange) => {
    const latDelta = metersToLatitudeDelta(radiusMeters);
    const lonDelta = metersToLongitudeDelta(radiusMeters, lat);

    return {
        "location.lat": { $gte: lat - latDelta, $lte: lat + latDelta },
        "location.lon": { $gte: lon - lonDelta, $lte: lon + lonDelta },
        createdAt: createdAtRange,
    };
};

const resolveSurgeLevel = ({ score, ratio, recentCount }) => {
    if (recentCount < SURGE_MIN_INCIDENTS) return "none";
    if (score >= 80 || ratio >= 4) return "critical";
    if (score >= 60 || ratio >= 2.7) return "high";
    if (score >= 40 || ratio >= 1.8) return "medium";
    return "none";
};

const resolveTrendDirection = (recentCount, previousCount) => {
    if (recentCount >= previousCount + 2 || recentCount > previousCount * 1.2) {
        return "rising";
    }
    if (previousCount >= recentCount + 2 || previousCount > recentCount * 1.2) {
        return "falling";
    }
    return "stable";
};

const calculateSurgeForArea = async (lat, lon, geofenceRadius = 700) => {
    const now = new Date();
    const recentStart = new Date(now.getTime() - SURGE_RECENT_MINUTES * 60 * 1000);
    const baselineStart = new Date(now.getTime() - SURGE_BASELINE_MINUTES * 60 * 1000);
    const previousWindowStart = new Date(recentStart.getTime() - SURGE_RECENT_MINUTES * 60 * 1000);
    const radiusMeters = clamp(Number(geofenceRadius || 700), 350, 2200);

    const [recentCount, baselineCount, previousCount] = await Promise.all([
        Incident.countDocuments(
            getNearbyIncidentQuery(lat, lon, radiusMeters, { $gte: recentStart, $lte: now })
        ),
        Incident.countDocuments(
            getNearbyIncidentQuery(lat, lon, radiusMeters, { $gte: baselineStart, $lt: recentStart })
        ),
        Incident.countDocuments(
            getNearbyIncidentQuery(lat, lon, radiusMeters, { $gte: previousWindowStart, $lt: recentStart })
        ),
    ]);

    const baselineMinutesOnly = SURGE_BASELINE_MINUTES - SURGE_RECENT_MINUTES;
    const expectedRecent = Math.max(
        0.5,
        (baselineCount * SURGE_RECENT_MINUTES) / Math.max(1, baselineMinutesOnly)
    );
    const ratio = recentCount / expectedRecent;
    const zScore = (recentCount - expectedRecent) / Math.sqrt(expectedRecent + 1);
    const surgeScore = clamp((ratio - 1) * 35 + zScore * 12 + recentCount * 4, 0, 100);
    const surgeLevel = resolveSurgeLevel({ score: surgeScore, ratio, recentCount });
    const trendDirection = resolveTrendDirection(recentCount, previousCount);

    return {
        surgeScore: Number(surgeScore.toFixed(1)),
        surgeLevel,
        spikeRatio: Number(ratio.toFixed(2)),
        trendDirection,
        recentIncidentCount: recentCount,
        expectedIncidentCount: Number(expectedRecent.toFixed(2)),
        baselineIncidentCount: baselineCount,
        previousWindowCount: previousCount,
        recentWindowMinutes: SURGE_RECENT_MINUTES,
        baselineWindowMinutes: SURGE_BASELINE_MINUTES,
    };
};

const calculateGeofenceRadiusFromIncidents = async (centerLat, centerLon) => {
    // Pull nearby incidents around the zone center to estimate practical alert radius.
    const candidates = await Incident.find(
        {
            "location.lat": { $gte: centerLat - 0.05, $lte: centerLat + 0.05 },
            "location.lon": { $gte: centerLon - 0.05, $lte: centerLon + 0.05 },
        },
        "location"
    ).lean();

    if (!candidates.length) {
        return 500;
    }

    const nearbyDistances = candidates
        .map((item) => haversineDistanceMeters(centerLat, centerLon, item.location.lat, item.location.lon))
        .filter((distance) => distance <= 3000)
        .sort((a, b) => a - b)
        .slice(0, 5);

    if (!nearbyDistances.length) {
        return 500;
    }

    const averageDistance = nearbyDistances.reduce((sum, distance) => sum + distance, 0) / nearbyDistances.length;
    return Math.round(clamp(averageDistance * 1.5, 200, 2000));
};

//@GET get all risk area reports
export const getRisk = AsyncHandler(async(req,res)=>{
    const Risks = await RiskZone.find().lean();

    if(!Risks){
        res.status(400)
        throw new Error("Risk areas don't exist")
    }

    const enrichedRisks = await Promise.all(
        Risks.map(async (risk) => {
            const surge = await calculateSurgeForArea(
                risk.location.lat,
                risk.location.lon,
                risk.geofenceRadius
            );

            return {
                ...risk,
                surge,
            };
        })
    );

    res.status(200).json(enrichedRisks)
})


//@POST post a risky area
export const createRisk = AsyncHandler(async(req,res)=>{
    if(!req.admin){
        res.status(403);
        throw new Error("Not authorized")
    }
    const {name,location,state,description,crimeRate,tourist_density,weatherScore,terrainScore,timeScore,riskScore,riskLevel} = req.body

    if (!location || typeof location.lat !== 'number' || typeof location.lon !== 'number') {
        res.status(400);
        throw new Error('location.lat and location.lon are required');
    }

    const geofenceRadius = await calculateGeofenceRadiusFromIncidents(location.lat, location.lon);

    const areaPrediction = await buildAreaPrediction({
        location,
        state,
        description,
        crimeRate,
        tourist_density,
    });

    const risk = await RiskZone.create({
        name,
        location,
        state: areaPrediction.predictionInputs.state,
        description: areaPrediction.predictionInputs.description,
        tourist_density: areaPrediction.predictionInputs.touristDensity,
        crimeRate: areaPrediction.predictionInputs.crimeRate,
        weatherScore: weatherScore ?? areaPrediction.prediction.feature_snapshot?.weather_risk ?? 0.5,
        terrainScore: terrainScore ?? areaPrediction.prediction.feature_snapshot?.terrain_difficulty ?? 0.5,
        timeScore: timeScore ?? areaPrediction.prediction.feature_snapshot?.time_of_day ?? 0,
        riskScore: riskScore ?? areaPrediction.prediction.risk_score,
        riskLevel: riskLevel ?? areaPrediction.prediction.risk_level,
        geofenceRadius,
    })
    res.status(201).json(risk);
})

//@POST predict risk for a location using incident-driven model inputs
export const predictRisk = AsyncHandler(async (req, res) => {
    const { location, state, description, incidentType, deviceId, crimeRate, tourist_density } = req.body;

    if (!location || typeof location.lat !== 'number' || typeof location.lon !== 'number') {
        res.status(400);
        throw new Error('location.lat and location.lon are required');
    }

    const areaPrediction = await buildAreaPrediction({
        location,
        state,
        description,
        incidentType,
        deviceId,
        crimeRate,
        tourist_density,
    });

    const surge = await calculateSurgeForArea(location.lat, location.lon, 800);

    res.status(200).json({
        location,
        inputsUsed: {
            state: areaPrediction.predictionInputs.state,
            description: areaPrediction.predictionInputs.description,
            crimeRate: areaPrediction.predictionInputs.crimeRate,
            tourist_density: areaPrediction.predictionInputs.touristDensity,
            dominantIncidentType: areaPrediction.derived.dominantIncidentType,
            nearbyIncidentCount: areaPrediction.derived.incidentCount,
        },
        prediction: areaPrediction.prediction,
        surge,
    });
});

//@POST check if a location is inside any risk geofence
export const checkGeofence = AsyncHandler(async (req, res) => {
    const { location } = req.body;

    if (!location || typeof location.lat !== 'number' || typeof location.lon !== 'number') {
        res.status(400);
        throw new Error('location.lat and location.lon are required');
    }

    const riskZones = await RiskZone.find({}, 'name location riskLevel riskScore geofenceRadius');

    const matchedZones = riskZones
        .map((zone) => {
            const distanceMeters = haversineDistanceMeters(
                location.lat,
                location.lon,
                zone.location.lat,
                zone.location.lon
            );

            const radiusMeters = zone.geofenceRadius || 500;
            return {
                zoneId: zone._id,
                name: zone.name,
                location: zone.location,
                riskLevel: zone.riskLevel,
                riskScore: zone.riskScore,
                radiusMeters,
                distanceMeters: Number(distanceMeters.toFixed(2)),
                inside: distanceMeters <= radiusMeters,
            };
        })
        .filter((zone) => zone.inside)
        .sort((a, b) => a.distanceMeters - b.distanceMeters);

    const matchesWithSurge = await Promise.all(
        matchedZones.map(async (zone) => ({
            ...zone,
            surge: await calculateSurgeForArea(
                Number(zone.location?.lat),
                Number(zone.location?.lon),
                zone.radiusMeters
            ),
        }))
    );

    res.status(200).json({
        isInsideRiskZone: matchesWithSurge.length > 0,
        totalMatches: matchesWithSurge.length,
        nearestMatch: matchesWithSurge[0] || null,
        matches: matchesWithSurge,
    });
});