const express = require("express");
const router = express.Router();
const Incident = require("../models/Incident");

router.post("/report", async (req, res) => {
  try {
    const {
      type,
      severity,
      description,
      lat,
      lng,
      incidentDateTime,
      reportedBy,
    } = req.body;

    if (!type || !severity || lat == null || lng == null || !incidentDateTime) {
      return res.status(400).json({
        success: false,
        message: "type, severity, lat, lng, and incidentDateTime are required.",
      });
    }

    if (!["low", "medium", "high"].includes(severity)) {
      return res.status(400).json({
        success: false,
        message: "severity must be low, medium, or high.",
      });
    }

    const incident = await Incident.create({
      type: String(type).trim(),
      severity,
      description: description || "",
      location: {
        lat: Number(lat),
        lng: Number(lng),
      },
      incidentDateTime: new Date(incidentDateTime),
      reportedBy: reportedBy || null,
    });

    return res.status(201).json({
      success: true,
      message:
        "Incident reported successfully. It will now affect nearby route safety scores.",
      incident,
    });
  } catch (error) {
    console.error("Incident report error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not report incident.",
    });
  }
});

router.get("/", async (req, res) => {
  try {
    const incidents = await Incident.find()
      .sort({ incidentDateTime: -1, createdAt: -1 })
      .limit(100)
      .lean();

    return res.json({
      success: true,
      incidents,
    });
  } catch (error) {
    console.error("Fetch incidents error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not fetch incidents.",
    });
  }
});

module.exports = router;