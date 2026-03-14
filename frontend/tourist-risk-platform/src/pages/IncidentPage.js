import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import IncidentForm from "../components/IncidentForm";
import { FaArrowLeft } from "react-icons/fa6";
import "./IncidentPage.css";

function IncidentPage() {
  return (
    <div className="incident-page">
      <Navbar />
      <div className="incident-container">
        <div className="incident-header">
          <h1>Report Incident</h1>
          <p>Help us keep the community safe by reporting incidents with blockchain-backed evidence</p>
        </div>
        
        <div className="incident-form-wrapper">
          <IncidentForm />
        </div>

        <Link to="/" className="back-link">
          <FaArrowLeft /> Back to Home
        </Link>
      </div>
    </div>
  );
}

export default IncidentPage;
