const mongoose = require("mongoose");

const sosEventSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    userEmail: {
      type: String,
      default: "",
    },

    location: {
      lat: {
        type: Number,
        required: true,
      },
      lng: {
        type: Number,
        required: true,
      },
    },

    mapsLink: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: ["active", "resolved"],
      default: "active",
    },

    contactsNotified: [
      {
        name: String,
        phone: String,
      },
    ],

    nearestPolice: [
      {
        name: String,
        lat: Number,
        lng: Number,
        distanceKm: Number,
      },
    ],

    message: {
      type: String,
      default: "SOS triggered.",
    },
  },
  {
    timestamps: true,
  }
);

module.exports =
  mongoose.models.SosEvent || mongoose.model("SosEvent", sosEventSchema);