import "./RiskLegend.css";

function RiskLegend() {
  return (
    <div className="risk-legend">
      <h3>Risk Level Legend</h3>
      <div className="legend-items">
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
      </div>
    </div>
  );
}

export default RiskLegend;
