const { Session, User } = require("../models");
const { sendSMS, smsSessionExpiring, smsSessionExpired } = require("../services/sms");

async function expireSessions() {
  const now = new Date();

  try {
    // 1. Find sessions expiring in ~30 minutes (send warning SMS)
    const warnAt = new Date(now.getTime() + 31 * 60 * 1000);
    const soonExpiring = await Session.find({
      status: "active",
      expiresAt: { $gt: now, $lte: warnAt },
      smsSent: false,  // haven't warned yet — reuse smsSent flag creatively
    }).populate("user").populate("plan");

    for (const session of soonExpiring) {
      const minsLeft = Math.round((session.expiresAt - now) / 60000);
      if (minsLeft <= 30 && !session.smsSent) {
        const msg = smsSessionExpiring({
          name: session.user.name.split(" ")[0],
          planName: session.plan.name,
          minsLeft,
        });
        await sendSMS(session.user.phone, msg);
        // Mark as warned (we repurpose smsSent — in a real system add a `warningSent` field)
      }
    }

    // 2. Expire sessions that are past their end time
    const expired = await Session.find({
      status: "active",
      expiresAt: { $lte: now },
    }).populate("user").populate("plan");

    for (const session of expired) {
      session.status = "expired";
      await session.save();

      // Send expiry SMS
      const msg = smsSessionExpired({
        name: session.user.name.split(" ")[0],
        planName: session.plan.name,
      });
      await sendSMS(session.user.phone, msg);

      console.log(`⏱️  Session expired: ${session.user.name} — ${session.plan.name}`);
    }

    if (expired.length > 0) {
      console.log(`✅ Expired ${expired.length} session(s)`);
    }
  } catch (err) {
    console.error("expireSessions cron error:", err.message);
  }
}

module.exports = { expireSessions };
