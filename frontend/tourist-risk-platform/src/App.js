import { Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import AOS from "aos";
import "aos/dist/aos.css";

import Home from "./pages/Home";
import MapPage from "./pages/MapPage";
import EmergencyPage from "./pages/EmergencyPage";
import IncidentPage from "./pages/IncidentPage";
import Dashboard from "./pages/Dashboard";
import AdminLogin from "./pages/AdminLogin";
import ErrorBoundary from "./components/ErrorBoundary";

function App() {
  useEffect(() => {
    AOS.init({
      duration: 800,
      offset: 100,
      once: false,
      mirror: true,
      easing: "ease-in-out",
    });
  }, []);

  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/emergency" element={<EmergencyPage />} />
        <Route path="/incident" element={<IncidentPage />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<Dashboard />} />
      </Routes>
    </ErrorBoundary>
  );
}

export default App;

