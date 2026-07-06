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

  // ── 1. Item-level ecommerce metrics ─────────────────────────────
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

  // ── 2. Event counts for funnel steps without item-level metrics ──
  const eventsByDate = {};
  try {
    const [evResp] = await client.runReport({
      property: `properties/${PROPERTY_ID}`,
      dimensions: [{ name: "date" }, { name: "eventName" }],
      metrics: [{ name: "eventCount" }],
      dimensionFilter: {
        orGroup: {
          expressions: [
            { filter: { fieldName: "eventName", stringFilter: { matchType: "EXACT", value: "view_room" } } },
            { filter: { fieldName: "eventName", stringFilter: { matchType: "EXACT", value: "begin_checkout" } } },
            { filter: { fieldName: "eventName", stringFilter: { matchType: "EXACT", value: "view_checkout_step2" } } },
            { filter: { fieldName: "eventName", stringFilter: { matchType: "EXACT", value: "view_checkout_step3" } } },
            { filter: { fieldName: "eventName", stringFilter: { matchType: "EXACT", value: "add_payment_info" } } },
            { filter: { fieldName: "eventName", stringFilter: { matchType: "EXACT", value: "purchase" } } },
          ],
        },
      },
      dateRanges: [{ startDate: dateFrom, endDate: dateTo }],
    });
    for (const row of evResp.rows || []) {
      const dateNum = parseInt(row.dimensionValues[0].value);
      const evName  = row.dimensionValues[1].value;
      const count   = parseInt(row.metricValues[0].value) || 0;
      if (!eventsByDate[dateNum]) eventsByDate[dateNum] = {};
      eventsByDate[dateNum][evName] = count;
    }
    console.log(`  ✅ GA4 eventos — ${Object.keys(eventsByDate).length} días con datos`);
  } catch(e) {
    console.warn(`  ⚠ GA4 eventos query skipped: ${e.message}`);
  }

  // ── 3. Merge with existing ───────────────────────────────────────
  let existing = { updated: "", rows: [], events: {} };
  if (fs.existsSync(GA4_PATH)) {
    try { existing = JSON.parse(fs.readFileSync(GA4_PATH, "utf8")); } catch(e) {}
  }
  if (!Array.isArray(existing.rows)) existing.rows = [];
  if (!existing.events || typeof existing.events !== "object") existing.events = {};

  const fromNum = parseInt(dateFrom.replace(/-/g, ""));
  const toNum   = parseInt(dateTo.replace(/-/g, ""));
  existing.rows = existing.rows.filter(r => r[0] < fromNum || r[0] > toNum);
  existing.rows.push(...rows);
  existing.rows.sort((a, b) => a[0] - b[0]);

  for (const k of Object.keys(existing.events)) {
    const num = parseInt(k);
    if (num >= fromNum && num <= toNum) delete existing.events[k];
  }
  for (const [dateNum, evData] of Object.entries(eventsByDate)) {
    existing.events[dateNum] = evData;
  }

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
