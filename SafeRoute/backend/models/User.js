const mongoose = require("mongoose");

const trustedContactSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    trustedContacts: {
      type: [trustedContactSchema],
      default: [],
      validate: {
        validator: function (value) {
          return Array.isArray(value) && value.length <= 5;
        },
        message: "You can save up to 5 trusted contacts.",
      },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.models.User || mongoose.model("User", userSchema);