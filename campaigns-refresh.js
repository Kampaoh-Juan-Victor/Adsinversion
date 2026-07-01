#!/usr/bin/env node
// campaigns-refresh.js — Actualiza campaigns-data.json (datos de campañas Meta + Google)
// Uso:
//   node campaigns-refresh.js              → último día
//   node campaigns-refresh.js --date=2026-05-20

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const DIR = path.dirname(__filename);
const DATA_PATH = path.join(DIR, "campaigns-data.json");
const TMP_PATH = path.join(DIR, "campaigns-data-tmp.json");

function yesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

const args = process.argv.slice(2);
const dateArg = (args.find(a => a.startsWith("--date=")) || "").split("=")[1];
const dateStr = dateArg || yesterday();

console.log("🔄 Actualizando campaigns-data.json para " + dateStr + "...");
console.log("📅 " + new Date().toLocaleString("es-ES"));

const PROMPT = `
Consulta Porter para datos de campañas del día ${dateStr}.

Meta Ads España (act_2068744546681151) + Francia (act_3652417178310478):
Campos: facebook_ads_date, facebook_ads_campaign_name, facebook_ads_spend, facebook_ads_reach, facebook_ads_impressions, facebook_ads_clicks

Google Ads (4052984517-4052984517):
Campos: date, google_ads_campaign_name, google_ads_cost_micros, google_ads_conversions, google_ads_conversion_value, google_ads_impressions, google_ads_clicks

Filtro Google: Excluye campañas que contengan "PMAX"

Output JSON en ${TMP_PATH}:
{
  "v": 1,
  "updated": "${dateStr}",
  "cols": {
    "m": ["n","s","pu","rch","imp","clk"],
    "g": ["n","s","cv","rv","imp","clk"]
  },
  "days": {
    "${dateStr}": {
      "m": [
        ["Nombre campaña Meta", 123.45, 10, 500, 1200, 80],
        ...
      ],
      "g": [
        ["Nombre campaña Google", 45.00, 5, 1500.0, 800, 40],
        ...
      ]
    }
  }
}

Columnas Meta (m): n=nombre, s=spend, pu=reach (pureach), rch=reach (por claridad), imp=impressions, clk=clicks
Columnas Google (g): n=nombre, s=spend, cv=conversions, rv=conversion_value, imp=impressions, clk=clicks

Nota: google_ads_cost_micros ya viene en euros desde Porter (no dividir).
`.trim();

try {
  if (fs.existsSync(TMP_PATH)) fs.unlinkSync(TMP_PATH);

  execSync(
    `claude -p "${PROMPT.replace(/"/g, '\\"').replace(/\n/g, ' ')}" --allowedTools "mcp__claude_ai_Portermetrics__query_data,Write,Read"`,
    { stdio: "inherit", cwd: DIR }
  );

  if (!fs.existsSync(TMP_PATH)) {
    console.error("❌ Claude no generó campaigns-data-tmp.json");
    process.exit(1);
  }

  const tmpData = JSON.parse(fs.readFileSync(TMP_PATH, "utf8"));

  let data = {
    v: 1,
    updated: "",
    cols: {
      m: ["n", "s", "pu", "rch", "imp", "clk"],
      g: ["n", "s", "cv", "rv", "imp", "clk"]
    },
    days: {}
  };

  if (fs.existsSync(DATA_PATH)) {
    try { data = JSON.parse(fs.readFileSync(DATA_PATH, "utf8")); } catch(e) {}
  }
  if (!data.days) data.days = {};

  Object.assign(data.days, tmpData.days || {});
  data.updated = dateStr;

  fs.writeFileSync(DATA_PATH, JSON.stringify(data), "utf8");
  fs.unlinkSync(TMP_PATH);

  console.log("✅ campaigns-data.json actualizado");
  console.log("   Última actualización: " + data.updated);
} catch(e) {
  console.error("❌ Error:", e.message);
  process.exit(1);
}
