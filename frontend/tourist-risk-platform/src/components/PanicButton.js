import { useState, useEffect } from "react";
import { getCurrentLocation, getDeviceId } from "../services/geolocation";
import { triggerEmergency } from "../services/api";
import "./PanicButton.css";

function PanicButton({ emergencyType = "danger", message = "Emergency SOS Alert Triggered - Tourist in distress", buttonText = "🆘 EMERGENCY SOS" }) {
  const [isTriggered, setIsTriggered] = useState(false);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [isPressing, setIsPressing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isPressing && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (isPressing && countdown === 0) {
      handleEmergency();
      setIsPressing(false);
      setCountdown(3);
    }
  }, [isPressing, countdown]);

  const handleMouseDown = () => {
    setIsPressing(true);
    setCountdown(3);
    setError("");
  };

  const handleMouseUp = () => {
    setIsPressing(false);
    setCountdown(3);
  };

  const handleEmergency = async () => {
    setLoading(true);
    setError("");

    try {
      // Get current location
      const location = await getCurrentLocation();
      const deviceId = getDeviceId();

      const emergencyData = {
        deviceId,
        location,
        emergencyType,
        message
      };

      await triggerEmergency(emergencyData);

      setIsTriggered(true);
      setTimeout(() => setIsTriggered(false), 3000);
    } catch (err) {
      setError("Error: " + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panic-button-container">
      {error && <div className="error-message">{error}</div>}
      
      <button
        className={`panic-button ${isTriggered ? "triggered" : ""} ${isPressing ? "pressing" : ""}`}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchEnd={handleMouseUp}
        onTouchCancel={handleMouseUp}
        disabled={loading || isTriggered}
      >
        {loading ? (
          <span>Sending...</span>
        ) : isTriggered ? (
          <span>✓ Alert Sent!</span>
        ) : isPressing ? (
          <span>Hold for {countdown}s</span>
        ) : (
          <span>🆘 EMERGENCY SOS</span>
        )}
      </button>
      
      <p className="panic-info">
        {isPressing
          ? "Keep holding to activate emergency alert..."
          : "Press and hold the button above in case of emergency. Your location will be shared immediately."}
      </p>
      
      <div className="emergency-info-box">
        <h3>What happens when you press SOS:</h3>
        <ul>
          <li>✓ Your GPS location is immediately captured</li>
          <li>✓ Emergency alert is sent to authorities</li>
          <li>✓ Nearby tourists in risk zones are notified</li>
          <li>✓ Real-time location sharing is activated</li>
        </ul>
      </div>
    </div>
  );
}

export default PanicButton;
