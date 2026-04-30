import React, { useEffect, useMemo, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Circle, Marker, Popup } from "react-leaflet";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

const incidentIcon = new L.Icon({
  iconUrl: "https://maps.google.com/mapfiles/ms/icons/orange-dot.png",
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -28],
});

export default function DashboardMapPreview() {
  const center = useMemo(() => [28.6139, 77.209], []);
  const [zones, setZones] = useState([]);
  const [incidents, setIncidents] = useState([]);

  useEffect(() => {
    fetchZones();
    fetchIncidents();
  }, []);

  const fetchZones = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/safety/zones");
      const data = await res.json();
      if (data.success) setZones(data.zones || []);
    } catch (error) {
      console.error("Zone fetch error:", error);
    }
  };

  const fetchIncidents = async () => {
    try {
      const res = await fetch(fetch(`${API_BASE_URL}/api/incidents`));
      const data = await res.json();
      if (data.success) setIncidents(data.incidents || []);
    } catch (error) {
      console.error("Incident fetch error:", error);
    }
  };

  const getZoneColor = (level) => {
    if (level === "red") return "#ef4444";
    if (level === "yellow") return "#f59e0b";
    return "#22c55e";
  };

  return (
    <div className="dashboard-map-preview">
      <MapContainer center={center} zoom={11} className="dashboard-preview-map">
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {zones.slice(0, 80).map((zone, index) => (
          <Circle
            key={`zone-${index}`}
            center={[zone.lat, zone.lng]}
            radius={zone.radius || 250}
            pathOptions={{
              color: getZoneColor(zone.level),
              fillColor: getZoneColor(zone.level),
              fillOpacity: 0.15,
              weight: 1,
            }}
          />
        ))}

        {incidents.slice(0, 30).map((incident, index) => {
          if (
            typeof incident?.location?.lat !== "number" ||
            typeof incident?.location?.lng !== "number"
          ) {
            return null;
          }

          return (
            <Marker
              key={incident._id || index}
              position={[incident.location.lat, incident.location.lng]}
              icon={incidentIcon}
            >
              <Popup>
                <strong>{incident.type}</strong>
                <br />
                Severity: {incident.severity}
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}