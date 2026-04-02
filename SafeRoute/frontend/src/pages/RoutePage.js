import React from 'react';
import { useNavigate } from 'react-router-dom';
import MapSection from '../components/MapSection';
import '../styles/dashboard.css';

function RoutePage() {
  const navigate = useNavigate();

  return (
    <div className="dashboard-wrapper">
      <div className="top-section left-aligned compact-top">
        <div className="page-header-row">
          <div>
            <h1>Route Finder</h1>
            <p>Route module placeholder page.</p>
          </div>
          <button className="secondary-btn" onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </button>
        </div>
      </div>
      <div className="map-section">
        <MapSection center={[28.6139, 77.209]} stations={[]} height="100%" />
      </div>
    </div>
  );
}

export default RoutePage;
