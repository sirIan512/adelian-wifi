const router = require("express").Router();
const { User, Session, Transaction, Plan } = require("../models");
const { auth, adminOnly } = require("../middleware/auth");

// All admin routes require auth + admin role
router.use(auth, adminOnly);

// GET /api/admin/stats
router.get("/stats", async (req, res) => {
  try {
    const [totalUsers, activeSessions, totalTxns, revResult] = await Promise.all([
      User.countDocuments({ role: "user" }),
      Session.countDocuments({ status: "active" }),
      Transaction.countDocuments({ status: "success" }),
      Transaction.aggregate([{ $match: { status: "success" } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
    ]);
    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
    const todayRev = await Transaction.aggregate([
      { $match: { status: "success", createdAt: { $gte: todayStart } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    res.json({
      totalUsers,
      activeSessions,
      totalTransactions: totalTxns,
      totalRevenue: revResult[0]?.total || 0,
      todayRevenue: todayRev[0]?.total || 0,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/admin/users
router.get("/users", async (req, res) => {
  try {
    const users = await User.find({ role: "user" }).select("-password").sort({ createdAt: -1 });
    // Enrich with active session info
    const enriched = await Promise.all(users.map(async (u) => {
      const session = await Session.findOne({ user: u._id, status: "active" }).populate("plan");
      return { ...u.toObject(), activeSession: session || null };
    }));
    res.json(enriched);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/admin/users/:id/toggle
router.put("/users/:id/toggle", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    user.isActive = !user.isActive;
    await user.save();
    // If suspending, also expire active sessions
    if (!user.isActive) {
      await Session.updateMany({ user: user._id, status: "active" }, { status: "suspended" });
    }
    res.json({ isActive: user.isActive });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/admin/transactions
router.get("/transactions", async (req, res) => {
  try {
    const txns = await Transaction.find()
      .populate("user", "name email phone")
      .populate("plan", "name price")
      .sort({ createdAt: -1 })
      .limit(100);
    res.json(txns);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/admin/sessions
router.get("/sessions", async (req, res) => {
  try {
    const sessions = await Session.find({ status: "active" })
      .populate("user", "name email phone")
      .populate("plan", "name duration data speed")
      .sort({ startedAt: -1 });
    res.json(sessions);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/admin/sessions/:id  — force-expire a session
router.delete("/sessions/:id", async (req, res) => {
  try {
    await Session.findByIdAndUpdate(req.params.id, { status: "suspended" });
    res.json({ message: "Session terminated" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
