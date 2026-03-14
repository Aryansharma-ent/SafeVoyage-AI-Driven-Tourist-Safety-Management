import MapView from "../components/MapView";
import Navbar from "../components/Navbar";
import "./MapPage.css";

function MapPage() {
  return (
    <div className="map-page">
      <Navbar />
      <div className="map-page-content">
        <MapView />
      </div>
    </div>
  );
}

export default MapPage;
