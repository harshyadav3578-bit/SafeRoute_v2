import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE_URL from "../config/api";
import "../styles/dashboard.css";

function SafetyPage() {
  const navigate = useNavigate();

  const [area, setArea] = useState("");
  const [result, setResult] = useState(null);

  const checkSafety = async () => {
    if (!area.trim()) return alert("Enter area name");

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/safety/area?area=${area}`
      );
      const data = await res.json();
      setResult(data);
    } catch {
      alert("Error fetching safety");
    }
  };

  const getBadge = (score) => {
    if (score >= 75) return "badge badge-safe";
    if (score >= 50) return "badge badge-medium";
    return "badge badge-risk";
  };

  return (
    <div className="dashboard-wrapper">
      <div className="app-shell">
        <div className="page-header-row">
          <div className="page-header-card">
            <h1>Area Safety Check</h1>
            <p>Check safety score and incidents</p>
          </div>

          <button className="secondary-btn" onClick={() => navigate("/dashboard")}>
            ← Back
          </button>
        </div>

        <div className="form-card">
          <div className="form-grid">
            <input
              placeholder="Enter area"
              value={area}
              onChange={(e) => setArea(e.target.value)}
            />

            <button className="primary-btn" onClick={checkSafety}>
              Check Safety
            </button>
          </div>
        </div>

        {result && (
          <div className="result-card">
            <h3>Result</h3>
            <p>
              Score:{" "}
              <span className={getBadge(result.score)}>
                {result.score}/100
              </span>
            </p>
            <p>Risk: {result.riskLevel}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default SafetyPage;