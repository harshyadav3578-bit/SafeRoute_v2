import React, { useMemo, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  CircleMarker,
  useMap,
} from "react-leaflet";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

function ChangeMapView({ center, zoom }) {
  const map = useMap();
  if (center) {
    map.setView(center, zoom || 13, { animate: true });
  }
  return null;
}

function FitBounds({ sourcePosition, destinationPosition }) {
  const map = useMap();

  React.useEffect(() => {
    if (sourcePosition && destinationPosition) {
      map.fitBounds([sourcePosition, destinationPosition], { padding: [50, 50] });
    }
  }, [map, sourcePosition, destinationPosition]);

  return null;
}

export default function MapSection() {
  const defaultCenter = useMemo(() => [28.6139, 77.209], []);
  const [mapCenter, setMapCenter] = useState(defaultCenter);

  const [sourceText, setSourceText] = useState("");
  const [destinationText, setDestinationText] = useState("");

  const [sourcePosition, setSourcePosition] = useState(null);
  const [destinationPosition, setDestinationPosition] = useState(null);

  const [routeCoords, setRouteCoords] = useState([]);
  const [routeInfo, setRouteInfo] = useState(null);

  const [nearbyPolice, setNearbyPolice] = useState([]);

  const [loadingRoute, setLoadingRoute] = useState(false);
  const [loadingPolice, setLoadingPolice] = useState(false);

  const geocodeLocation = async (place) => {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
        place
      )}`
    );
    const data = await res.json();

    if (!data || data.length === 0) {
      throw new Error(`Location not found: ${place}`);
    }

    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      displayName: data[0].display_name,
    };
  };

  const fetchNearbyPolice = async (lat, lng) => {
    try {
      setLoadingPolice(true);
      const res = await fetch(
        `http://localhost:5000/api/police/nearby?lat=${lat}&lng=${lng}`
      );
      const data = await res.json();
      setNearbyPolice(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching nearby police:", err);
      setNearbyPolice([]);
    } finally {
      setLoadingPolice(false);
    }
  };

  const fetchRoute = async (src, dest) => {
    const url = `https://router.project-osrm.org/route/v1/driving/${src.lng},${src.lat};${dest.lng},${dest.lat}?overview=full&geometries=geojson`;

    const res = await fetch(url);
    const data = await res.json();

    if (!data.routes || data.routes.length === 0) {
      throw new Error("No route found");
    }

    const route = data.routes[0];

    const coords = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);

    setRouteCoords(coords);
    setRouteInfo({
      distanceKm: (route.distance / 1000).toFixed(2),
      durationMin: Math.ceil(route.duration / 60),
    });
  };

  const handleRouteSearch = async (e) => {
    e.preventDefault();

    if (!sourceText.trim() || !destinationText.trim()) {
      alert("Please enter both source and destination");
      return;
    }

    try {
      setLoadingRoute(true);
      setRouteCoords([]);
      setRouteInfo(null);
      setNearbyPolice([]);

      const src = await geocodeLocation(sourceText);
      const dest = await geocodeLocation(destinationText);

      const srcPos = [src.lat, src.lng];
      const destPos = [dest.lat, dest.lng];

      setSourcePosition(srcPos);
      setDestinationPosition(destPos);
      setMapCenter(srcPos);

      await fetchRoute(src, dest);
      await fetchNearbyPolice(dest.lat, dest.lng);
    } catch (error) {
      console.error(error);
      alert(error.message || "Could not find route");
    } finally {
      setLoadingRoute(false);
    }
  };

  return (
    <div className="map-shell">
      <form className="map-route-bar" onSubmit={handleRouteSearch}>
        <input
          type="text"
          placeholder="Enter source, e.g. Dwarka, Delhi"
          value={sourceText}
          onChange={(e) => setSourceText(e.target.value)}
        />

        <input
          type="text"
          placeholder="Enter destination, e.g. Saket, Delhi"
          value={destinationText}
          onChange={(e) => setDestinationText(e.target.value)}
        />

        <button type="submit" disabled={loadingRoute}>
          {loadingRoute ? "Finding..." : "Show Route"}
        </button>
      </form>

      {routeInfo && (
        <div className="route-info-card">
          <div><strong>Distance:</strong> {routeInfo.distanceKm} km</div>
          <div><strong>Time:</strong> {routeInfo.durationMin} min</div>
          {loadingPolice ? <div>Loading nearby police...</div> : null}
        </div>
      )}

      <MapContainer center={defaultCenter} zoom={11} className="map-container">
        <ChangeMapView center={mapCenter} zoom={12} />
        <FitBounds
          sourcePosition={sourcePosition}
          destinationPosition={destinationPosition}
        />

        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {sourcePosition && (
          <>
            <Marker position={sourcePosition}>
              <Popup>Source</Popup>
            </Marker>
            <CircleMarker center={sourcePosition} radius={12} pathOptions={{ weight: 2 }} />
          </>
        )}

        {destinationPosition && (
          <>
            <Marker position={destinationPosition}>
              <Popup>Destination</Popup>
            </Marker>
            <CircleMarker
              center={destinationPosition}
              radius={12}
              pathOptions={{ weight: 2 }}
            />
          </>
        )}

        {routeCoords.length > 0 && (
          <Polyline positions={routeCoords} />
        )}

        {nearbyPolice.map((station, index) => (
          <Marker
            key={station._id || index}
            position={[
              station.lat ??
                station.location?.coordinates?.[1],
              station.lng ??
                station.location?.coordinates?.[0],
            ]}
          >
            <Popup>
              <strong>{station.name}</strong>
              {station.distanceKm !== undefined && (
                <>
                  <br />
                  Distance: {station.distanceKm} km
                </>
              )}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}