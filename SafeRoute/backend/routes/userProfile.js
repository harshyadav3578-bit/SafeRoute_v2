const express = require("express");
const router = express.Router();
const User = require("../models/User");

router.get("/:userId/contacts", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    return res.json({
      success: true,
      trustedContacts: user.trustedContacts || [],
    });
  } catch (error) {
    console.error("Get contacts error:", error);
    return res.status(500).json({
      success: false,
      message: "Could not fetch trusted contacts.",
    });
  }
});

router.put("/:userId/contacts", async (req, res) => {
  try {
    const { trustedContacts } = req.body;

    if (!Array.isArray(trustedContacts) || trustedContacts.length < 2) {
      return res.status(400).json({
        success: false,
        message: "At least 2 trusted contacts are required.",
      });
    }

    const normalizedContacts = trustedContacts.map((contact) => ({
      name: String(contact.name || "").trim(),
      phone: String(contact.phone || "").trim(),
    }));

    if (
      normalizedContacts.some((contact) => !contact.name || !contact.phone)
    ) {
      return res.status(400).json({
        success: false,
        message: "Each contact must have a name and phone number.",
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { trustedContacts: normalizedContacts },
      { new: true, runValidators: true }
    ).lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    return res.json({
      success: true,
      message: "Trusted contacts saved successfully.",
      trustedContacts: user.trustedContacts,
    });
  } catch (error) {
    console.error("Save contacts error:", error);
    return res.status(500).json({
      success: false,
      message: "Could not save trusted contacts.",
    });
  }
});

module.exports = router;