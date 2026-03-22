require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cron = require("node-cron");

const authRoutes = require("./routes/auth");
const planRoutes = require("./routes/plans");
const paymentRoutes = require("./routes/payments");
const sessionRoutes = require("./routes/sessions");
const adminRoutes = require("./routes/admin");
const { expireSessions } = require("./jobs/expireSessions");

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/plans", planRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/admin", adminRoutes);

app.get("/api/health", (req, res) => res.json({ status: "ok", time: new Date() }));

// MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => { console.error("❌ MongoDB error:", err); process.exit(1); });

// Cron: check for expired sessions every minute
cron.schedule("* * * * *", expireSessions);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
