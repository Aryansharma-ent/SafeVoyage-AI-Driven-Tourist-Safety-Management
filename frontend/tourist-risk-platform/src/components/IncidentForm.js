import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { getCurrentLocation, getDeviceId } from "../services/geolocation";
import { reportIncident } from "../services/api";
import "./IncidentForm.css";

const DEFAULT_PICKER_CENTER = { lat: 26.8372, lon: 75.6490 };

const incidentLocationIcon = L.divIcon({
  className: "incident-location-marker",
  html: '<span class="incident-location-pin"></span>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

function LocationPicker({ selectedLocation, onSelect }) {
  useMapEvents({
    click(event) {
      onSelect({ lat: event.latlng.lat, lon: event.latlng.lng });
    },
  });

  if (!selectedLocation?.lat || !selectedLocation?.lon) {
    return null;
  }

  return (
    <Marker
      position={[selectedLocation.lat, selectedLocation.lon]}
      icon={incidentLocationIcon}
    />
  );
}

function IncidentForm() {
  const [formData, setFormData] = useState({
    deviceId: "",
    location: { lat: null, lon: null },
    description: "",
    incidentType: "other"
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [locationStatus, setLocationStatus] = useState("Click 'Get Location' to enable tracking");
  const [pickerCenter, setPickerCenter] = useState(DEFAULT_PICKER_CENTER);

  useEffect(() => {
    // Set device ID on component mount
    const deviceId = getDeviceId();
    setFormData(prev => ({
      ...prev,
      deviceId
    }));
  }, []);

  const handleGetLocation = async () => {
    setLocationStatus("Getting location...");
    try {
      const location = await getCurrentLocation();
      setFormData(prev => ({
        ...prev,
        location
      }));
      setPickerCenter(location);
      setLocationStatus(`Location acquired: ${location.lat.toFixed(4)}, ${location.lon.toFixed(4)}`);
      setError("");
    } catch (err) {
      setLocationStatus("Location access denied");
      setError(err.message);
    }
  };

  const handleMapPick = (location) => {
    setFormData((prev) => ({
      ...prev,
      location,
    }));
    setLocationStatus(`Location selected on map: ${location.lat.toFixed(4)}, ${location.lon.toFixed(4)}`);
    setError("");
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleCoordinateChange = (field, value) => {
    const numericValue = Number(value);
    const nextValue = Number.isFinite(numericValue) ? numericValue : null;

    setFormData((prev) => ({
      ...prev,
      location: {
        ...prev.location,
        [field]: nextValue,
      },
    }));
  };

  const hasValidLocation = useMemo(
    () => Number.isFinite(formData.location.lat) && Number.isFinite(formData.location.lon),
    [formData.location]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    // Validate location
    if (!hasValidLocation) {
      setError("Please click 'Get Location' to enable location tracking");
      setLoading(false);
      return;
    }

    try {
      await reportIncident(formData);

      setSuccess(true);
      setFormData({
        deviceId: getDeviceId(),
        location: { lat: null, lon: null },
        description: "",
        incidentType: "other"
      });
      setLocationStatus("Click 'Get Location' to enable tracking");
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError("Error reporting incident: " + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="incident-form">
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">Incident reported successfully.</div>}

      <div className="form-panel panel-device">
        <h3 className="panel-title">Reporter</h3>
        <p className="panel-subtitle">This anonymous device ID helps group related incident reports.</p>

        <div className="form-group">
          <label>Device ID</label>
          <input
            type="text"
            value={formData.deviceId}
            readOnly
            className="readonly-input"
          />
        </div>
      </div>

      <div className="form-panel panel-location">
        <h3 className="panel-title">Incident Location</h3>
        <p className="panel-subtitle">Use your GPS, enter coordinates, or click directly on the map.</p>

        <div className="form-group">
          <label>Location</label>
          <div className="location-input-group">
            <button
              type="button"
              onClick={handleGetLocation}
              className="location-btn"
              disabled={loading}
            >
              Use My Location
            </button>
            <input
              type="text"
              value={
                hasValidLocation
                  ? `${formData.location.lat.toFixed(5)}, ${formData.location.lon.toFixed(5)}`
                  : "Location not acquired"
              }
              readOnly
              className="readonly-input"
            />
          </div>
          <small className={`location-status ${hasValidLocation ? "is-valid" : ""}`}>{locationStatus}</small>

          <div className="location-manual-grid">
            <div>
              <label htmlFor="incident-lat">Latitude</label>
              <input
                id="incident-lat"
                type="number"
                step="0.000001"
                value={formData.location.lat ?? ""}
                onChange={(e) => handleCoordinateChange("lat", e.target.value)}
                placeholder="Enter latitude"
              />
            </div>
            <div>
              <label htmlFor="incident-lon">Longitude</label>
              <input
                id="incident-lon"
                type="number"
                step="0.000001"
                value={formData.location.lon ?? ""}
                onChange={(e) => handleCoordinateChange("lon", e.target.value)}
                placeholder="Enter longitude"
              />
            </div>
          </div>

          <div className="location-chip-row">
            <span className="location-chip-label">Selected:</span>
            <span className="location-chip-value">
              {hasValidLocation
                ? `${formData.location.lat.toFixed(5)}, ${formData.location.lon.toFixed(5)}`
                : "Pick a location to continue"}
            </span>
          </div>

          <div className="incident-picker-map-wrap">
            <p className="picker-help">Tip: Click any point on the map to pin the exact incident spot.</p>
            <MapContainer
              center={[pickerCenter.lat, pickerCenter.lon]}
              zoom={14}
              className="incident-picker-map"
              scrollWheelZoom={true}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              />
              <LocationPicker selectedLocation={formData.location} onSelect={handleMapPick} />
            </MapContainer>
          </div>
        </div>
      </div>

      <div className="form-panel panel-details">
        <h3 className="panel-title">Incident Details</h3>
        <p className="panel-subtitle">Select incident type and provide a concise but useful description.</p>

        <div className="form-group">
          <label>Incident Type</label>
          <select name="incidentType" value={formData.incidentType} onChange={handleChange}>
            <option value="theft">Theft</option>
            <option value="accident">Accident</option>
            <option value="lost">Lost</option>
            <option value="suspicious">Suspicious Activity</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="form-group">
          <label>Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            required
            placeholder="What happened, when did it happen, and who is affected?"
          />
        </div>
      </div>

      <button type="submit" disabled={loading} className="submit-btn">
        {loading ? "Submitting..." : "Report Incident"}
      </button>
    </form>
  );
}

export default IncidentForm;
