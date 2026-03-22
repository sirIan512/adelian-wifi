const axios = require("axios");
const { v4: uuidv4 } = require("uuid");

const BASE_URL = process.env.MTN_MOMO_BASE_URL;
const SUB_KEY = process.env.MTN_SUBSCRIPTION_KEY;
const API_USER = process.env.MTN_API_USER;
const API_KEY = process.env.MTN_API_KEY;

async function getAccessToken() {
  const credentials = Buffer.from(API_USER+":"+API_KEY).toString("base64");
  const { data } = await axios.post(BASE_URL+"/collection/token/", {}, {
    headers: { "Authorization": "Basic "+credentials, "Ocp-Apim-Subscription-Key": SUB_KEY }
  });
  return data.access_token;
}

async function requestToPay({ phone, amount, planName }) {
  const referenceId = uuidv4();
  const token = await getAccessToken();
  await axios.post(BASE_URL+"/collection/v1_0/requesttopay", {
    amount: "500",
    currency: "EUR",
    externalId: uuidv4(),
    payer: { partyIdType: "MSISDN", partyId: "46733123454" },
    payerMessage: "Adelian Ecstasy WiFi - "+planName,
    payeeNote: "WiFi payment"
  }, {
    headers: {
      "Authorization": "Bearer "+token,
      "X-Reference-Id": referenceId,
      "X-Target-Environment": "sandbox",
      "Ocp-Apim-Subscription-Key": SUB_KEY,
      "Content-Type": "application/json"
    }
  });
  return referenceId;
}

async function getPaymentStatus(referenceId) {
  const token = await getAccessToken();
  const { data } = await axios.get(BASE_URL+"/collection/v1_0/requesttopay/"+referenceId, {
    headers: {
      "Authorization": "Bearer "+token,
      "X-Target-Environment": "sandbox",
      "Ocp-Apim-Subscription-Key": SUB_KEY
    }
  });
  return { status: data.status, reason: data.reason || null, financialTransactionId: data.financialTransactionId };
}

module.exports = { requestToPay, getPaymentStatus };

