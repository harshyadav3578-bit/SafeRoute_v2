const express = require("express");
const router = express.Router();
const { getGeminiRouteRecommendation } = require("../services/geminiClient");

router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "AI route is working",
  });
});

router.post("/route-recommendation", async (req, res) => {
  try {
    const { userPrompt, routes } = req.body;

    if (!Array.isArray(routes) || routes.length === 0) {
      return res.status(400).json({
        success: false,
        message: "routes array is required",
      });
    }

    const aiRecommendation = await getGeminiRouteRecommendation({
      userPrompt,
      routes,
    });

    return res.json({
      success: true,
      aiRecommendation,
    });
  } catch (error) {
    console.error("AI route error:", error);

    return res.json({
      success: true,
      aiRecommendation: {
        recommendedRouteIndex: req.body?.routes?.[0]?.routeIndex ?? 0,
        summary: "SafeRoute used the backend safest route.",
        reasoning:
          "Gemini failed, but the app continued using backend safety scoring.",
        preferenceTags: ["Fallback", "Backend Safety"],
      },
    });
  }
});

module.exports = router;