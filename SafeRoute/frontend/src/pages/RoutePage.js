import React from "react";
import { useNavigate } from "react-router-dom";
import MapSection from "../components/MapSection";
import "../styles/dashboard.css";

function RoutePage() {
  const navigate = useNavigate();

  return (
    <div className="dashboard-wrapper">
      <div className="app-shell">
        <div className="page-header-row">
          <div className="page-header-card">
            <h1>Route Finder</h1>
            <p>
              Compare safer route options, review safety score, use Gemini
              guidance, and start live navigation.
            </p>
          </div>

          <button className="secondary-btn" onClick={() => navigate("/dashboard")}>
            ← Back to Dashboard
          </button>
        </div>

        <div className="map-section">
          <MapSection />
        </div>
      </div>
    </div>
  );
}

export default RoutePage;