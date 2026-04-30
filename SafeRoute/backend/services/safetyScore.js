const safetyData = require("../data/safetyData.json");
const Incident = require("../models/Incident");
const { predictRouteSafetyWithML } = require("./mlClient");

function toRadians(deg) {
  return deg * (Math.PI / 180);
}

function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;

  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function getTemporalPenalty(currentDate = new Date()) {
  let penalty = 0;
  const hour = currentDate.getHours();
  const day = currentDate.getDay();

  if (hour >= 21 || hour <= 1) penalty += 8;
  if (day === 6 || day === 0 || day === 1) penalty += 5;

  return penalty;
}

function sampleRoutePoints(routeCoords, step = 5) {
  if (!Array.isArray(routeCoords) || routeCoords.length === 0) return [];
  return routeCoords.filter(
    (_, index) => index % step === 0 || index === routeCoords.length - 1
  );
}

function getCrimeSeverityPenalty(hotspot) {
  const severity = String(
    hotspot.severity || hotspot.risk_level || "medium"
  ).toLowerCase();

  if (severity === "high") return 8;
  if (severity === "medium") return 5;
  return 3;
}

function getAccidentSeverityPenalty(spot) {
  const fatal = Number(spot.fatal_crashes_2022 || 0);
  if (fatal >= 6) return 8;
  if (fatal >= 3) return 6;
  if (fatal >= 1) return 4;
  return 2;
}

function getIncidentSeverityPenalty(incident) {
  if (incident.severity === "high") return 9;
  if (incident.severity === "medium") return 6;
  return 3;
}

async function evaluateRoute(routeCoords, meta = {}) {
  let crimeHits = 0;
  let accidentHits = 0;
  let incidentHits = 0;

  let crimeRiskPenalty = 0;
  let accidentRiskPenalty = 0;
  let incidentRiskPenalty = 0;

  const crimeHotspots = safetyData?.safety_data?.crime_hotspots || [];
  const accidentBlackspots = safetyData?.safety_data?.accident_blackspots || [];
  const reportedIncidents = await Incident.find().lean();

  const sampledCoords = sampleRoutePoints(routeCoords, 5);

  const visitedCrimeCore = new Set();
  const visitedCrimeNear = new Set();
  const visitedAccidentCore = new Set();
  const visitedAccidentNear = new Set();
  const visitedIncidentCore = new Set();
  const visitedIncidentNear = new Set();

  for (const [lat, lng] of sampledCoords) {
    for (let i = 0; i < crimeHotspots.length; i++) {
      const hotspot = crimeHotspots[i];
      const dist = haversineDistance(
        lat,
        lng,
        hotspot.latitude,
        hotspot.longitude
      );

      if (dist <= 0.3) {
        if (!visitedCrimeCore.has(i)) {
          visitedCrimeCore.add(i);
          crimeHits++;
          crimeRiskPenalty += getCrimeSeverityPenalty(hotspot);
        }
      } else if (dist <= 0.6) {
        if (!visitedCrimeNear.has(i)) {
          visitedCrimeNear.add(i);
          crimeRiskPenalty += 2;
        }
      }
    }

    for (let i = 0; i < accidentBlackspots.length; i++) {
      const spot = accidentBlackspots[i];
      const dist = haversineDistance(
        lat,
        lng,
        spot.latitude,
        spot.longitude
      );

      if (dist <= 0.3) {
        if (!visitedAccidentCore.has(i)) {
          visitedAccidentCore.add(i);
          accidentHits++;
          accidentRiskPenalty += getAccidentSeverityPenalty(spot);
        }
      } else if (dist <= 0.6) {
        if (!visitedAccidentNear.has(i)) {
          visitedAccidentNear.add(i);
          accidentRiskPenalty += 2;
        }
      }
    }

    for (let i = 0; i < reportedIncidents.length; i++) {
      const incident = reportedIncidents[i];

      if (
        typeof incident?.location?.lat !== "number" ||
        typeof incident?.location?.lng !== "number"
      ) {
        continue;
      }

      const dist = haversineDistance(
        lat,
        lng,
        incident.location.lat,
        incident.location.lng
      );

      if (dist <= 0.3) {
        if (!visitedIncidentCore.has(i)) {
          visitedIncidentCore.add(i);
          incidentHits++;
          incidentRiskPenalty += getIncidentSeverityPenalty(incident);
        }
      } else if (dist <= 0.6) {
        if (!visitedIncidentNear.has(i)) {
          visitedIncidentNear.add(i);
          incidentRiskPenalty += 2;
        }
      }
    }
  }

  const temporalPenalty = getTemporalPenalty();

  const distanceKm = Number(meta.distanceKm || 0);
  const durationMin = Number(meta.durationMin || 0);

  let routeComplexityPenalty = 0;
  if (distanceKm > 15) routeComplexityPenalty += 3;
  if (durationMin > 35) routeComplexityPenalty += 3;

  let ruleBasedScore =
    100 -
    crimeRiskPenalty -
    accidentRiskPenalty -
    incidentRiskPenalty -
    temporalPenalty -
    routeComplexityPenalty;

  if (ruleBasedScore < 0) ruleBasedScore = 0;
  if (ruleBasedScore > 100) ruleBasedScore = 100;

  const mlFeatures = {
    crimeHits,
    accidentHits,
    incidentHits,
    distanceKm,
    durationMin,
    temporalPenalty,
    routeComplexityPenalty,
  };

  const mlScore = await predictRouteSafetyWithML(mlFeatures);

  let finalScore;
  if (typeof mlScore === "number") {
    finalScore = Math.round(ruleBasedScore * 0.6 + mlScore * 0.4);
  } else {
    finalScore = Math.round(ruleBasedScore);
  }

  if (finalScore < 0) finalScore = 0;
  if (finalScore > 100) finalScore = 100;

  let label = "Safe";
  if (finalScore < 75) label = "Moderate";
  if (finalScore < 55) label = "Risky";
  if (finalScore < 35) label = "High Risk";

  return {
    score: finalScore,
    label,
    crimeHits,
    accidentHits,
    incidentHits,
    penalties: {
      crimeRiskPenalty,
      accidentRiskPenalty,
      incidentRiskPenalty,
      temporalPenalty,
      routeComplexityPenalty,
      totalPenalty:
        crimeRiskPenalty +
        accidentRiskPenalty +
        incidentRiskPenalty +
        temporalPenalty +
        routeComplexityPenalty,
    },
    modelScores: {
      ruleBasedScore: Math.round(ruleBasedScore),
      mlScore: typeof mlScore === "number" ? Math.round(mlScore) : null,
    },
  };
}

function rankRoutes(scoredRoutes) {
  return [...scoredRoutes]
    .map((route) => {
      const recommendationScore =
        route.safetyScore * 0.65 +
        Math.max(0, 100 - Number(route.durationMin)) * 0.2 +
        Math.max(0, 100 - Number(route.distanceKm) * 3) * 0.15;

      return {
        ...route,
        recommendationScore: Number(recommendationScore.toFixed(2)),
      };
    })
    .sort((a, b) => {
      if (b.recommendationScore !== a.recommendationScore) {
        return b.recommendationScore - a.recommendationScore;
      }
      if (b.safetyScore !== a.safetyScore) {
        return b.safetyScore - a.safetyScore;
      }
      if (a.durationMin !== b.durationMin) {
        return a.durationMin - b.durationMin;
      }
      return a.distanceKm - b.distanceKm;
    });
}

async function evaluateMultipleRoutes(routes) {
  const scoredRoutes = [];

  for (let index = 0; index < routes.length; index++) {
    const route = routes[index];

    const safety = await evaluateRoute(route.coordinates, {
      distanceKm: route.distanceKm,
      durationMin: route.durationMin,
    });

    scoredRoutes.push({
      routeIndex: index,
      distanceKm: Number(route.distanceKm),
      durationMin: Number(route.durationMin),
      coordinates: route.coordinates,
      safetyScore: safety.score,
      safetyLabel: safety.label,
      crimeHits: safety.crimeHits,
      accidentHits: safety.accidentHits,
      incidentHits: safety.incidentHits,
      penalties: safety.penalties,
      modelScores: safety.modelScores,
    });
  }

  const rankedRoutes = rankRoutes(scoredRoutes);
  const recommendedRoute = rankedRoutes[0] || null;

  return {
    routes: scoredRoutes,
    rankedRoutes,
    recommendedRoute,
  };
}

async function getSafetyZones() {
  const incidents = await Incident.find().lean();
  const crimeHotspots = safetyData?.safety_data?.crime_hotspots || [];
  const accidentBlackspots = safetyData?.safety_data?.accident_blackspots || [];

  const zones = [];

  for (const hotspot of crimeHotspots) {
    zones.push({
      type: "crime-hotspot",
      level: "red",
      lat: hotspot.latitude,
      lng: hotspot.longitude,
      radius: 350,
      source: "dataset",
    });
  }

  for (const spot of accidentBlackspots) {
    let level = "yellow";
    const fatal = Number(spot.fatal_crashes_2022 || 0);
    if (fatal >= 4) level = "red";

    zones.push({
      type: "accident-blackspot",
      level,
      lat: spot.latitude,
      lng: spot.longitude,
      radius: 300,
      source: "dataset",
    });
  }

  for (const incident of incidents) {
    if (
      typeof incident?.location?.lat !== "number" ||
      typeof incident?.location?.lng !== "number"
    ) {
      continue;
    }

    const level =
      incident.severity === "high"
        ? "red"
        : incident.severity === "medium"
        ? "yellow"
        : "green";

    zones.push({
      type: "reported-incident",
      level,
      lat: incident.location.lat,
      lng: incident.location.lng,
      radius: incident.severity === "high" ? 280 : 180,
      source: "user-report",
      severity: incident.severity,
      incidentType: incident.type,
      description: incident.description,
      incidentDateTime: incident.incidentDateTime,
    });
  }

  return zones;
}

module.exports = {
  haversineDistance,
  evaluateRoute,
  evaluateMultipleRoutes,
  getSafetyZones,
};