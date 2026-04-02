import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/dashboard.css';
import MapSection from '../components/MapSection';

function Dashboard() {
  const navigate = useNavigate();
  const storedUser = localStorage.getItem('saferouteUser');
  const user = storedUser ? JSON.parse(storedUser) : null;

  const handleLogout = () => {
    localStorage.removeItem('saferouteUser');
    navigate('/login');
  };

  return (
    <div className="dashboard-wrapper">
      <div className="top-section">
        <div className="page-header-row dashboard-header-row">
          <div>
            <h1>SafeRoute</h1>
            <p>Urban Safety Intelligence Platform</p>
            {user?.email && <p className="welcome-text">Logged in as {user.email}</p>}
          </div>
          <button className="secondary-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>

        <div className="options-grid">
          <div className="option-card" onClick={() => navigate('/route')}>
            🛣️ Route Finder
          </div>
          <div className="option-card" onClick={() => navigate('/safety')}>
            🛡️ Safety Score
          </div>
          <div className="option-card" onClick={() => navigate('/police')}>
            👮 Nearby Police
          </div>
          <div className="option-card" onClick={() => navigate('/report')}>
            🚨 Report Incident
          </div>
        </div>
      </div>

      <div className="map-wrapper">
        <MapSection />
      </div>

      <button className="sos-btn" onClick={() => alert('SOS Triggered')}>
        🚨 SOS
      </button>
    </div>
  );
}

export default Dashboard;
