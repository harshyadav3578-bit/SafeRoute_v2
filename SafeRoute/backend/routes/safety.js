const express = require("express");
const router = express.Router();
const RouteLog = require("../models/RouteLog");
const {
  evaluateMultipleRoutes,
  getSafetyZones,
} = require("../services/safetyScore");

router.post("/score-routes", async (req, res) => {
  try {
    const { routes, userId, source, destination, selectedRouteIndex } = req.body;

    if (!Array.isArray(routes) || routes.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Routes array is required",
      });
    }

    const result = await evaluateMultipleRoutes(routes);

    await RouteLog.create({
      userId: userId || null,
      source: source || "",
      destination: destination || "",
      selectedRouteIndex:
        typeof selectedRouteIndex === "number" ? selectedRouteIndex : null,
      recommendedRouteIndex: result.recommendedRoute?.routeIndex ?? null,
      routes: result.rankedRoutes.map((route) => ({
        routeIndex: route.routeIndex,
        distanceKm: route.distanceKm,
        durationMin: route.durationMin,
        safetyScore: route.safetyScore,
        safetyLabel: route.safetyLabel,
        crimeHits: route.crimeHits,
        accidentHits: route.accidentHits,
        incidentHits: route.incidentHits,
        recommendationScore: route.recommendationScore,
      })),
    });

    return res.status(200).json({
      success: true,
      routes: result.routes,
      rankedRoutes: result.rankedRoutes,
      recommendedRoute: result.recommendedRoute,
    });
  } catch (error) {
    console.error("Safety scoring error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while scoring routes",
    });
  }
});

router.get("/zones", async (req, res) => {
  try {
    const zones = await getSafetyZones();
    return res.json({
      success: true,
      zones,
    });
  } catch (error) {
    console.error("Safety zones error:", error);
    return res.status(500).json({
      success: false,
      message: "Could not fetch safety zones.",
    });
  }
});

module.exports = router;