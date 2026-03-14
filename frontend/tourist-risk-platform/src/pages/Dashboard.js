import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { getIncidents, getEmergencies, getRiskZones } from "../services/api";
import {
  FaTriangleExclamation,
  FaMapLocationDot,
  FaBell,
  FaArrowRotateRight,
  FaArrowLeft,
  FaShield,
} from "react-icons/fa6";
import "./Dashboard.css";

function Dashboard() {
  const navigate = useNavigate();
  const [adminName, setAdminName] = useState("");
  const [incidents, setIncidents] = useState([]);
  const [emergencies, setEmergencies] = useState([]);
  const [riskZones, setRiskZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  const activeEmergencies = emergencies.filter((item) => item.status === "active").length;
  const resolvedEmergencies = emergencies.filter((item) => item.status === "resolved").length;
  const highRiskZones = riskZones.filter((zone) => ["high", "critical"].includes(zone.riskLevel)).length;
  const averageRiskAssessment = riskZones.length
    ? riskZones.reduce((sum, zone) => {
        const rawScore = Number(zone.riskScore);
        if (!Number.isFinite(rawScore)) return sum;
        const normalized = rawScore <= 1 ? rawScore * 100 : rawScore;
        return sum + normalized;
      }, 0) / riskZones.length
    : 0;

  const formatRiskPercent = (value) => {
    if (!Number.isFinite(value)) return "N/A";
    const percent = value <= 1 ? value * 100 : value;
    return `${percent.toFixed(1)}%`;
  };

  const getRiskLevelClass = (level) => {
    const value = String(level || "").toLowerCase();
    if (value === "high" || value === "critical") return "danger";
    if (value === "moderate" || value === "low") return "warning";
    return "safe";
  };

  useEffect(() => {
    // Check if admin is logged in
    const token = localStorage.getItem("adminToken");
    const name = localStorage.getItem("adminName");

    if (!token) {
      navigate("/admin/login");
      return;
    }

    setAdminName(name || "Admin");
    fetchDashboardData();
  }, [navigate]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch incidents
      const incidentRes = await getIncidents();
      setIncidents(incidentRes.data);

      // Fetch emergencies
      const emergencyRes = await getEmergencies();
      setEmergencies(emergencyRes.data);

      // Fetch risk zones
      const riskRes = await getRiskZones();
      setRiskZones(riskRes.data);

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setError("Failed to load dashboard data. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminId");
    localStorage.removeItem("adminName");
    navigate("/");
  };

  return (
    <div>
      <Navbar />
      <div className="page-container dashboard-page">
        {error && <div className="dashboard-alert">{error}</div>}

        <div className="dashboard-header">
          <div className="header-copy">
            <h1><FaShield className="title-icon" /> Admin Dashboard</h1>
            <p>Welcome back, <strong>{adminName}</strong> | System Status: <span className="status-online">OPERATIONAL</span></p>
          </div>
          <div className="header-actions">
            <button onClick={fetchDashboardData} className="refresh-btn" type="button">
              <FaArrowRotateRight /> Refresh
            </button>
            <button onClick={handleLogout} className="logout-btn" type="button">
              Logout
            </button>
          </div>
        </div>

        <div className="kpi-grid">
          <article className="kpi-card incidents">
            <div className="kpi-icon"><FaTriangleExclamation /></div>
            <p className="kpi-label">Total Incidents</p>
            <p className="kpi-value">{incidents.length}</p>
          </article>

          <article className="kpi-card emergencies">
            <div className="kpi-icon"><FaBell /></div>
            <p className="kpi-label">Active Emergencies</p>
            <p className="kpi-value">{activeEmergencies}</p>
            <p className="kpi-subline">{resolvedEmergencies} resolved</p>
          </article>

          <article className="kpi-card riskzones">
            <div className="kpi-icon"><FaMapLocationDot /></div>
            <p className="kpi-label">Risk Assessment</p>
            <p className="kpi-value">{formatRiskPercent(averageRiskAssessment)}</p>
            <p className="kpi-subline">{highRiskZones} high-risk zones</p>
          </article>

          <article className="kpi-card incidents">
            <div className="kpi-icon"><FaShield /></div>
            <p className="kpi-label">System Health</p>
            <p className="kpi-value">100%</p>
            <p className="kpi-subline">All systems operational</p>
          </article>
        </div>

        {loading ? (
          <div className="dashboard-loading">Loading dashboard data...</div>
        ) : (
          <>
            <div className="dashboard-tabs">
              <button type="button" className={`tab-btn ${activeTab === "overview" ? "active" : ""}`} onClick={() => setActiveTab("overview")}>Overview</button>
              <button type="button" className={`tab-btn ${activeTab === "incidents" ? "active" : ""}`} onClick={() => setActiveTab("incidents")}>Incidents ({incidents.length})</button>
              <button type="button" className={`tab-btn ${activeTab === "emergencies" ? "active" : ""}`} onClick={() => setActiveTab("emergencies")}>Emergencies ({activeEmergencies})</button>
              <button type="button" className={`tab-btn ${activeTab === "risk" ? "active" : ""}`} onClick={() => setActiveTab("risk")}>Risk Zones ({riskZones.length})</button>
            </div>

            {activeTab === "overview" && (
              <div className="dashboard-grid">
                <section className="stats-card incidents-card">
                  <div className="card-head">
                    <h3>Recent Incidents</h3>
                    <span className="card-count">{incidents.length}</span>
                  </div>
                  <div className="incidents-list">
                    {incidents.length ? incidents.slice(0, 6).map((incident, index) => (
                      <div key={index} className="incident-item">
                        <p className="item-title">{incident.incidentType || incident.category}</p>
                        <p>Location: {incident.location?.lat?.toFixed(4)}, {incident.location?.lon?.toFixed(4)}</p>
                        <p>{incident.description}</p>
                        <small>{new Date(incident.createdAt).toLocaleString()}</small>
                      </div>
                    )) : <p className="empty-state">No incidents reported yet.</p>}
                  </div>
                </section>

                <section className="stats-card emergency">
                  <div className="card-head">
                    <h3>Emergency Alerts</h3>
                    <span className="card-count">{emergencies.length}</span>
                  </div>
                  <div className="emergencies-list">
                    {emergencies.length ? emergencies.slice(0, 6).map((emergency, index) => (
                      <div key={index} className="emergency-item">
                        <p className="item-title">{emergency.emergencyType}</p>
                        <p>Location: {emergency.location?.lat?.toFixed(4)}, {emergency.location?.lon?.toFixed(4)}</p>
                        <p>{emergency.message || "Emergency alert"}</p>
                        <p className={`status-badge status-${emergency.status}`}>Status: {emergency.status}</p>
                        <small>{new Date(emergency.createdAt).toLocaleString()}</small>
                      </div>
                    )) : <p className="empty-state">No emergency alerts.</p>}
                  </div>
                </section>

                <section className="stats-card risk">
                  <div className="card-head">
                    <h3>Risk Zones</h3>
                    <span className="card-count">{riskZones.length}</span>
                  </div>
                  <div className="risk-zones-list">
                    {riskZones.length ? riskZones.slice(0, 6).map((zone, index) => (
                      <div key={index} className="risk-zone-item">
                        <p className="item-title">{zone.name}</p>
                        <p>Risk Level: <span className={`risk-level-${zone.riskLevel}`}>{zone.riskLevel}</span></p>
                        <p>Risk Score: {formatRiskPercent(zone.riskScore)}</p>
                        <p>Crime Rate: {formatRiskPercent(zone.crimeRate)}</p>
                        <p>Tourist Density: {formatRiskPercent(zone.tourist_density)}</p>
                        <small>{new Date(zone.createdAt).toLocaleString()}</small>
                      </div>
                    )) : <p className="empty-state">No risk zones available.</p>}
                  </div>
                </section>
              </div>
            )}

            {activeTab === "incidents" && (
              <section className="data-table-card">
                <div className="table-header">
                  <h3>Incident Reports</h3>
                </div>
                <div className="table-scroll">
                  <table className="dashboard-table">
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Location</th>
                        <th>Description</th>
                        <th>Timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {incidents.map((incident, index) => (
                        <tr key={index}>
                          <td><span className="type-pill">{incident.incidentType}</span></td>
                          <td>{incident.location?.lat?.toFixed(4)}, {incident.location?.lon?.toFixed(4)}</td>
                          <td className="truncate-cell">{incident.description}</td>
                          <td>{new Date(incident.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {activeTab === "emergencies" && (
              <section className="data-table-card">
                <div className="table-header">
                  <h3>Emergency Alerts</h3>
                  <p>Active: {activeEmergencies} | Resolved: {resolvedEmergencies}</p>
                </div>
                <div className="table-scroll">
                  <table className="dashboard-table">
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Location</th>
                        <th>Status</th>
                        <th>Message</th>
                        <th>Timestamp</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {emergencies.map((emergency, index) => (
                        <tr key={index} className={emergency.status === "active" ? "row-active" : "row-resolved"}>
                          <td><span className="type-pill">{emergency.emergencyType}</span></td>
                          <td>{emergency.location?.lat?.toFixed(4)}, {emergency.location?.lon?.toFixed(4)}</td>
                          <td><span className={`status-badge status-${emergency.status}`}>{String(emergency.status).toUpperCase()}</span></td>
                          <td className="truncate-cell">{emergency.message || "Emergency alert"}</td>
                          <td>{new Date(emergency.createdAt).toLocaleDateString()}</td>
                          <td>
                            <button type="button" className={`action-btn ${emergency.status === "active" ? "resolve" : "resolved"}`} disabled={emergency.status !== "active"}>
                              {emergency.status === "active" ? "Resolve" : "Resolved"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {activeTab === "risk" && (
              <section className="data-table-card">
                <div className="table-header">
                  <h3>Risk Zones</h3>
                </div>
                <div className="table-scroll">
                  <table className="dashboard-table">
                    <thead>
                      <tr>
                        <th>Zone</th>
                        <th>Risk Level</th>
                        <th>Risk Score</th>
                        <th>Crime Rate</th>
                        <th>Tourist Density</th>
                        <th>Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {riskZones.map((zone, index) => (
                        <tr key={index}>
                          <td>{zone.name}</td>
                          <td><span className={`risk-level-pill ${getRiskLevelClass(zone.riskLevel)}`}>{zone.riskLevel}</span></td>
                          <td>{formatRiskPercent(zone.riskScore)}</td>
                          <td>{formatRiskPercent(zone.crimeRate)}</td>
                          <td>{formatRiskPercent(zone.tourist_density)}</td>
                          <td>{new Date(zone.updatedAt || zone.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
        )}

        <div className="dashboard-footer">
          <Link to="/" className="back-home-btn">
            <FaArrowLeft /> Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;