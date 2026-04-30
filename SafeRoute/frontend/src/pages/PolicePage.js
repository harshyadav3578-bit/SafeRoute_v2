import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE_URL from "../config/api";
import "../styles/dashboard.css";

function PolicePage() {
  const navigate = useNavigate();

  const [area, setArea] = useState("");
  const [stations, setStations] = useState([]);

  const searchPolice = async () => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/police/search?area=${area}`
      );
      const data = await res.json();
      setStations(data);
    } catch {
      alert("Error fetching police");
    }
  };

  return (
    <div className="dashboard-wrapper">
      <div className="app-shell">
        <div className="page-header-row">
          <div className="page-header-card">
            <h1>Police Stations</h1>
          </div>

          <button className="secondary-btn" onClick={() => navigate("/dashboard")}>
            ← Back
          </button>
        </div>

        <div className="form-card">
          <div className="form-grid">
            <input
              placeholder="Enter area"
              onChange={(e) => setArea(e.target.value)}
            />

            <button className="primary-btn" onClick={searchPolice}>
              Search
            </button>
          </div>
        </div>

        <div className="result-card">
          <h3>Stations</h3>

          {stations.map((s, i) => (
            <div key={i} className="data-card">
              <strong>{s.name}</strong>
              <p>{s.address}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default PolicePage;