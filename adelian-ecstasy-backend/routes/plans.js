const router = require("express").Router();
const { Plan } = require("../models");
const { auth, adminOnly } = require("../middleware/auth");

// GET /api/plans  — public, returns active plans
router.get("/", async (req, res) => {
  try {
    const plans = await Plan.find({ isActive: true }).sort("price");
    res.json(plans);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/plans/all  — admin only, all plans
router.get("/all", auth, adminOnly, async (req, res) => {
  try {
    const plans = await Plan.find().sort("price");
    res.json(plans);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/plans  — admin create
router.post("/", auth, adminOnly, async (req, res) => {
  try {
    const { name, duration, durationSecs, data, dataLimitMB, speed, price, color } = req.body;
    if (!name || !duration || !durationSecs || !data || !dataLimitMB || !speed || !price)
      return res.status(400).json({ error: "All plan fields required" });

    const plan = await Plan.create({ name, duration, durationSecs, data, dataLimitMB, speed, price, color });
    res.status(201).json(plan);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/plans/:id  — admin update
router.put("/:id", auth, adminOnly, async (req, res) => {
  try {
    const plan = await Plan.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!plan) return res.status(404).json({ error: "Plan not found" });
    res.json(plan);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/plans/:id  — admin soft-delete
router.delete("/:id", auth, adminOnly, async (req, res) => {
  try {
    const plan = await Plan.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!plan) return res.status(404).json({ error: "Plan not found" });
    res.json({ message: "Plan deactivated" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
