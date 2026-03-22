const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// ─── User ──────────────────────────────────────────────────────────────────────
const userSchema = new mongoose.Schema({
  name:      { type: String, required: true, trim: true },
  email:     { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone:     { type: String, required: true, trim: true },
  password:  { type: String, required: true },
  role:      { type: String, enum: ["user", "admin"], default: "user" },
  isActive:  { type: Boolean, default: true },
  macAddress:{ type: String, default: null },   // set when device first connects
  totalSpent:{ type: Number, default: 0 },
}, { timestamps: true });

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});
userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};
const User = mongoose.model("User", userSchema);

// ─── Plan ──────────────────────────────────────────────────────────────────────
const planSchema = new mongoose.Schema({
  name:         { type: String, required: true },
  duration:     { type: String, required: true },        // display label e.g. "24 Hours"
  durationSecs: { type: Number, required: true },        // in seconds
  data:         { type: String, required: true },        // display label e.g. "2 GB"
  dataLimitMB:  { type: Number, required: true },        // actual limit for enforcement
  speed:        { type: String, required: true },        // display label e.g. "10 Mbps"
  price:        { type: Number, required: true },        // UGX
  color:        { type: String, default: "#00d4ff" },
  isActive:     { type: Boolean, default: true },
}, { timestamps: true });
const Plan = mongoose.model("Plan", planSchema);

// ─── Session ───────────────────────────────────────────────────────────────────
const sessionSchema = new mongoose.Schema({
  user:        { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  plan:        { type: mongoose.Schema.Types.ObjectId, ref: "Plan", required: true },
  phone:       { type: String, required: true },           // phone used for payment
  provider:    { type: String, enum: ["mtn", "airtel"], required: true },
  status:      { type: String, enum: ["active", "expired", "suspended"], default: "active" },
  startedAt:   { type: Date, default: Date.now },
  expiresAt:   { type: Date, required: true },
  dataUsedMB:  { type: Number, default: 0 },
  macAddress:  { type: String, default: null },
  smsSent:     { type: Boolean, default: false },
}, { timestamps: true });
const Session = mongoose.model("Session", sessionSchema);

// ─── Transaction ───────────────────────────────────────────────────────────────
const txnSchema = new mongoose.Schema({
  user:        { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  plan:        { type: mongoose.Schema.Types.ObjectId, ref: "Plan", required: true },
  session:     { type: mongoose.Schema.Types.ObjectId, ref: "Session", default: null },
  phone:       { type: String, required: true },
  provider:    { type: String, enum: ["mtn", "airtel"], required: true },
  amount:      { type: Number, required: true },
  status:      { type: String, enum: ["pending", "success", "failed"], default: "pending" },
  externalRef: { type: String, default: null },   // MTN/Airtel transaction reference
  txnId:       { type: String, unique: true },    // our internal ID
  failReason:  { type: String, default: null },
}, { timestamps: true });

txnSchema.pre("save", function (next) {
  if (!this.txnId) this.txnId = "TXN" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2,5).toUpperCase();
  next();
});
const Transaction = mongoose.model("Transaction", txnSchema);

module.exports = { User, Plan, Session, Transaction };
