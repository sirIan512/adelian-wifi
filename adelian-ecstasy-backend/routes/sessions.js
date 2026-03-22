const router = require("express").Router();
const { Session } = require("../models");
const { auth } = require("../middleware/auth");

// GET /api/sessions/active  — get current user's active session
router.get("/active", auth, async (req, res) => {
  try {
    const session = await Session.findOne({ user: req.user._id, status: "active" })
      .populate("plan")
      .sort({ startedAt: -1 });
    res.json({ session: session || null });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/sessions/history  — current user's past sessions
router.get("/history", auth, async (req, res) => {
  try {
    const sessions = await Session.find({ user: req.user._id })
      .populate("plan")
      .sort({ startedAt: -1 })
      .limit(20);
    res.json(sessions);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
