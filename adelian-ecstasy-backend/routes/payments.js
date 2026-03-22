const router = require("express").Router();
const { Transaction, Session, Plan, User } = require("../models");
const { auth } = require("../middleware/auth");
const mtn = require("../services/mtn");
const airtel = require("../services/airtel");

// Initiate payment
router.post("/initiate", auth, async (req, res) => {
  try {
    const { planId, phone, provider } = req.body;

    if (!planId || !phone || !provider) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const plan = await Plan.findById(planId);
    if (!plan) return res.status(404).json({ error: "Plan not found" });

    const txn = await Transaction.create({
      user: req.user.id,
      plan: plan._id,
      phone,
      provider,
      amount: plan.price,
      status: "pending"
    });

    let ref;
    if (provider === "mtn") {
      ref = await mtn.requestToPay({
        phone,
        amount: plan.price,
        planName: plan.name
      });
    } else {
      ref = await airtel.requestToPay({
        phone,
        amount: plan.price,
        planName: plan.name
      });
    }

    txn.externalRef = ref;
    await txn.save();

    res.json({ internalId: txn._id, referenceId: ref });

  } catch (err) {
    console.error("Payment error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Check payment status
router.get("/status/:id", auth, async (req, res) => {
  try {
    const txn = await Transaction.findById(req.params.id).populate("plan");
    if (!txn) return res.status(404).json({ error: "Transaction not found" });

    if (txn.status === "success") {
      return res.json({ status: "success" });
    }

    if (txn.status === "failed") {
      return res.json({ status: "failed", reason: txn.failReason });
    }

    let result;

    try {
      if (txn.provider === "mtn") {
        result = await mtn.getPaymentStatus(txn.externalRef);
      } else {
        result = await airtel.getPaymentStatus(txn.externalRef);
      }
    } catch (e) {
      return res.json({ status: "pending" });
    }

    if (result.status === "SUCCESSFUL") {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + txn.plan.durationSecs * 1000);

      const session = await Session.create({
        user: txn.user,
        plan: txn.plan._id,
        phone: txn.phone,
        provider: txn.provider,
        status: "active",
        startedAt: now,
        expiresAt
      });

      txn.status = "success";
      txn.session = session._id;
      await txn.save();

      await User.findByIdAndUpdate(txn.user, {
        $inc: { totalSpent: txn.amount }
      });

      return res.json({
        status: "success",
        session: { id: session._id, expiresAt }
      });
    }

    if (result.status === "FAILED") {
      txn.status = "failed";
      txn.failReason = result.reason || "declined";
      await txn.save();

      return res.json({
        status: "failed",
        reason: txn.failReason
      });
    }

    return res.json({ status: "pending" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/mtn/callback", (req, res) => res.sendStatus(200));
router.post("/airtel/callback", (req, res) => res.sendStatus(200));

module.exports = router;