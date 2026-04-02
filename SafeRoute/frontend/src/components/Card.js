import React from "react";
import "../styles/dashboard.css";

const Card = ({ title, value, icon }) => {
  return (
    <div className="card">
      <div className="card-top">{icon}</div>
      <h3>{title}</h3>
      <p>{value}</p>
    </div>
  );
};

export default Card;