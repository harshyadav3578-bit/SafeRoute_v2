const express = require("express");
const router = express.Router();

const User = require("../models/User");
const Police = require("../models/Police");
const SosEvent = require("../models/SosEvent");

function toRad(deg) {
  return deg * (Math.PI / 180);
}

function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

async function getNearestPolice(lat, lng) {
  const stations = await Police.find().lean();

  return stations
    .filter(
      (station) =>
        typeof station.lat === "number" && typeof station.lng === "number"
    )
    .map((station) => ({
      name: station.name,
      lat: station.lat,
      lng: station.lng,
      distanceKm: Number(
        haversineDistance(lat, lng, station.lat, station.lng).toFixed(2)
      ),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 5);
}

router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "SOS API is working",
  });
});

router.post("/trigger", async (req, res) => {
  try {
    const { userId, lat, lng } = req.body;

    if (!userId || lat == null || lng == null) {
      return res.status(400).json({
        success: false,
        message: "userId, lat, and lng are required.",
      });
    }

    const sourceLat = Number(lat);
    const sourceLng = Number(lng);

    if (Number.isNaN(sourceLat) || Number.isNaN(sourceLng)) {
      return res.status(400).json({
        success: false,
        message: "Invalid latitude or longitude.",
      });
    }

    const user = await User.findById(userId).lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const contacts = user.trustedContacts || [];

    const nearestPolice = await getNearestPolice(sourceLat, sourceLng);

    const mapsLink = `https://www.google.com/maps?q=${sourceLat},${sourceLng}`;

    const message = `SOS ALERT: ${user.email} triggered SOS at ${sourceLat}, ${sourceLng}. Location: ${mapsLink}`;

    console.log("🚨 SOS ALERT TRIGGERED");
    console.log(message);

    if (contacts.length > 0) {
      contacts.forEach((contact) => {
        console.log(`Demo notification sent to ${contact.name}: ${contact.phone}`);
      });
    } else {
      console.log("No trusted contacts saved. SOS event still stored.");
    }

    const sosEvent = await SosEvent.create({
      userId,
      userEmail: user.email,
      location: {
        lat: sourceLat,
        lng: sourceLng,
      },
      mapsLink,
      status: "active",
      contactsNotified: contacts,
      nearestPolice,
      message,
    });

    return res.status(201).json({
      success: true,
      message:
        contacts.length > 0
          ? "SOS triggered. Trusted contacts notified in demo mode."
          : "SOS triggered. No trusted contacts saved, but event was stored.",
      sosEvent,
      contactsNotified: contacts,
      nearestPolice,
      mapsLink,
    });
  } catch (error) {
    console.error("SOS trigger error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not trigger SOS.",
    });
  }
});

router.get("/history/:userId", async (req, res) => {
  try {
    const events = await SosEvent.find({ userId: req.params.userId })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    return res.json({
      success: true,
      events,
    });
  } catch (error) {
    console.error("SOS history error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not fetch SOS history.",
    });
  }
});

router.put("/:eventId/resolve", async (req, res) => {
  try {
    const event = await SosEvent.findByIdAndUpdate(
      req.params.eventId,
      { status: "resolved" },
      { new: true }
    ).lean();

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "SOS event not found.",
      });
    }

    return res.json({
      success: true,
      message: "SOS event resolved.",
      event,
    });
  } catch (error) {
    console.error("Resolve SOS error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not resolve SOS event.",
    });
  }
});

module.exports = router;