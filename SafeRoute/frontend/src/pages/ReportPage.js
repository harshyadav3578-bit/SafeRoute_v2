import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/dashboard.css';

function ReportPage() {
  const navigate = useNavigate();

  return (
    <div className="dashboard-wrapper simple-page">
      <div className="top-section left-aligned compact-top">
        <div className="page-header-row">
          <div>
            <h1>Report Incident</h1>
            <p>Temporary incident reporting page.</p>
          </div>
          <button className="secondary-btn" onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </button>
        </div>
      </div>

      <div className="content-card">
        <input className="styled-input" placeholder="Location" />
        <input className="styled-input" placeholder="Type of Incident" />
        <button className="primary-btn">Submit</button>
      </div>
    </div>
  );
}

export default ReportPage;
