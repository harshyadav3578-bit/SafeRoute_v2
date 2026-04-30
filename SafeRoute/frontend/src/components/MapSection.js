import React, { useState, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import API_BASE_URL from "../config/api";

// Fix marker icon
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});
L.Marker.prototype.options.icon = DefaultIcon;

const MapSection = () => {
  const [source, setSource] = useState("");
  const [destination, setDestination] = useState("");

  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [aiResponse, setAiResponse] = useState(null);

  const [sourceCoords, setSourceCoords] = useState(null);
  const [destCoords, setDestCoords] = useState(null);

  const [userPosition, setUserPosition] = useState(null);
  const [navigating, setNavigating] = useState(false);

  const [loading, setLoading] = useState(false);

  const defaultCenter = [28.6139, 77.209];

  // 🔹 Get current location
  useEffect(() => {
    navigator.geolocation.getCurrentPosition((pos) => {
      setUserPosition([pos.coords.latitude, pos.coords.longitude]);
    });
  }, []);

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

  // 🔹 Get routes
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

  // 🔹 Score routes
  const scoreRoutes = async (routes) => {
    const res = await fetch(
      `${API_BASE_URL}/api/route-safety/score-routes`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
    } catch {}
  };

  // 🔹 Search
  const handleSearch = async () => {
    try {
      setLoading(true);

      const src = await geocode(source);
      const dest = await geocode(destination);

      setSourceCoords([src.lat, src.lng]);
      setDestCoords([dest.lat, dest.lng]);

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

  // 🔹 Navigation
  const startNavigation = () => {
    if (!userPosition || !sourceCoords) {
      alert("Location not available");
      return;
    }

    const dist =
      Math.abs(userPosition[0] - sourceCoords[0]) +
      Math.abs(userPosition[1] - sourceCoords[1]);

    if (dist > 0.05) {
      alert("You are not at starting point");
      return;
    }

    setNavigating(true);
  };

  // 🔹 SOS
  const triggerSOS = async () => {
    if (!userPosition) return alert("Location not found");

    await fetch(`${API_BASE_URL}/api/sos/trigger`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        lat: userPosition[0],
        lng: userPosition[1],
      }),
    });

    alert("SOS triggered 🚨");
  };

  return (
    <div style={{ display: "flex", height: "90vh", gap: "15px" }}>
      
      {/* LEFT PANEL */}
      <div style={{
        width: "350px",
        background: "#0f172a",
        padding: "20px",
        borderRadius: "12px",
        color: "white",
        overflowY: "auto"
      }}>

        <h2>Route Finder</h2>

        <input
          placeholder="Source"
          value={source}
          onChange={(e) => setSource(e.target.value)}
        />

        <input
          placeholder="Destination"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
        />

        <button onClick={handleSearch}>
          {loading ? "Finding..." : "Find Routes"}
        </button>

        <button onClick={startNavigation}>
          Start Navigation
        </button>

        <button onClick={triggerSOS} style={{ background: "red" }}>
          SOS 🚨
        </button>

        {aiResponse && (
          <div>
            <h3>AI Suggestion</h3>
            <p>{aiResponse.summary}</p>
          </div>
        )}

        {routes.map((r, i) => (
          <div
            key={i}
            onClick={() => setSelectedRoute(i)}
            style={{
              background:
                selectedRoute === i ? "#22c55e" : "#1e293b",
              padding: "10px",
              marginTop: "10px",
              cursor: "pointer"
            }}
          >
            <strong>Route {i + 1}</strong>
            <p>{r.distanceKm} km • {r.durationMin} min</p>
            <p>Safety: {r.safetyScore}</p>
          </div>
        ))}
      </div>

      {/* MAP */}
      <div style={{ flex: 1 }}>
        <MapContainer
          center={defaultCenter}
          zoom={12}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

          {sourceCoords && <Marker position={sourceCoords} />}
          {destCoords && <Marker position={destCoords} />}

          {userPosition && <Marker position={userPosition} />}

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