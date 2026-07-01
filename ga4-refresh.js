#!/usr/bin/env node
// ga4-refresh.js — Obtiene datos de GA4 via Google Analytics Data API
// Uso:
//   node ga4-refresh.js                              → últimos 7 días
//   node ga4-refresh.js --from=2026-06-01 --to=2026-06-18

const { BetaAnalyticsDataClient } = require("@google-analytics/data");
const fs = require("fs");
const path = require("path");

const PROPERTY_ID = "347358752";
const GA4_PATH = path.join(__dirname, "ga4-data.json");
const CREDENTIALS_PATH = path.join(__dirname, "ga4-credentials.json");

const client = new BetaAnalyticsDataClient({ keyFilename: CREDENTIALS_PATH });

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

async function refreshGA4(dateFrom, dateTo) {
  console.log(`  Fetching GA4 ${dateFrom} → ${dateTo}...`);

  const [response] = await client.runReport({
    property: `properties/${PROPERTY_ID}`,
    dimensions: [{ name: "date" }, { name: "itemName" }],
    metrics: [
      { name: "itemsViewed" },
      { name: "itemsAddedToCart" },
      { name: "itemsCheckedOut" },
      { name: "itemsPurchased" },
    ],
    dateRanges: [{ startDate: dateFrom, endDate: dateTo }],
  });

  const rows = [];
  for (const row of response.rows || []) {
    const dateNum  = parseInt(row.dimensionValues[0].value);
    const itemName = row.dimensionValues[1].value.replace(/\(.*$/, "").trim();
    const views     = parseInt(row.metricValues[0].value) || 0;
    const cart      = parseInt(row.metricValues[1].value) || 0;
    const checkout  = parseInt(row.metricValues[2].value) || 0;
    const purchases = parseInt(row.metricValues[3].value) || 0;
    if (views === 0) continue;
    rows.push([dateNum, itemName, views, cart, checkout, purchases]);
  }

  let existing = { updated: "", rows: [] };
  if (fs.existsSync(GA4_PATH)) {
    try { existing = JSON.parse(fs.readFileSync(GA4_PATH, "utf8")); } catch(e) {}
  }
  if (!Array.isArray(existing.rows)) existing.rows = [];

  const fromNum = parseInt(dateFrom.replace(/-/g, ""));
  const toNum   = parseInt(dateTo.replace(/-/g, ""));
  existing.rows = existing.rows.filter(r => r[0] < fromNum || r[0] > toNum);
  existing.rows.push(...rows);
  existing.rows.sort((a, b) => a[0] - b[0]);
  existing.updated = dateTo;

  fs.writeFileSync(GA4_PATH, JSON.stringify(existing), "utf8");
  console.log(`  ✅ GA4 OK — ${rows.length} filas`);
}

async function main() {
  const args = process.argv.slice(2);
  const fromArg = args.find(a => a.startsWith("--from="));
  const toArg   = args.find(a => a.startsWith("--to="));
  const dateFrom = fromArg ? fromArg.split("=")[1] : daysAgo(7);
  const dateTo   = toArg   ? toArg.split("=")[1]   : daysAgo(0);
  await refreshGA4(dateFrom, dateTo);
}

main().catch(e => { console.error("❌ GA4 error:", e.message); process.exit(1); });
