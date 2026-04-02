import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MapSection from '../components/MapSection';
import '../styles/dashboard.css';

function PolicePage() {
  const [area, setArea] = useState('Connaught Place, Delhi');
  const [selectedPosition, setSelectedPosition] = useState([28.6315, 77.2167]);
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSearch = async (e) => {
    e.preventDefault();
    setError('');

    if (!area.trim()) {
      setError('Please enter an area name.');
      return;
    }

    setLoading(true);

    try {
      const geoResponse = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(area)}`
      );
      const geoData = await geoResponse.json();

      if (!geoData.length) {
        setError('Area not found. Try a more specific Delhi location.');
        setStations([]);
        return;
      }

      const lat = Number(geoData[0].lat);
      const lng = Number(geoData[0].lon);
      setSelectedPosition([lat, lng]);

      const policeResponse = await fetch(
        `http://localhost:5000/api/police/nearby?lat=${lat}&lng=${lng}&limit=5`
      );
      const policeData = await policeResponse.json();

      if (!policeResponse.ok) {
        setError(policeData.message || 'Could not fetch nearby police stations.');
        setStations([]);
        return;
      }

      setStations(policeData);
      if (!policeData.length) {
        setError('No nearby police station data found.');
      }
    } catch (err) {
      setError('Could not search the location right now.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('saferouteUser');
    navigate('/login');
  };

  return (
    <div className="dashboard-wrapper police-page-wrapper">
      <div className="top-section police-top-section left-aligned">
        <div className="page-header-row">
          <div>
            <h1>Nearby Police Stations</h1>
            <p>Enter an area and view the nearest police stations on the map.</p>
          </div>
          <button className="secondary-btn" onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </button>
        </div>

        <form className="search-panel" onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="Enter area, locality, or landmark"
            value={area}
            onChange={(e) => setArea(e.target.value)}
          />
          <button className="primary-btn" type="submit" disabled={loading}>
            {loading ? 'Searching...' : 'Find Nearby Police'}
          </button>
          <button className="secondary-btn" type="button" onClick={handleLogout}>
            Logout
          </button>
        </form>

        {error && <div className="status-box error-box">{error}</div>}
      </div>

      <div className="police-layout">
        <div className="police-map-card">
          <MapSection
            center={[28.6139, 77.209]}
            selectedPosition={selectedPosition}
            selectedLabel={area || 'Selected Area'}
            stations={stations}
            height="100%"
          />
        </div>

        <div className="police-list-card">
          <h3>Nearest Stations</h3>
          {!stations.length ? (
            <p className="muted-text">Search for an area to see the nearest police stations.</p>
          ) : (
            <div className="station-list">
              {stations.map((station, index) => (
                <div key={station._id || `${station.name}-${index}`} className="station-item">
                  <div className="station-rank">#{index + 1}</div>
                  <div>
                    <strong>{station.name}</strong>
                    <p>{station.distance.toFixed(2)} km away</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PolicePage;
