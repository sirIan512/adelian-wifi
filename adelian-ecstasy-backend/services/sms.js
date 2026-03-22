const axios = require("axios");
const qs = require("querystring");

const API_KEY  = process.env.AT_API_KEY;
const USERNAME = process.env.AT_USERNAME;
const SENDER   = process.env.AT_SENDER_ID || "AdelianWiFi";

const BASE_URL = USERNAME === "sandbox"
  ? "https://api.sandbox.africastalking.com/version1/messaging"
  : "https://api.africastalking.com/version1/messaging";

async function sendSMS(phone, message) {
  if (!API_KEY || !USERNAME) {
    console.warn("⚠️  SMS not configured — skipping");
    return null;
  }
  try {
    const { data } = await axios.post(
      BASE_URL,
      qs.stringify({ username: USERNAME, to: formatPhone(phone), message, from: SENDER }),
      { headers: {
          "apiKey": API_KEY,
          "Accept": "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
      }}
    );
    console.log("📱 SMS sent:", data);
    return data;
  } catch (err) {
    console.error("SMS error:", err.response?.data || err.message);
    return null;
  }
}

// ─── SMS Templates ────────────────────────────────────────────────────────────

function smsPaymentSuccess({ name, planName, duration, data, expiresAt, txnId }) {
  return `Hi ${name}! ✅ Payment confirmed. Your Adelian Ecstasy WiFi (${planName} - ${data}) is now ACTIVE until ${fmtDate(expiresAt)}. Txn: ${txnId}. Enjoy browsing!`;
}

function smsSessionExpiring({ name, planName, minsLeft }) {
  return `Hi ${name}, your Adelian Ecstasy WiFi (${planName}) expires in ${minsLeft} minutes. Visit the portal to renew. Thank you!`;
}

function smsSessionExpired({ name, planName }) {
  return `Hi ${name}, your Adelian Ecstasy WiFi session (${planName}) has expired. Visit the portal to buy a new plan. Thank you!`;
}

function formatPhone(phone) {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("256")) return "+" + cleaned;
  if (cleaned.startsWith("0")) return "+256" + cleaned.slice(1);
  return "+256" + cleaned;
}

function fmtDate(d) {
  return new Date(d).toLocaleString("en-UG", { dateStyle: "short", timeStyle: "short" });
}

module.exports = { sendSMS, smsPaymentSuccess, smsSessionExpiring, smsSessionExpired };
