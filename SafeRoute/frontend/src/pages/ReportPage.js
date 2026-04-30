import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE_URL from "../config/api";
import "../styles/dashboard.css";

function ReportPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    area: "",
    type: "",
    severity: "medium",
    description: "",
  });

  const submitIncident = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/incidents/report`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (data.success) {
        alert("Reported successfully");
      }
    } catch {
      alert("Error reporting");
    }
  };

  return (
    <div className="dashboard-wrapper">
      <div className="app-shell">
        <div className="page-header-row">
          <div className="page-header-card">
            <h1>Report Incident</h1>
          </div>

          <button className="secondary-btn" onClick={() => navigate("/dashboard")}>
            ← Back
          </button>
        </div>

        <div className="form-card">
          <div className="form-grid">
            <input
              placeholder="Area"
              onChange={(e) =>
                setForm({ ...form, area: e.target.value })
              }
            />

            <input
              placeholder="Type"
              onChange={(e) =>
                setForm({ ...form, type: e.target.value })
              }
            />

            <select
              onChange={(e) =>
                setForm({ ...form, severity: e.target.value })
              }
            >
              <option>low</option>
              <option>medium</option>
              <option>high</option>
            </select>

            <textarea
              className="full-row"
              placeholder="Description"
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />

            <button className="primary-btn full-row" onClick={submitIncident}>
              Submit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReportPage;