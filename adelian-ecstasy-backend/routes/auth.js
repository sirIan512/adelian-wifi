const router = require("express").Router();
const jwt = require("jsonwebtoken");
const { User } = require("../models");
const { auth } = require("../middleware/auth");

const sign = (id) => jwt.sign({ id }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: process.env.JWT_EXPIRES_IN || "7d" });

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    if (!name || !email || !phone || !password)
      return res.status(400).json({ error: "All fields required" });
    if (await User.findOne({ email }))
      return res.status(409).json({ error: "Email already registered" });
    const user = await User.create({ name, email, phone, password });
    const token = sign(user._id);
    res.status(201).json({ token, user: { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password required" });
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ error: "Invalid credentials" });
    if (!user.isActive) return res.status(403).json({ error: "Account suspended" });
    const token = sign(user._id);
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/auth/me
router.get("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;