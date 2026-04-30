import React from "react";
import { useNavigate } from "react-router-dom";
import "../styles/dashboard.css";

function Dashboard() {
  const navigate = useNavigate();

  const user =
    JSON.parse(localStorage.getItem("saferouteUser") || "null") ||
    JSON.parse(localStorage.getItem("user") || "null") ||
    JSON.parse(localStorage.getItem("currentUser") || "null");

  const logout = () => {
    localStorage.removeItem("saferouteUser");
    localStorage.removeItem("user");
    localStorage.removeItem("currentUser");
    navigate("/login");
  };

  return (
    <div className="dashboard-wrapper">
      <div className="app-shell">
        <nav className="app-navbar">
          <div className="brand-block">
            <div className="brand-logo">SR</div>
            <div>
              <h2 className="brand-title">SafeRoute</h2>
              <p className="brand-subtitle">AI-powered safer travel assistant</p>
            </div>
          </div>

          <div className="user-box">
            <span>{user?.email || "User"}</span>
            <button className="secondary-btn" onClick={logout}>
              Logout
            </button>
          </div>
        </nav>

        <section className="hero-card">
          <h1>Travel smarter. Choose safer routes.</h1>
          <p>
            Compare multiple routes, check safety scores, view nearby police
            stations, report incidents, and use emergency SOS during travel.
          </p>
        </section>

        <section className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Safety Zones</div>
            <div className="stat-value">Live</div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Route Intelligence</div>
            <div className="stat-value">AI</div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Emergency Support</div>
            <div className="stat-value">SOS</div>
          </div>
        </section>

        <section className="module-grid">
          <button className="module-card" onClick={() => navigate("/route")}>
            <div className="module-icon green-icon">🗺️</div>
            <h3>Route Finder</h3>
            <p>Find and compare multiple safer routes with AI explanation.</p>
          </button>

          <button className="module-card" onClick={() => navigate("/safety")}>
            <div className="module-icon blue-icon">🛡️</div>
            <h3>Safety Page</h3>
            <p>Check area safety score, risk level, and nearby incidents.</p>
          </button>

          <button className="module-card" onClick={() => navigate("/police")}>
            <div className="module-icon orange-icon">👮</div>
            <h3>Police Stations</h3>
            <p>Find nearby police stations and emergency support points.</p>
          </button>

          <button className="module-card" onClick={() => navigate("/report")}>
            <div className="module-icon red-icon">🚨</div>
            <h3>Report Incident</h3>
            <p>Report accidents, unsafe areas, harassment, or road issues.</p>
          </button>
        </section>
      </div>
    </div>
  );
}

export default Dashboard;