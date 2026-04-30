import React, { useState } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import API_BASE_URL from "../config/api";

const MapSection = () => {
  const [source, setSource] = useState("");
  const [destination, setDestination] = useState("");

  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [aiResponse, setAiResponse] = useState(null);

  const [loading, setLoading] = useState(false);

  const defaultCenter = [28.6139, 77.209];

  // 🔹 Geocode function
  const geocode = async (place) => {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${place}`
    );
    const data = await res.json();

    if (!data.length) throw new Error("Location not found");

    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
    };
  };

  // 🔹 Fetch routes
  const getRoutes = async (src, dest) => {
    const url = `https://router.project-osrm.org/route/v1/driving/${src.lng},${src.lat};${dest.lng},${dest.lat}?alternatives=true&overview=full&geometries=geojson`;

    const res = await fetch(url);
    const data = await res.json();

    return data.routes.slice(0, 3).map((route, i) => ({
      routeIndex: i,
      coordinates: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
      distanceKm: (route.distance / 1000).toFixed(2),
      durationMin: Math.ceil(route.duration / 60),
    }));
  };

  // 🔹 Safety scoring
  const scoreRoutes = async (routes) => {
    const res = await fetch(
      `${API_BASE_URL}/api/route-safety/score-routes`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ routes }),
      }
    );

    const data = await res.json();
    return data.routes;
  };

  // 🔹 Gemini AI
  const getAI = async (routes) => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/ai/route-recommendation`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            routes,
            userPrompt: "Give safest route",
          }),
        }
      );

      const data = await res.json();

      if (data.success) {
        setAiResponse(data.aiRecommendation);
        setSelectedRoute(data.aiRecommendation.recommendedRouteIndex);
      }
    } catch {
      console.log("AI failed, fallback used");
    }
  };

  // 🔹 Main search
  const handleSearch = async () => {
    try {
      setLoading(true);

      const src = await geocode(source);
      const dest = await geocode(destination);

      const rawRoutes = await getRoutes(src, dest);
      const scored = await scoreRoutes(rawRoutes);

      setRoutes(scored);
      setSelectedRoute(0);

      getAI(scored);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* 🔹 Input UI */}
      <div className="map-route-bar">
        <input
          placeholder="Enter source"
          value={source}
          onChange={(e) => setSource(e.target.value)}
        />

        <input
          placeholder="Enter destination"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
        />

        <button onClick={handleSearch}>
          {loading ? "Loading..." : "Find Route"}
        </button>
      </div>

      {/* 🔹 AI Box */}
      {aiResponse && (
        <div className="glass-card">
          <h3>AI Recommendation</h3>
          <p>{aiResponse.summary}</p>
        </div>
      )}

      {/* 🔹 Routes UI */}
      <div className="route-options-panel">
        {routes.map((r, i) => (
          <div
            key={i}
            className={`route-option-card ${
              selectedRoute === i ? "active" : ""
            }`}
            onClick={() => setSelectedRoute(i)}
          >
            <h4>Route {i + 1}</h4>
            <p>{r.distanceKm} km • {r.durationMin} min</p>
            <p>Safety: {r.safetyScore}</p>
          </div>
        ))}
      </div>

      {/* 🔹 Map */}
      <MapContainer
        center={defaultCenter}
        zoom={12}
        className="map-container"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {routes.map((route, i) => (
          <Polyline
            key={i}
            positions={route.coordinates}
            pathOptions={{
              color: selectedRoute === i ? "green" : "gray",
              weight: selectedRoute === i ? 6 : 3,
            }}
          />
        ))}
      </MapContainer>
    </div>
  );
};

export default MapSection;