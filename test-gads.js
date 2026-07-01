#!/usr/bin/env node
require("dotenv").config();
const https = require("https");

const DEVELOPER_TOKEN = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
const OAUTH_CLIENT_ID = process.env.GOOGLE_ADS_CLIENT_ID;
const OAUTH_SECRET    = process.env.GOOGLE_ADS_CLIENT_SECRET;
const REFRESH_TOKEN   = process.env.GOOGLE_ADS_REFRESH_TOKEN;

async function getAccessToken() {
  const body = new URLSearchParams({
    client_id: OAUTH_CLIENT_ID,
    client_secret: OAUTH_SECRET,
    refresh_token: REFRESH_TOKEN,
    grant_type: "refresh_token",
  }).toString();

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: "oauth2.googleapis.com",
      path: "/token",
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "Content-Length": Buffer.byteLength(body) },
    }, (res) => {
      let d = "";
      res.on("data", c => d += c);
      res.on("end", () => {
        const json = JSON.parse(d);
        if (json.error) reject(new Error(json.error_description));
        else resolve(json.access_token);
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  const accessToken = await getAccessToken();
  console.log("✅ Access token OK\n");

  // Probar con fetch nativo (Node 18+)
  const versions = ["v19", "v20", "v21", "v22", "v23"];
  for (const v of versions) {
    const url = `https://googleads.googleapis.com/${v}/customers:listAccessibleCustomers`;
    console.log(`Probando ${v}...`);
    const res = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "developer-token": DEVELOPER_TOKEN,
      }
    });
    const text = await res.text();
    console.log(`  Status: ${res.status}`);
    console.log(`  Response: ${text.slice(0, 300)}\n`);
  }
}

main().catch(e => console.error("❌", e.message));
