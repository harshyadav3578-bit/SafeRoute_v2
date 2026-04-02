import React from "react";
import "../styles/dashboard.css";

const Topbar = () => {
  return (
    <div className="topbar">
      <h2>Dashboard</h2>
      <input type="text" placeholder="Search location..." />
    </div>
  );
};

export default Topbar;