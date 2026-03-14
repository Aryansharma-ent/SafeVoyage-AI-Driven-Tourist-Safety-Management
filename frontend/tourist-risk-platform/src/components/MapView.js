import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Circle, Popup, FeatureGroup } from "react-leaflet";
import L from "leaflet";
import { checkGeofence as checkGeofenceApi, getRiskZones, predictRisk } from "../services/api";
import "./MapView.css";

const DEFAULT_LOCATION = { latitude: 40.7128, longitude: -74.0060 };
const MAX_RENDERED_ZONES = 150;
const RADIUS_COMMIT_DELAY_MS = 180;
const LOCATION_ZOOM_LEVEL = 15;
const LOCATION_EPSILON = 0.00001;
const RISK_REFRESH_INTERVAL_MS = 12000;
const GEOFENCE_CHECK_INTERVAL_MS = 8000;

// Pulsing blue-dot marker for precise current location.
const exactLocationIcon = L.divIcon({
  className: "exact-location-marker",
  html: '<span class="exact-location-dot"></span><span class="exact-location-pulse"></span>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  popupAnchor: [0, -12],
});

// Risk level colors
const riskColors = {
  safe: "#16a34a",
  critical: "#dc2626",
  high: "#ea580c",
  medium: "#f59e0b",
  low: "#fbbf24",
};

const normalizeRiskLevel = (level) => {
  const value = (level || "").toLowerCase();
  if (value === "moderate") return "medium";
  return value;
};

const riskSeverity = {
  safe: 0,
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

const surgeSeverity = {
  none: 0,
  medium: 2,
  high: 3,
  critical: 4,
};

const pickHigherRiskLevel = (first, second) => {
  const firstLevel = normalizeRiskLevel(first);
  const secondLevel = normalizeRiskLevel(second);
  return (riskSeverity[secondLevel] || 0) > (riskSeverity[firstLevel] || 0)
    ? secondLevel
    : firstLevel;
};

const normalizeSurgeLevel = (level) => {
  const value = (level || "none").toLowerCase();
  if (value === "low") return "medium";
  return value;
};

const pickHigherSurgeLevel = (first, second) => {
  const firstLevel = normalizeSurgeLevel(first);
  const secondLevel = normalizeSurgeLevel(second);
  return (surgeSeverity[secondLevel] || 0) > (surgeSeverity[firstLevel] || 0)
    ? secondLevel
    : firstLevel;
};

const surgeToRiskLevel = (surgeLevel) => {
  const normalized = normalizeSurgeLevel(surgeLevel);
  if (normalized === "none") return "safe";
  return normalized;
};

const riskDotIcon = (color) =>
  L.divIcon({
    className: "risk-zone-dot-icon",
    html: `<span class="risk-zone-dot" style="background:${color}"></span>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -8],
  });

const surgePulseIcon = (level) =>
  L.divIcon({
    className: "surge-pulse-icon",
    html: `<span class="surge-pulse-ring surge-${normalizeSurgeLevel(level)}"></span>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });

const toRadians = (value) => (value * Math.PI) / 180;

const getDistanceInMeters = (lat1, lon1, lat2, lon2) => {
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

const formatPercent = (value) => {
  if (!Number.isFinite(value)) return "N/A";
  const percent = value <= 1 ? value * 100 : value;
  return `${percent.toFixed(1)}%`;
};

function MapView() {
  const [userLocation, setUserLocation] = useState(null);
  const [locationAccuracy, setLocationAccuracy] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [allRiskZones, setAllRiskZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchRadius, setSearchRadius] = useState(5000);
  const [sliderRadius, setSliderRadius] = useState(5000);
  const [aiPrediction, setAiPrediction] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [geofenceState, setGeofenceState] = useState({
    isInsideRiskZone: false,
    nearestMatch: null,
    totalMatches: 0,
    matches: [],
  });
  const [riskAlert, setRiskAlert] = useState(null);
  const mapRef = useRef(null);
  const mapCanvasRef = useRef(null);
  const insideRiskRef = useRef(false);
  const lastAlertZoneRef = useRef(null);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setSearchRadius(sliderRadius);
    }, RADIUS_COMMIT_DELAY_MS);

    return () => clearTimeout(timeoutId);
  }, [sliderRadius]);

  useEffect(() => {
    let isActive = true;
    let watchId;

    const updateUserLocation = ({ latitude, longitude, accuracy }) => {
      setUserLocation((previous) => {
        if (
          previous &&
          Math.abs(previous.latitude - latitude) < LOCATION_EPSILON &&
          Math.abs(previous.longitude - longitude) < LOCATION_EPSILON
        ) {
          return previous;
        }

        return { latitude, longitude };
      });

      setLocationAccuracy(Number.isFinite(accuracy) ? Math.round(accuracy) : null);
    };

    const setFallbackLocation = () => {
      if (!isActive) return;
      setError("Unable to access your location. Using default location.");
      setUserLocation(DEFAULT_LOCATION);
      setLocationAccuracy(null);
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (!isActive) return;
          const { latitude, longitude, accuracy } = position.coords;
          updateUserLocation({ latitude, longitude, accuracy });
          setError(null);
        },
        () => {
          setFallbackLocation();
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 30000,
        }
      );

      watchId = navigator.geolocation.watchPosition(
        (position) => {
          if (!isActive) return;
          const { latitude, longitude, accuracy } = position.coords;
          updateUserLocation({ latitude, longitude, accuracy });
        },
        (error) => {
          if (!isActive) return;
          console.error("Location watch error:", error);
          setError(`Location tracking error: ${error.message}`);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 10000,
        }
      );
    } else {
      setFallbackLocation();
    }

    return () => {
      isActive = false;
      if (watchId !== undefined) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []);

  useEffect(() => {
    if (!userLocation) return;

    let isActive = true;
    let intervalId;

    const fetchRiskZones = async () => {
      try {
        setLoading(true);
        const response = await getRiskZones();
        if (!isActive) return;

        setAllRiskZones(Array.isArray(response.data) ? response.data : []);
        setError(null);
      } catch (fetchError) {
        if (!isActive) return;
        console.error("Error fetching risk zones:", fetchError);
        setError("Failed to load risk zones");
        setAllRiskZones([]);
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    fetchRiskZones();
    intervalId = setInterval(fetchRiskZones, RISK_REFRESH_INTERVAL_MS);

    return () => {
      isActive = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [userLocation]);

  useEffect(() => {
    if (!userLocation) return;

    let isActive = true;
    let intervalId;

    const notifyRiskEntry = (match) => {
      if (typeof window === "undefined" || !("Notification" in window)) {
        return;
      }

      const message = `You entered ${match?.name || "a risk zone"} (${(match?.riskLevel || "unknown").toUpperCase()}).`;

      if (window.Notification.permission === "granted") {
        new window.Notification("Risk Zone Alert", {
          body: message,
        });
        return;
      }

      if (window.Notification.permission === "default") {
        window.Notification.requestPermission().then((permission) => {
          if (permission === "granted") {
            new window.Notification("Risk Zone Alert", {
              body: message,
            });
          }
        });
      }
    };

    const checkGeofenceStatus = async () => {
      try {
        const response = await checkGeofenceApi({
          location: {
            lat: userLocation.latitude,
            lon: userLocation.longitude,
          },
        });

        if (!isActive) return;

        const payload = response.data || {};
        const nearest = payload.nearestMatch || null;
        const isInside = Boolean(payload.isInsideRiskZone);

        setGeofenceState({
          isInsideRiskZone: isInside,
          nearestMatch: nearest,
          totalMatches: Number(payload.totalMatches || 0),
          matches: Array.isArray(payload.matches) ? payload.matches : [],
        });

        const zoneKey = nearest?.zoneId || nearest?.name || null;

        if (isInside && (!insideRiskRef.current || lastAlertZoneRef.current !== zoneKey)) {
          setRiskAlert({
            zoneName: nearest?.name || "Risk Zone",
            riskLevel: nearest?.riskLevel || "unknown",
            distanceMeters: nearest?.distanceMeters,
          });
          notifyRiskEntry(nearest);
        }

        insideRiskRef.current = isInside;
        lastAlertZoneRef.current = isInside ? zoneKey : null;
      } catch (geofenceError) {
        if (!isActive) return;
        console.error("Geofence check failed:", geofenceError);
      }
    };

    checkGeofenceStatus();
    intervalId = setInterval(checkGeofenceStatus, GEOFENCE_CHECK_INTERVAL_MS);

    return () => {
      isActive = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [userLocation]);

  useEffect(() => {
    if (!userLocation) return;

    let isActive = true;

    const fetchLocationPrediction = async () => {
      try {
        setAiLoading(true);
        const response = await predictRisk({
          location: {
            lat: userLocation.latitude,
            lon: userLocation.longitude,
          },
        });

        if (!isActive) return;
        setAiPrediction(response.data || null);
        setAiError(null);
      } catch (predictionError) {
        if (!isActive) return;
        console.error("Error fetching AI prediction:", predictionError);
        setAiPrediction(null);
        setAiError("Live AI prediction unavailable");
      } finally {
        if (isActive) {
          setAiLoading(false);
        }
      }
    };

    fetchLocationPrediction();

    return () => {
      isActive = false;
    };
  }, [userLocation]);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;

    const map = mapRef.current;
    const invalidateMapSize = () => {
      map.invalidateSize({ animate: false });
    };

    const animationFrame = requestAnimationFrame(invalidateMapSize);
    const immediate = setTimeout(invalidateMapSize, 0);
    const delayed = setTimeout(invalidateMapSize, 350);
    const delayedSecond = setTimeout(invalidateMapSize, 900);

    let resizeObserver;
    if (mapCanvasRef.current && typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        invalidateMapSize();
      });
      resizeObserver.observe(mapCanvasRef.current);
    }

    window.addEventListener("resize", invalidateMapSize);

    return () => {
      cancelAnimationFrame(animationFrame);
      clearTimeout(immediate);
      clearTimeout(delayed);
      clearTimeout(delayedSecond);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      window.removeEventListener("resize", invalidateMapSize);
    };
  }, [mapReady]);

  const nearbyRiskZones = useMemo(() => {
    if (!userLocation) return [];

    return allRiskZones
      .filter((zone) =>
        zone?.location &&
        Number.isFinite(zone.location.lat) &&
        Number.isFinite(zone.location.lon)
      )
      .map((zone) => ({
        ...zone,
        distance: getDistanceInMeters(
          userLocation.latitude,
          userLocation.longitude,
          zone.location.lat,
          zone.location.lon
        ),
      }))
      .filter((zone) => zone.distance <= searchRadius)
      .sort((a, b) => a.distance - b.distance);
  }, [allRiskZones, searchRadius, userLocation]);

  const renderedRiskZones = useMemo(
    () => nearbyRiskZones.slice(0, MAX_RENDERED_ZONES),
    [nearbyRiskZones]
  );

  const stats = useMemo(
    () =>
      nearbyRiskZones.reduce(
        (acc, zone) => {
          const level = normalizeRiskLevel(zone.riskLevel);
          if (level === "critical") acc.critical += 1;
          if (level === "high") acc.high += 1;
          if (level === "medium") acc.medium += 1;
          if (level === "low") acc.low += 1;
          if (level === "safe") acc.safe += 1;
          return acc;
        },
        { critical: 0, high: 0, medium: 0, low: 0, safe: 0 }
      ),
    [nearbyRiskZones]
  );

  const surgeHotspots = useMemo(
    () => nearbyRiskZones.filter((zone) => normalizeSurgeLevel(zone?.surge?.surgeLevel) !== "none"),
    [nearbyRiskZones]
  );

  const userPosition = useMemo(
    () => [userLocation?.latitude, userLocation?.longitude],
    [userLocation]
  );

  const handleRadiusChange = (newRadius) => {
    setSliderRadius(newRadius);
  };

  const aiRiskLevel = normalizeRiskLevel(aiPrediction?.prediction?.risk_level);
  const predictionSurgeLevel = normalizeSurgeLevel(aiPrediction?.surge?.surgeLevel);
  const predictionSurgeRiskLevel = surgeToRiskLevel(predictionSurgeLevel);

  const geofenceHighestLevel = useMemo(() => {
    if (!Array.isArray(geofenceState.matches) || !geofenceState.matches.length) {
      return null;
    }

    return geofenceState.matches.reduce((highest, zone) => {
      const zoneLevel = normalizeRiskLevel(zone?.riskLevel);
      return pickHigherRiskLevel(highest, zoneLevel);
    }, "safe");
  }, [geofenceState.matches]);

  const geofenceHighestSurgeLevel = useMemo(() => {
    if (!Array.isArray(geofenceState.matches) || !geofenceState.matches.length) {
      return "none";
    }

    return geofenceState.matches.reduce((highest, zone) => {
      const level = normalizeSurgeLevel(zone?.surge?.surgeLevel);
      return pickHigherSurgeLevel(highest, level);
    }, "none");
  }, [geofenceState.matches]);

  const geofenceSurgeRiskLevel = surgeToRiskLevel(geofenceHighestSurgeLevel);

  const overallRiskLevel = geofenceState.isInsideRiskZone
    ? pickHigherRiskLevel(
        pickHigherRiskLevel(aiRiskLevel || "safe", geofenceHighestLevel || "safe"),
        pickHigherRiskLevel(predictionSurgeRiskLevel, geofenceSurgeRiskLevel)
      )
    : pickHigherRiskLevel(aiRiskLevel || "safe", predictionSurgeRiskLevel);

  const overallRiskScore = geofenceState.isInsideRiskZone
    ? Math.max(
        Number(aiPrediction?.prediction?.risk_score || 0),
        Number(aiPrediction?.surge?.surgeScore || 0),
        ...((geofenceState.matches || []).map((zone) => Number(zone?.riskScore || 0)))
      )
    : Math.max(
        Number(aiPrediction?.prediction?.risk_score || 0),
        Number(aiPrediction?.surge?.surgeScore || 0)
      );

  const activeAlertLevel = normalizeRiskLevel(riskAlert?.riskLevel);

  const moveMapToLocation = (latitude, longitude) => {
    if (!mapRef.current) return;

    const nextZoom = Math.max(mapRef.current.getZoom(), LOCATION_ZOOM_LEVEL);
    mapRef.current.flyTo([latitude, longitude], nextZoom, {
      animate: true,
      duration: 0.85,
    });
  };

  const handleRecenter = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported in this browser.");
      if (userLocation) {
        moveMapToLocation(userLocation.latitude, userLocation.longitude);
      }
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setUserLocation({ latitude, longitude });
        setLocationAccuracy(Number.isFinite(accuracy) ? Math.round(accuracy) : null);
        setError(null);
        moveMapToLocation(latitude, longitude);
        setIsLocating(false);
      },
      () => {
        setIsLocating(false);
        setError("Unable to refresh your location right now.");
        if (userLocation) {
          moveMapToLocation(userLocation.latitude, userLocation.longitude);
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      }
    );
  };

  if (!userLocation) {
    return <div className="map-container"><p>Getting your location...</p></div>;
  }

  return (
    <div className="map-wrapper">
      <div className="map-sidebar left-sidebar">
        <div className="sidebar-content">
          <h3>Your Location</h3>
          <div className="location-info">
            <p><strong>Latitude:</strong> {userLocation.latitude.toFixed(4)}</p>
            <p><strong>Longitude:</strong> {userLocation.longitude.toFixed(4)}</p>
            {Number.isFinite(locationAccuracy) && (
              <p><strong>Accuracy:</strong> ~{locationAccuracy} m</p>
            )}
          </div>

          <h3>Search Radius</h3>
          <div className="radius-control">
            <input
              type="range"
              min="1000"
              max="50000"
              step="1000"
              value={sliderRadius}
              onChange={(e) => handleRadiusChange(Number(e.target.value))}
              className="radius-slider"
            />
            <p className="radius-display">{(sliderRadius / 1000).toFixed(1)} km</p>
            {sliderRadius !== searchRadius && (
              <p className="radius-syncing">Updating map...</p>
            )}
          </div>

          <h3>Risk Zones ({nearbyRiskZones.length})</h3>
          {error && <p className="error-message">{error}</p>}
          <h3>AI Live Prediction</h3>
          <div className="ai-prediction-card">
            {aiLoading ? (
              <p>Analyzing your current location...</p>
            ) : aiPrediction ? (
              <>
                <p className="ai-score">{formatPercent(overallRiskScore)}</p>
                <p>
                  Overall:
                  <span className={`badge ai-prediction-badge level-${overallRiskLevel}`}>
                    {(overallRiskLevel || "unknown").toUpperCase()}
                  </span>
                </p>
                <p>
                  AI Model:
                  <span className={`badge ai-prediction-badge level-${aiRiskLevel}`}>
                    {(aiPrediction.prediction?.risk_level || "unknown").toUpperCase()}
                  </span>
                </p>
                <p>
                  Surge:
                  <span className={`badge ai-prediction-badge surge-level-${predictionSurgeLevel}`}>
                    {predictionSurgeLevel.toUpperCase()}
                  </span>
                </p>
                {Number.isFinite(aiPrediction?.surge?.spikeRatio) && (
                  <p>Spike: {aiPrediction.surge.spikeRatio.toFixed(2)}x above normal</p>
                )}
                {geofenceState.isInsideRiskZone && geofenceHighestLevel && (
                  <p>
                    Geofence:
                    <span className={`badge ai-prediction-badge level-${geofenceHighestLevel}`}>
                      {geofenceHighestLevel.toUpperCase()}
                    </span>
                  </p>
                )}
                {geofenceState.isInsideRiskZone && geofenceHighestSurgeLevel !== "none" && (
                  <p>
                    Zone Surge:
                    <span className={`badge ai-prediction-badge surge-level-${geofenceHighestSurgeLevel}`}>
                      {geofenceHighestSurgeLevel.toUpperCase()}
                    </span>
                  </p>
                )}
                <p>State: {aiPrediction.inputsUsed?.state || "unknown"}</p>
                <p>Context: {aiPrediction.inputsUsed?.description || "N/A"}</p>
                <p>Nearby Incidents: {aiPrediction.inputsUsed?.nearbyIncidentCount ?? 0}</p>
              </>
            ) : (
              <p>{aiError || "Prediction not available"}</p>
            )}
          </div>

          <div className="risk-zones-list">
            {loading ? (
              <p>Loading risk zones...</p>
            ) : nearbyRiskZones.length > 0 ? (
              nearbyRiskZones.map((zone) => (
                <div
                  key={zone._id || `${zone.name}-${zone.location.lat}-${zone.location.lon}`}
                  className={`risk-zone-item level-${normalizeRiskLevel(zone.riskLevel)}`}
                >
                  <h4>{zone.name}</h4>
                  <p className="risk-level">
                    Risk: <span className="badge">{zone.riskLevel || "unknown"}</span>
                  </p>
                  {normalizeSurgeLevel(zone?.surge?.surgeLevel) !== "none" && (
                    <p className="risk-level">
                      Surge:
                      <span className={`badge surge-level-${normalizeSurgeLevel(zone?.surge?.surgeLevel)}`}>
                        {normalizeSurgeLevel(zone?.surge?.surgeLevel).toUpperCase()}
                      </span>
                    </p>
                  )}
                  <p className="distance">Distance: {zone.distance ? (zone.distance / 1000).toFixed(2) + " km" : "N/A"}</p>
                  <p className="description">{zone.description}</p>
                </div>
              ))
            ) : (
              <p className="no-zones">No risk zones found in this area</p>
            )}

            {nearbyRiskZones.length > MAX_RENDERED_ZONES && (
              <p className="map-performance-note">
                Showing the nearest {MAX_RENDERED_ZONES} zones on the map for smoother performance.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="map-canvas" ref={mapCanvasRef}>
        {riskAlert && (
          <div className={`risk-entry-alert level-${activeAlertLevel}`} role="alert" aria-live="assertive">
            <div className="risk-entry-alert-content">
              <p className="risk-entry-alert-title">Risk Zone Alert</p>
              <p className="risk-entry-alert-message">
                You entered <strong>{riskAlert.zoneName}</strong> ({(riskAlert.riskLevel || "unknown").toUpperCase()})
                {Number.isFinite(riskAlert.distanceMeters) && ` • ${Math.round(riskAlert.distanceMeters)}m away`}
              </p>
            </div>
            <button
              type="button"
              className="risk-entry-alert-dismiss"
              onClick={() => setRiskAlert(null)}
              aria-label="Dismiss risk alert"
            >
              Dismiss
            </button>
          </div>
        )}

        <MapContainer
          center={userPosition}
          zoom={11}
          className="map-container"
          preferCanvas={true}
          zoomAnimation={false}
          fadeAnimation={false}
          markerZoomAnimation={false}
          wheelDebounceTime={80}
          whenReady={(event) => {
            mapRef.current = event.target;
            setMapReady(true);
          }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            updateWhenIdle={true}
            keepBuffer={2}
            maxZoom={19}
            subdomains={["a", "b", "c"]}
          />

          {Number.isFinite(locationAccuracy) && (
            <Circle
              center={userPosition}
              radius={Math.max(locationAccuracy, 12)}
              fillColor="rgba(37, 99, 235, 0.2)"
              color="rgba(37, 99, 235, 0.42)"
              weight={1}
              opacity={0.8}
              fillOpacity={0.24}
            />
          )}

          {/* User location marker */}
          <Marker position={userPosition} icon={exactLocationIcon}>
            <Popup>
              <div className="popup-content">
                <h4>Your Location</h4>
                <p>Lat: {userLocation.latitude.toFixed(4)}</p>
                <p>Lon: {userLocation.longitude.toFixed(4)}</p>
                {Number.isFinite(locationAccuracy) && (
                  <p>Accuracy: ~{locationAccuracy} m</p>
                )}
              </div>
            </Popup>
          </Marker>

          {/* Search radius circle */}
          <Circle
            center={userPosition}
            radius={searchRadius}
            fillColor="rgba(37, 99, 235, 0.12)"
            color="rgba(37, 99, 235, 0.55)"
            weight={2}
            dashArray="5, 5"
          />

          {/* Risk zone markers and circles */}
          {renderedRiskZones.map((zone) => {
            const level = normalizeRiskLevel(zone.riskLevel);
            const color = riskColors[level] || riskColors.low;
            const surgeLevel = normalizeSurgeLevel(zone?.surge?.surgeLevel);

            return (
              <FeatureGroup key={zone._id || `${zone.name}-${zone.location.lat}-${zone.location.lon}`}>
                <Circle
                  center={[zone.location.lat, zone.location.lon]}
                  radius={zone.geofenceRadius || 500}
                  fillColor={color}
                  color={color}
                  weight={2}
                  opacity={0.8}
                  fillOpacity={0.22}
                />
                <Marker
                  position={[zone.location.lat, zone.location.lon]}
                  icon={riskDotIcon(color)}
                >
                  <Popup>
                    <div className="popup-content">
                      <h4>{zone.name}</h4>
                      <p><strong>Risk Level:</strong> <span className={`risk-badge level-${level}`}>{zone.riskLevel}</span></p>
                      <p><strong>Surge:</strong> <span className={`risk-badge surge-level-${surgeLevel}`}>{surgeLevel.toUpperCase()}</span></p>
                      <p><strong>Risk Score:</strong> {formatPercent(zone.riskScore)}</p>
                      <p><strong>Surge Score:</strong> {formatPercent(zone?.surge?.surgeScore)}</p>
                      <p><strong>Spike Ratio:</strong> {Number.isFinite(zone?.surge?.spikeRatio) ? `${zone.surge.spikeRatio.toFixed(2)}x` : "N/A"}</p>
                      <p><strong>Crime Rate:</strong> {formatPercent(zone.crimeRate)}</p>
                      <p><strong>Weather Score:</strong> {formatPercent(zone.weatherScore)}</p>
                      <p><strong>Terrain Score:</strong> {formatPercent(zone.terrainScore)}</p>
                      <p><strong>Tourist Density:</strong> {formatPercent(zone.tourist_density)}</p>
                      <p><strong>Location:</strong> {zone.location.lat.toFixed(4)}, {zone.location.lon.toFixed(4)}</p>
                      {zone.distance && <p><strong>Distance:</strong> {(zone.distance / 1000).toFixed(2)} km</p>}
                    </div>
                  </Popup>
                </Marker>
                {surgeLevel !== "none" && (
                  <Marker
                    position={[zone.location.lat, zone.location.lon]}
                    icon={surgePulseIcon(surgeLevel)}
                    interactive={false}
                    keyboard={false}
                  />
                )}
              </FeatureGroup>
            );
          })}
        </MapContainer>

        <button
          type="button"
          className="recenter-button"
          onClick={handleRecenter}
          disabled={isLocating}
        >
          {isLocating ? "Locating..." : "My Location"}
        </button>
      </div>

      <div className="map-sidebar right-sidebar">
        <div className="sidebar-content">
          <h3>Risk Alert Status</h3>
          <div className={`geofence-status-card ${geofenceState.isInsideRiskZone ? "inside" : "outside"}`}>
            {geofenceState.isInsideRiskZone ? (
              <>
                <p className="geofence-status-label">Inside Risk Zone</p>
                <p className="geofence-status-main">
                  {(geofenceState.nearestMatch?.riskLevel || "unknown").toUpperCase()} • {geofenceState.nearestMatch?.name || "Unknown zone"}
                </p>
                <p className="geofence-status-sub">Matched zones: {geofenceState.totalMatches}</p>
              </>
            ) : (
              <>
                <p className="geofence-status-label">Currently Safe</p>
                <p className="geofence-status-main">You are outside all configured risk geofences.</p>
              </>
            )}
          </div>

          <h3>Map Legend</h3>
          <div className="legend">
            <div className="legend-item">
              <div className="legend-color critical"></div>
              <span>Critical Risk</span>
            </div>
            <div className="legend-item">
              <div className="legend-color high"></div>
              <span>High Risk</span>
            </div>
            <div className="legend-item">
              <div className="legend-color medium"></div>
              <span>Medium Risk</span>
            </div>
            <div className="legend-item">
              <div className="legend-color low"></div>
              <span>Low Risk</span>
            </div>
            <div className="legend-item">
              <div className="legend-color safe"></div>
              <span>Safe</span>
            </div>
          </div>

          <h3>Statistics</h3>
          <div className="stats">
            <div className="stat-card stat-total">
              <p className="stat-label">Total Zones</p>
              <p className="stat-value">{nearbyRiskZones.length}</p>
            </div>
            <div className="stat-card stat-critical">
              <p className="stat-label">Critical</p>
              <p className="stat-value critical-count">{stats.critical}</p>
            </div>
            <div className="stat-card stat-high">
              <p className="stat-label">High</p>
              <p className="stat-value high-count">{stats.high}</p>
            </div>
            <div className="stat-card stat-medium">
              <p className="stat-label">Medium</p>
              <p className="stat-value medium-count">{stats.medium}</p>
            </div>
            <div className="stat-card stat-low">
              <p className="stat-label">Low</p>
              <p className="stat-value low-count">{stats.low}</p>
            </div>
            <div className="stat-card stat-safe">
              <p className="stat-label">Safe</p>
              <p className="stat-value safe-count">{stats.safe}</p>
            </div>
            <div className="stat-card stat-surge">
              <p className="stat-label">Surge Hotspots</p>
              <p className="stat-value surge-count">{surgeHotspots.length}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MapView;
