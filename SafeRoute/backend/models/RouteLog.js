const mongoose = require("mongoose");

const routeLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    source: {
      type: String,
      default: "",
    },
    destination: {
      type: String,
      default: "",
    },
    selectedRouteIndex: {
      type: Number,
      default: null,
    },
    recommendedRouteIndex: {
      type: Number,
      default: null,
    },
    routes: [
      {
        routeIndex: Number,
        distanceKm: Number,
        durationMin: Number,
        safetyScore: Number,
        safetyLabel: String,
        crimeHits: Number,
        accidentHits: Number,
        incidentHits: Number,
        recommendationScore: Number,
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports =
  mongoose.models.RouteLog || mongoose.model("RouteLog", routeLogSchema);