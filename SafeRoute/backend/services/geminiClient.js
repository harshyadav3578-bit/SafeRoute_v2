async function getGeminiRouteRecommendation({ userPrompt, routes }) {
  const fallback = (reason = "Gemini is unavailable right now.") => ({
    recommendedRouteIndex: routes[0]?.routeIndex ?? 0,
    summary: "SafeRoute used the backend safest route.",
    reasoning: reason,
    whyNotOtherRoutes: routes.slice(1).map((route) => ({
      routeIndex: route.routeIndex,
      reason:
        "This route was ranked lower because its backend safety score is lower.",
    })),
    safetyAdvice: [
      "Stay on main roads whenever possible.",
      "Share your live location with a trusted contact.",
      "Use SOS immediately if you feel unsafe.",
    ],
    preferenceTags: ["Fallback", "Backend Safety"],
  });

  if (!process.env.GEMINI_API_KEY) {
    return fallback("Gemini API key is missing in backend/.env.");
  }

  const safeRoutes = routes.map((r) => ({
    routeIndex: r.routeIndex,
    routeTag: r.routeTag,
    distanceKm: r.distanceKm,
    durationMin: r.durationMin,
    safetyScore: r.safetyScore,
    safetyLabel: r.safetyLabel,
    incidentHits: r.incidentHits ?? 0,
    crimeHits: r.crimeHits ?? 0,
    accidentHits: r.accidentHits ?? 0,
    breakdown: r.breakdown || {},
  }));

  const prompt = `
You are Gemini AI assistant for SafeRoute, a route safety application.

The backend has already calculated the route safety scores.
You must NOT invent routes, incidents, police stations, or scores.
Choose only one recommendedRouteIndex from the provided route list.

User preference:
${userPrompt || "No special preference. Prefer the safest route."}

Routes:
${JSON.stringify(safeRoutes, null, 2)}

Return ONLY valid JSON.
Do not use markdown.
Do not use code blocks.

Required JSON format:
{
  "recommendedRouteIndex": 0,
  "summary": "short friendly summary for the user",
  "reasoning": "detailed explanation of why this route is recommended",
  "whyNotOtherRoutes": [
    {
      "routeIndex": 1,
      "reason": "why this route is not preferred"
    }
  ],
  "safetyAdvice": [
    "short safety advice 1",
    "short safety advice 2",
    "short safety advice 3"
  ],
  "preferenceTags": ["Safety", "Night Travel", "Low Incident Risk"]
}

Rules:
- recommendedRouteIndex must be one of the given routeIndex values.
- Prefer higher safetyScore over shorter duration unless user clearly asks for fastest route.
- If incidentHits is high, mention recent incident risk.
- If safetyLabel is Risky, warn politely.
- Keep the explanation useful for a normal user.
`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API error:", data);
      return fallback(
        data?.error?.message ||
          "Gemini request failed, so backend fallback was used."
      );
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return fallback("Gemini returned an empty response.");
    }

    const cleanedText = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    let parsed;

    try {
      parsed = JSON.parse(cleanedText);
    } catch (error) {
      console.error("Invalid Gemini JSON:", text);
      return fallback("Gemini returned invalid JSON.");
    }

    const validIndexes = safeRoutes.map((route) => Number(route.routeIndex));

    if (!validIndexes.includes(Number(parsed.recommendedRouteIndex))) {
      parsed.recommendedRouteIndex = safeRoutes[0]?.routeIndex ?? 0;
    }

    return {
      recommendedRouteIndex: Number(parsed.recommendedRouteIndex),
      summary:
        parsed.summary || "Gemini recommended the safest available route.",
      reasoning:
        parsed.reasoning ||
        "This route was selected based on backend safety score and your preference.",
      whyNotOtherRoutes: Array.isArray(parsed.whyNotOtherRoutes)
        ? parsed.whyNotOtherRoutes
        : [],
      safetyAdvice: Array.isArray(parsed.safetyAdvice)
        ? parsed.safetyAdvice
        : [
            "Stay alert during travel.",
            "Prefer well-lit roads.",
            "Use SOS if you feel unsafe.",
          ],
      preferenceTags: Array.isArray(parsed.preferenceTags)
        ? parsed.preferenceTags
        : ["Safety"],
    };
  } catch (error) {
    console.error("Gemini fetch failed:", error);

    return fallback(
      "Gemini could not be reached, so SafeRoute used backend safety scoring."
    );
  }
}

module.exports = { getGeminiRouteRecommendation };