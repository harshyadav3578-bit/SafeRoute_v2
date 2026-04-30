const express = require("express");
const router = express.Router();
const { scoreRoutes } = require("../services/safetyScorer");

router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "Route safety API is working",
  });
});

router.post("/score-routes", async (req, res) => {
  try {
    const { routes } = req.body;

    if (!Array.isArray(routes) || routes.length === 0) {
      return res.status(400).json({
        success: false,
        message: "routes array is required",
      });
    }

    const scoredRoutes = await scoreRoutes(routes);

    return res.json({
      success: true,
      routes: scoredRoutes,
      recommendedRoute: scoredRoutes[0],
    });
  } catch (error) {
    console.error("Route safety scoring error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to score routes",
    });
  }
});

module.exports = router;