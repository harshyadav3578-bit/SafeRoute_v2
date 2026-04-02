import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/dashboard.css';

function SafetyPage() {
  const [area, setArea] = useState('');
  const [score, setScore] = useState(null);
  const navigate = useNavigate();

  const calculateSafety = () => {
    setScore(Math.floor(Math.random() * 100));
  };

  return (
    <div className="dashboard-wrapper simple-page">
      <div className="top-section left-aligned compact-top">
        <div className="page-header-row">
          <div>
            <h1>Safety Score</h1>
            <p>Temporary demo page for safety scoring.</p>
          </div>
          <button className="secondary-btn" onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </button>
        </div>
      </div>

      <div className="content-card">
        <input
          className="styled-input"
          placeholder="Enter Delhi Area"
          value={area}
          onChange={(e) => setArea(e.target.value)}
        />
        <button className="primary-btn" onClick={calculateSafety}>
          Check
        </button>
        {score !== null && <h3>Safety Score: {score}%</h3>}
      </div>
    </div>
  );
}

export default SafetyPage;
