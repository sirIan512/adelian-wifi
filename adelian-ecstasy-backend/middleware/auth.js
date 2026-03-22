const jwt = require("jsonwebtoken");
const auth = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Access token required" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");
    req.user = { _id: decoded.id, id: decoded.id, role: decoded.role };
    next();
  } catch (error) {
    return res.status(403).json({ error: "Invalid or expired token" });
  }
};
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    return res.status(403).json({ error: "Admin access required" });
  }
};
module.exports = { auth, adminOnly };