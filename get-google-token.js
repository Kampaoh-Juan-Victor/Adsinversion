#!/usr/bin/env node
// get-google-token.js — Obtiene el refresh token de Google Ads OAuth2
// Ejecuta: node get-google-token.js
// Sigue las instrucciones en pantalla

require("dotenv").config();
const https = require("https");
const http = require("http");
const { exec } = require("child_process");

const CLIENT_ID     = process.env.GOOGLE_ADS_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_ADS_CLIENT_SECRET;
const REDIRECT_URI  = "http://localhost:8080/callback";
const SCOPE         = "https://www.googleapis.com/auth/adwords";

const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
  `client_id=${CLIENT_ID}` +
  `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
  `&response_type=code` +
  `&scope=${encodeURIComponent(SCOPE)}` +
  `&access_type=offline` +
  `&prompt=consent`;

console.log("\n=== Google Ads OAuth2 ===");
console.log("Abriendo navegador para autenticación...\n");

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost:8080");
  if (url.pathname !== "/callback") { res.end(); return; }

  const code = url.searchParams.get("code");
  if (!code) {
    res.writeHead(400); res.end("No code received");
    return;
  }

  res.writeHead(200, { "Content-Type": "text/html" });
  res.end("<h2>✅ Autorización recibida. Puedes cerrar esta ventana.</h2>");

  // Intercambiar code por tokens
  const body = new URLSearchParams({
    code,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_uri: REDIRECT_URI,
    grant_type: "authorization_code",
  }).toString();

  const postReq = https.request({
    hostname: "oauth2.googleapis.com",
    path: "/token",
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Content-Length": Buffer.byteLength(body),
    },
  }, (postRes) => {
    let data = "";
    postRes.on("data", c => data += c);
    postRes.on("end", () => {
      const tokens = JSON.parse(data);
      if (tokens.error) {
        console.error("❌ Error:", tokens.error_description || tokens.error);
        server.close(); process.exit(1);
      }
      console.log("\n✅ REFRESH TOKEN OBTENIDO:");
      console.log("────────────────────────────────────────");
      console.log(tokens.refresh_token);
      console.log("────────────────────────────────────────");
      console.log("\nAñade esta línea a tu .env:");
      console.log(`GOOGLE_ADS_REFRESH_TOKEN=${tokens.refresh_token}`);
      console.log("\nY añádela como secret en GitHub:");
      console.log("  Settings → Secrets → GOOGLE_ADS_REFRESH_TOKEN\n");
      server.close(); process.exit(0);
    });
  });
  postReq.on("error", e => { console.error("❌", e.message); server.close(); process.exit(1); });
  postReq.write(body);
  postReq.end();
});

server.listen(8080, () => {
  // Abrir navegador
  const open = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
  exec(`${open} "${authUrl}"`);
  console.log("Si no se abre automáticamente, ve a:");
  console.log(authUrl);
  console.log("\nEsperando callback en http://localhost:8080/callback...");
});
