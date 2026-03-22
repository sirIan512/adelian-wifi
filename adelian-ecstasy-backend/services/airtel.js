const axios = require("axios");
const { v4: uuidv4 } = require("uuid");

const BASE_URL       = process.env.AIRTEL_BASE_URL;
const CLIENT_ID      = process.env.AIRTEL_CLIENT_ID;
const CLIENT_SECRET  = process.env.AIRTEL_CLIENT_SECRET;

let _token = null;
let _tokenExpiry = 0;

async function getAccessToken() {
  if (_token && Date.now() < _tokenExpiry) return _token;

  const { data } = await axios.post(
    `${BASE_URL}/auth/oauth2/token`,
    { client_id: CLIENT_ID, client_secret: CLIENT_SECRET, grant_type: "client_credentials" },
    { headers: { "Content-Type": "application/json" } }
  );
  _token = data.access_token;
  _tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
  return _token;
}

// Initiate payment collection
async function requestToPay({ phone, amount, planName, externalId }) {
  const referenceId = externalId || uuidv4();
  const token = await getAccessToken();

  const { data } = await axios.post(
    `${BASE_URL}/merchant/v2/payments/`,
    {
      reference: referenceId,
      subscriber: { country: "UG", currency: "UGX", msisdn: normalizePhone(phone) },
      transaction: { amount, country: "UG", currency: "UGX", id: referenceId },
    },
    { headers: {
        "Authorization": `Bearer ${token}`,
        "X-Country": "UG",
        "X-Currency": "UGX",
        "Content-Type": "application/json",
    }}
  );

  if (data.status?.response_code !== "DP00800001001")
    throw new Error(data.status?.message || "Airtel payment initiation failed");

  return referenceId;
}

// Poll payment status
async function getPaymentStatus(referenceId) {
  const token = await getAccessToken();
  const { data } = await axios.get(
    `${BASE_URL}/standard/v1/payments/${referenceId}`,
    { headers: {
        "Authorization": `Bearer ${token}`,
        "X-Country": "UG",
        "X-Currency": "UGX",
    }}
  );

  const code = data.data?.transaction?.status;
  // TS: Success codes vary; map to unified format
  const statusMap = { TS: "SUCCESSFUL", TF: "FAILED", TP: "PENDING" };
  return {
    status: statusMap[code] || "PENDING",
    reason: data.data?.transaction?.message || null,
    financialTransactionId: data.data?.transaction?.airtel_money_id || null,
  };
}

function normalizePhone(phone) {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("256")) return cleaned.slice(3);   // Airtel wants 07XXXXXXXX
  if (cleaned.startsWith("0")) return cleaned;
  return "0" + cleaned;
}

module.exports = { requestToPay, getPaymentStatus };
