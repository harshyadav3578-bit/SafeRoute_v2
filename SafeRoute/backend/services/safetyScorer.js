const Incident = require("../models/Incident");

function toRad(deg) {
  return deg * (Math.PI / 180);
}

function distanceKmBetweenPoints(a, b) {
  const R = 6371;

  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);

  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) *
      Math.cos(toRad(b.lat)) *
      Math.sin(dLng / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function getSafetyLabel(score) {
  if (score >= 75) return "Safe";
  if (score >= 55) return "Moderate";
  return "Risky";
}

function getTimePenalty() {
  const hour = new Date().getHours();

  if (hour >= 22 || hour < 5) return 12;
  if (hour >= 19 || hour < 7) return 7;

  return 0;
}

function getSeverityPenalty(severity) {
  if (severity === "high") return 12;
  if (severity === "medium") return 7;
  return 4;
}

function getRecencyMultiplier(dateValue) {
  if (!dateValue) return 1;

  const incidentTime = new Date(dateValue).getTime();
  const now = Date.now();
  const hoursOld = (now - incidentTime) / (1000 * 60 * 60);

  if (hoursOld <= 24) return 1.5;
  if (hoursOld <= 72) return 1.25;
  if (hoursOld <= 168) return 1.1;

  return 1;
}

function getNearestDistanceToRouteKm(incident, coordinates) {
  if (!incident?.location || !Array.isArray(coordinates)) return Infinity;

  const incidentPoint = {
    lat: Number(incident.location.lat),
    lng: Number(incident.location.lng),
  };

  let nearest = Infinity;

  const step = Math.max(1, Math.floor(coordinates.length / 150));

  for (let i = 0; i < coordinates.length; i += step) {
    const routePoint = {
      lat: Number(coordinates[i][0]),
      lng: Number(coordinates[i][1]),
    };

    const dist = distanceKmBetweenPoints(incidentPoint, routePoint);

    if (dist < nearest) {
      nearest = dist;
    }
  }

  return nearest;
}

function calculateIncidentImpact(route, incidents) {
  let incidentPenalty = 0;
  let incidentHits = 0;
  const matchedIncidents = [];

  for (const incident of incidents) {
    const nearestDistanceKm = getNearestDistanceToRouteKm(
      incident,
      route.coordinates
    );

    if (nearestDistanceKm <= 0.3) {
      const severityPenalty = getSeverityPenalty(incident.severity);
      const recencyMultiplier = getRecencyMultiplier(
        incident.incidentDateTime || incident.createdAt
      );

      const distanceMultiplier =
        nearestDistanceKm <= 0.1 ? 1.25 : nearestDistanceKm <= 0.2 ? 1.1 : 1;

      const finalPenalty =
        severityPenalty * recencyMultiplier * distanceMultiplier;

      incidentPenalty += finalPenalty;
      incidentHits++;

      matchedIncidents.push({
        id: incident._id,
        type: incident.type,
        severity: incident.severity,
        distanceKm: Number(nearestDistanceKm.toFixed(3)),
        penalty: Number(finalPenalty.toFixed(2)),
      });
    }
  }

  return {
    incidentHits,
    incidentPenalty: Number(Math.min(35, incidentPenalty).toFixed(2)),
    matchedIncidents,
  };
}

function calculateRouteSafety(route, index = 0, incidents = []) {
  let score = 90;

  const distanceKm = Number(route.distanceKm || 0);
  const durationMin = Number(route.durationMin || 0);

  let distancePenalty = 0;
  let durationPenalty = 0;
  const timePenalty = getTimePenalty();
  const alternativePenalty = index * 3;

  if (distanceKm > 10) {
    distancePenalty = Math.min(12, (distanceKm - 10) * 0.6);
  }

  if (durationMin > 30) {
    durationPenalty = Math.min(10, (durationMin - 30) * 0.3);
  }

  const incidentImpact = calculateIncidentImpact(route, incidents);

  score =
    score -
    distancePenalty -
    durationPenalty -
    timePenalty -
    alternativePenalty -
    incidentImpact.incidentPenalty;

  score = Math.max(25, Math.min(100, Math.round(score)));

  return {
    safetyScore: score,
    safetyLabel: getSafetyLabel(score),
    incidentHits: incidentImpact.incidentHits,
    matchedIncidents: incidentImpact.matchedIncidents,
    breakdown: {
      baseScore: 90,
      distancePenalty: Number(distancePenalty.toFixed(2)),
      durationPenalty: Number(durationPenalty.toFixed(2)),
      timePenalty,
      alternativePenalty,
      incidentPenalty: incidentImpact.incidentPenalty,
    },
  };
}

async function scoreRoutes(routes) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const incidents = await Incident.find({
    incidentDateTime: { $gte: thirtyDaysAgo },
  })
    .sort({ incidentDateTime: -1, createdAt: -1 })
    .lean();

  const scoredRoutes = routes.map((route, index) => {
    const result = calculateRouteSafety(route, index, incidents);

    return {
      ...route,
      safetyScore: result.safetyScore,
      safetyLabel: result.safetyLabel,
      incidentHits: result.incidentHits,
      matchedIncidents: result.matchedIncidents,
      crimeHits: route.crimeHits ?? 0,
      accidentHits: route.accidentHits ?? 0,
      breakdown: result.breakdown,
    };
  });

  scoredRoutes.sort((a, b) => b.safetyScore - a.safetyScore);

  const fastestDuration = Math.min(...scoredRoutes.map((r) => r.durationMin));

  return scoredRoutes.map((route, index) => ({
    ...route,
    routeIndex: index,
    routeTag:
      index === 0
        ? "Safest"
        : route.durationMin === fastestDuration
        ? "Fastest"
        : "Alternative",
  }));
}

module.exports = {
  scoreRoutes,
  calculateRouteSafety,
};