import { useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import PanicButton from "../components/PanicButton";
import { FaArrowLeft } from "react-icons/fa6";
import { FaInfo } from "react-icons/fa";
import "./EmergencyPage.css";

function EmergencyPage() {
  const [selectedType, setSelectedType] = useState("danger");

  const emergencyTypes = [
    {
      type: "danger",
      icon: "⚠️",
      label: "In Danger",
      message: "I am in immediate danger - Police assistance needed",
      color: "#dc2626"
    },
    {
      type: "medical",
      icon: "🏥",
      label: "Medical Help",
      message: "I need immediate medical assistance",
      color: "#f59e0b"
    },
    {
      type: "lost",
      icon: "📍",
      label: "I'm Lost",
      message: "I am lost and need navigation assistance",
      color: "#3b82f6"
    },
    {
      type: "other",
      icon: "🆘",
      label: "Other Emergency",
      message: "I need help with another emergency",
      color: "#8b5cf6"
    }
  ];

  const currentType = emergencyTypes.find(t => t.type === selectedType);

  return (
    <div className="emergency-page">
      <Navbar />
      <div className="emergency-container">
        <div className="emergency-header">
          <h1>Emergency SOS</h1>
          <p>Select the type of emergency and activate help</p>
        </div>
        
        <div className="emergency-content">
          {/* Emergency Type Selection */}
          <div className="emergency-types">
            {emergencyTypes.map((type) => (
              <button
                key={type.type}
                className={`emergency-type-btn ${selectedType === type.type ? "active" : ""}`}
                onClick={() => setSelectedType(type.type)}
                style={selectedType === type.type ? { borderColor: type.color, backgroundColor: type.color + "15" } : {}}
              >
                <div style={{ fontSize: "24px" }}>{type.icon}</div>
                <div>{type.label}</div>
              </button>
            ))}
          </div>

          {/* Selected Emergency Type Info */}
          {currentType && (
            <div className="emergency-info-card" style={{ borderLeftColor: currentType.color }}>
              <h3>Help being sent for:</h3>
              <p className="emergency-message">{currentType.message}</p>
              <PanicButton 
                emergencyType={currentType.type}
                message={currentType.message}
                buttonText={`🆘 SEND ${currentType.label.toUpperCase()}`}
              />
            </div>
          )}

          {/* Instructions */}
          <div className="emergency-instructions">
            <div className="instruction-card">
              <FaInfo /> <strong>How it works:</strong>
              <ol>
                <li>Select the emergency type</li>
                <li>Your location will be shared automatically</li>
                <li>Press and hold the button for 3 seconds</li>
                <li>Authorities will be notified immediately</li>
              </ol>
            </div>
          </div>
        </div>

        <Link to="/" className="back-link">
          <FaArrowLeft /> Back to Home
        </Link>
      </div>
    </div>
  );
}

export default EmergencyPage;
