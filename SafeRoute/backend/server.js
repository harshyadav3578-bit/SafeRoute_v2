require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const policeRoutes = require("./routes/police");
const authRoutes = require("./routes/auth");
const safetyRoutes = require("./routes/safety");
const incidentRoutes = require("./routes/incidents");
const userProfileRoutes = require("./routes/userProfile");
const sosRoutes = require("./routes/sos");
const aiRoutes = require("./routes/ai");
const routeSafetyRoutes = require("./routes/routeSafety");

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

const MONGO_URI =
  process.env.MONGO_URI || "mongodb://127.0.0.1:27017/saferoute";

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

app.get("/", (req, res) => {
  res.json({ message: "SafeRoute backend is running" });
});

app.use("/api/police", policeRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/safety", safetyRoutes);
app.use("/api/incidents", incidentRoutes);
app.use("/api/users", userProfileRoutes);
app.use("/api/sos", sosRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/route-safety", routeSafetyRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});