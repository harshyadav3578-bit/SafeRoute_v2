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

  // 🔹 Geocode
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

  // 🔹 Routes
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

  // 🔹 AI
  const getAI = async (routes) => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/ai/route-recommendation`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            routes,
            userPrompt: "Suggest safest route",
          }),
        }
      );

      const data = await res.json();

      if (data.success) {
        setAiResponse(data.aiRecommendation);
        setSelectedRoute(data.aiRecommendation.recommendedRouteIndex);
      }
    } catch {
      console.log("AI failed");
    }
  };

  // 🔹 Search
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
    <div style={{ display: "flex", height: "90vh", gap: "15px" }}>
      
      {/* 🔹 LEFT PANEL */}
      <div style={{
        width: "350px",
        background: "#0f172a",
        padding: "20px",
        borderRadius: "12px",
        color: "white",
        overflowY: "auto"
      }}>

        <h2>Route Finder</h2>

        {/* Inputs */}
        <input
          placeholder="Source"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          style={{ width: "100%", marginBottom: "10px", padding: "10px" }}
        />

        <input
          placeholder="Destination"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          style={{ width: "100%", marginBottom: "10px", padding: "10px" }}
        />

        <button
          onClick={handleSearch}
          style={{
            width: "100%",
            padding: "10px",
            background: "#22c55e",
            border: "none",
            borderRadius: "8px",
            color: "white",
            cursor: "pointer"
          }}
        >
          {loading ? "Finding..." : "Find Routes"}
        </button>

        {/* AI */}
        {aiResponse && (
          <div style={{ marginTop: "20px" }}>
            <h3>AI Suggestion</h3>
            <p>{aiResponse.summary}</p>
          </div>
        )}

        {/* Routes */}
        <div style={{ marginTop: "20px" }}>
          {routes.map((r, i) => (
            <div
              key={i}
              onClick={() => setSelectedRoute(i)}
              style={{
                padding: "12px",
                marginBottom: "10px",
                borderRadius: "10px",
                background:
                  selectedRoute === i ? "#22c55e" : "#1e293b",
                cursor: "pointer"
              }}
            >
              <strong>Route {i + 1}</strong>
              <p>{r.distanceKm} km • {r.durationMin} min</p>
              <p>Safety: {r.safetyScore}</p>
            </div>
          ))}
        </div>

      </div>

      {/* 🔹 MAP */}
      <div style={{ flex: 1 }}>
        <MapContainer
          center={defaultCenter}
          zoom={12}
          style={{ height: "100%", width: "100%", borderRadius: "12px" }}
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

    </div>
  );
};

export default MapSection;