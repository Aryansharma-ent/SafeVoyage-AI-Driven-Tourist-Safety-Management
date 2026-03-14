import { Link } from "react-router-dom";
import { FaHome, FaMap, FaExclamationTriangle, FaPhone, FaBell } from "react-icons/fa";
import "./Navbar.css";

function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          <div className="logo-icon" aria-hidden="true">
            <svg viewBox="0 0 48 48" className="logo-icon-svg">
              <defs>
                <linearGradient id="voyageGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="100%" stopColor="#0ea5e9" />
                </linearGradient>
              </defs>
              <circle cx="24" cy="24" r="20" fill="rgba(15, 23, 42, 0.78)" stroke="url(#voyageGradient)" strokeWidth="2" />
              <path d="M24 10L31 14V22C31 28 27.2 33.2 24 35.2C20.8 33.2 17 28 17 22V14L24 10Z" fill="url(#voyageGradient)" />
              <circle cx="24" cy="21" r="3.2" fill="#ffffff" />
              <path d="M24 24.5L27.7 28.2" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </div>
          <div className="logo-text">
            <div className="logo-brand">SafeVoyage</div>
            <div className="logo-subtitle">AI TOURIST SAFETY PLATFORM</div>
          </div>
        </Link>
        <ul className="nav-menu">
          <li className="nav-item">
            <Link to="/" className="nav-link">
              <FaHome /> Home
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/map" className="nav-link">
              <FaMap /> Risk Map
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/incident" className="nav-link">
              <FaExclamationTriangle /> Report Incident
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/emergency" className="nav-link">
              <FaPhone /> Emergency SOS
            </Link>
          </li>
        </ul>
        <div className="nav-actions">
          <button className="nav-bell">
            <FaBell />
            <span className="notification-badge">3</span>
          </button>
          <div className="nav-status"> <span className="status-dot"></span> Live
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
