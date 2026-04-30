import React, { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "../styles/MapSection.css";
import API_BASE_URL from "../config/api";

import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

L.Marker.prototype.options.icon = DefaultIcon;

const ROUTE_COLORS = ["#22c55e", "#3b82f6", "#f59e0b"];

function ResizeMap({ routes }) {
  const map = useMap();

  useEffect(() => {
    setTimeout(() => {
      map.invalidateSize();
    }, 300);
  }, [map, routes]);

  return null;
}

function FitRouteBounds({ sourceCoords, destinationCoords }) {
  const map = useMap();

  useEffect(() => {
    if (sourceCoords && destinationCoords) {
      setTimeout(() => {
        map.invalidateSize();
        map.fitBounds([sourceCoords, destinationCoords], {
          padding: [50, 50],
        });
      }, 300);
    }
  }, [map, sourceCoords, destinationCoords]);

  return null;
}

function MapSection() {
  const [source, setSource] = useState("");
  const [destination, setDestination] = useState("");
  const [preference, setPreference] = useState("");

  const [sourceCoords, setSourceCoords] = useState(null);
  const [destinationCoords, setDestinationCoords] = useState(null);

  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(0);
  const [aiResponse, setAiResponse] = useState(null);

  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [message, setMessage] = useState("");

  const defaultCenter = [28.6139, 77.209];

  const geocode = async (place) => {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
        place
      )}`
    );

    const data = await res.json();

    if (!data.length) {
      throw new Error(`Location not found: ${place}`);
    }

    return {
      lat: Number(data[0].lat),
      lng: Number(data[0].lon),
    };
  };

  const getRoutesFromOSRM = async (src, dest) => {
    const url = `https://router.project-osrm.org/route/v1/driving/${src.lng},${src.lat};${dest.lng},${dest.lat}?alternatives=true&overview=full&geometries=geojson`;

    const res = await fetch(url);
    const data = await res.json();

    if (!data.routes || data.routes.length === 0) {
      throw new Error("No route found");
    }

    return data.routes.slice(0, 3).map((route, index) => ({
      routeIndex: index,
      coordinates: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
      distanceKm: Number((route.distance / 1000).toFixed(2)),
      durationMin: Math.ceil(route.duration / 60),
      color: ROUTE_COLORS[index % ROUTE_COLORS.length],
    }));
  };

  const scoreRoutes = async (rawRoutes) => {
    const res = await fetch(`${API_BASE_URL}/api/route-safety/score-routes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ routes: rawRoutes }),
    });

    const data = await res.json();

    if (!data.success) {
      throw new Error(data.message || "Route scoring failed");
    }

    return data.routes;
  };

  const getGeminiRecommendation = async (scoredRoutes) => {
    try {
      setAiLoading(true);
      setAiResponse(null);

      const res = await fetch(`${API_BASE_URL}/api/ai/route-recommendation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          routes: scoredRoutes,
          userPrompt:
            preference || "Prefer safest route with less risk and police nearby.",
        }),
      });

      const data = await res.json();

      if (data.success && data.aiRecommendation) {
        setAiResponse(data.aiRecommendation);

        const recommendedIndex = Number(
          data.aiRecommendation.recommendedRouteIndex
        );

        if (!Number.isNaN(recommendedIndex)) {
          setSelectedRoute(recommendedIndex);
        }
      }
    } catch {
      setAiResponse({
        recommendedRouteIndex: 0,
        summary: "Gemini is unavailable. Backend safest route is selected.",
        reasoning:
          "The app continued with backend route scoring because Gemini could not respond.",
        safetyAdvice: [
          "Prefer main roads.",
          "Share live location.",
          "Use SOS in emergency.",
        ],
        preferenceTags: ["Fallback", "Backend Safety"],
      });
    } finally {
      setAiLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!source.trim() || !destination.trim()) {
      alert("Please enter source and destination");
      return;
    }

    try {
      setLoading(true);
      setMessage("");
      setRoutes([]);
      setAiResponse(null);

      const src = await geocode(source);
      const dest = await geocode(destination);

      const srcPoint = [src.lat, src.lng];
      const destPoint = [dest.lat, dest.lng];

      setSourceCoords(srcPoint);
      setDestinationCoords(destPoint);

      const rawRoutes = await getRoutesFromOSRM(src, dest);
      const scoredRoutes = await scoreRoutes(rawRoutes);

      setRoutes(scoredRoutes);
      setSelectedRoute(0);

      await getGeminiRecommendation(scoredRoutes);
    } catch (error) {
      alert(error.message || "Could not find route");
    } finally {
      setLoading(false);
    }
  };

  const startNavigation = () => {
    if (!routes.length) {
      setMessage("Please find and select a route first.");
      return;
    }

    if (!navigator.geolocation) {
      setMessage("Geolocation is not supported by this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      () => {
        setMessage("Navigation started. Follow the selected route.");
      },
      () => {
        setMessage("Please allow location permission to start navigation.");
      }
    );
  };

  const triggerSOS = async () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported.");
      return;
    }

    const confirmSOS = window.confirm("Trigger emergency SOS?");
    if (!confirmSOS) return;

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await fetch(`${API_BASE_URL}/api/sos/trigger`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            }),
          });

          alert("SOS triggered successfully.");
        } catch {
          alert("SOS request sent, but backend response failed.");
        }
      },
      () => {
        alert("Location permission required for SOS.");
      }
    );
  };

  const activeRoute = routes[selectedRoute];

  return (
    <div className="route-layout">
      <aside className="route-sidebar">
        <div className="route-sidebar-header">
          <h2>Find Safe Route</h2>
          <p>Compare routes using safety score and Gemini guidance.</p>
        </div>

        <div className="route-form">
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

          <textarea
            placeholder="Gemini preference: e.g. safest route at night, prefer police nearby"
            value={preference}
            onChange={(e) => setPreference(e.target.value)}
          />

          <button className="find-route-btn" onClick={handleSearch}>
            {loading ? "Finding Routes..." : "Find Routes"}
          </button>
        </div>

        <div className="quick-actions">
          <button onClick={startNavigation}>Start Navigation</button>
          <button className="sos-action" onClick={triggerSOS}>
            SOS 🚨
          </button>
        </div>

        {message && <div className="navigation-note">{message}</div>}

        <div className="ai-box">
          <div className="section-title">Gemini Route Assistant</div>

          {aiLoading ? (
            <p>Gemini is analysing your routes...</p>
          ) : aiResponse ? (
            <>
              <p className="ai-summary">{aiResponse.summary}</p>

              {aiResponse.reasoning && (
                <p className="ai-reason">{aiResponse.reasoning}</p>
              )}

              {Array.isArray(aiResponse.safetyAdvice) &&
                aiResponse.safetyAdvice.length > 0 && (
                  <ul className="advice-list">
                    {aiResponse.safetyAdvice.map((tip, index) => (
                      <li key={index}>{tip}</li>
                    ))}
                  </ul>
                )}

              {Array.isArray(aiResponse.preferenceTags) && (
                <div className="tag-row">
                  {aiResponse.preferenceTags.map((tag, index) => (
                    <span key={index}>{tag}</span>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p>Search a route to get AI recommendation.</p>
          )}
        </div>

        <div className="routes-list">
          <div className="section-title">Route Options</div>

          {routes.length === 0 ? (
            <p className="empty-text">No routes yet.</p>
          ) : (
            routes.map((route, index) => (
              <div
                key={index}
                className={`route-card ${
                  selectedRoute === index ? "selected" : ""
                }`}
                onClick={() => setSelectedRoute(index)}
              >
                <div className="route-card-top">
                  <strong>Route {index + 1}</strong>
                  <span>{route.routeTag || "Option"}</span>
                </div>

                <div className="route-score">
                  {route.safetyScore || "--"}/100
                </div>

                <p>
                  {route.distanceKm} km • {route.durationMin} min •{" "}
                  {route.safetyLabel || "Safety"}
                </p>

                {route.incidentHits > 0 && (
                  <small>{route.incidentHits} incident(s) near route</small>
                )}
              </div>
            ))
          )}
        </div>
      </aside>

      <main className="route-map-panel">
        <div className="map-topbar">
          <div>
            <h3>{activeRoute ? `Route ${selectedRoute + 1}` : "Map Preview"}</h3>
            <p>
              {activeRoute
                ? `${activeRoute.distanceKm} km • ${activeRoute.durationMin} min • Safety ${activeRoute.safetyScore}/100`
                : "Enter source and destination to view routes."}
            </p>
          </div>
        </div>

        <MapContainer center={defaultCenter} zoom={11} className="route-map">
          <ResizeMap routes={routes} />
          <FitRouteBounds
            sourceCoords={sourceCoords}
            destinationCoords={destinationCoords}
          />

          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

          {sourceCoords && (
            <Marker position={sourceCoords}>
              <Popup>Source</Popup>
            </Marker>
          )}

          {destinationCoords && (
            <Marker position={destinationCoords}>
              <Popup>Destination</Popup>
            </Marker>
          )}

          {routes.map((route, index) => (
            <Polyline
              key={index}
              positions={route.coordinates}
              pathOptions={{
                color: selectedRoute === index ? "#22c55e" : "#64748b",
                weight: selectedRoute === index ? 7 : 4,
                opacity: selectedRoute === index ? 0.95 : 0.35,
              }}
            />
          ))}
        </MapContainer>
      </main>
    </div>
  );
}

export default MapSection;