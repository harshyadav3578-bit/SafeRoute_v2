import React from "react";
import "../styles/dashboard.css";

const Sidebar = () => {
  return (
    <div className="sidebar">
      <h2 className="logo">SafeRoute</h2>

      <ul>
        <li>🏠 Dashboard</li>
        <li>🛣️ Route Finder</li>
        <li>🚨 Report</li>
        <li>👮 Police</li>
        <li className="sos">🆘 SOS</li>
      </ul>
    </div>
  );
};

export default Sidebar;