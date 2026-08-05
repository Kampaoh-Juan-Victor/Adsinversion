#!/usr/bin/env node
// atribucion-refresh.js — Atribución de reservas desde GA4
//
// session_rows  [date, item, source, medium, campaign, campaign_id, purchases, revenue]
//   → sessionSource/sessionMedium del evento purchase (atribución por sesión)
//
// lastclick_rows [date, item, source, medium, campaign, term, content, count]
//   → UTMs extraídas de pageLocation del evento begin_checkout (último clic real)
//   → Disponible con datos fiables desde 2026-07-20 (fecha de implementación UTMs)
//
// Uso:
//   node atribucion-refresh.js                         → últimos 30 días
//   node atribucion-refresh.js --from=2026-06-01 --to=2026-06-30

const { BetaAnalyticsDataClient } = require("@google-analytics/data");
const fs   = require("fs");
const path = require("path");

const PROPERTY_ID      = "347358752";
const CREDENTIALS_PATH = path.join(__dirname, "ga4-credentials.json");
const DATA_PATH        = path.join(__dirname, "atribucion-data.json");

const client = new BetaAnalyticsDataClient({ keyFilename: CREDENTIALS_PATH });

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function parseUtms(url) {
  try {
    const u = new URL(url);
    return {
      source:   u.searchParams.get("utm_source")   || "(none)",
      medium:   u.searchParams.get("utm_medium")   || "(none)",
      campaign: u.searchParams.get("utm_campaign") || "(none)",
      term:     u.searchParams.get("utm_term")     || "",
      content:  u.searchParams.get("utm_content")  || "",
    };
  } catch(e) {
    return { source: "(none)", medium: "(none)", campaign: "(none)", term: "", content: "" };
  }
}

async function refresh(dateFrom, dateTo) {
  console.log(`  Fetching atribución GA4 ${dateFrom} → ${dateTo}...`);

  // ── 0. Lookup campaignId → campaignName (GA4 a veces devuelve el ID en sessionCampaignName) ──
  const [r0] = await client.runReport({
    property: `properties/${PROPERTY_ID}`,
    dimensions: [
      { name: "sessionCampaignId" },
      { name: "sessionCampaignName" },
    ],
    metrics: [{ name: "sessions" }],
    dateRanges: [{ startDate: "2024-01-01", endDate: dateTo }],
    limit: 10000,
  });
  const campIdToName = {};
  for (const row of r0.rows || []) {
    const id   = row.dimensionValues[0].value;
    const name = row.dimensionValues[1].value;
    if (id && name && !/^\d+$/.test(name) && name !== "(not set)") {
      campIdToName[id] = name;
    }
  }
  console.log(`  ✅ campaign lookup — ${Object.keys(campIdToName).length} entradas`);

  // ── 1. Atribución por sesión (purchase + sessionSource/Medium) ───────────
  const [r1] = await client.runReport({
    property: `properties/${PROPERTY_ID}`,
    dimensions: [
      { name: "date" },
      { name: "itemName" },
      { name: "sessionSource" },
      { name: "sessionMedium" },
      { name: "sessionCampaignName" },
      { name: "sessionCampaignId" },
    ],
    metrics: [
      { name: "itemsPurchased" },
      { name: "itemRevenue" },
    ],
    dateRanges: [{ startDate: dateFrom, endDate: dateTo }],
    orderBys: [{ dimension: { dimensionName: "date" } }],
    limit: 100000,
  });

  const sessionRows = [];
  for (const row of r1.rows || []) {
    const date       = parseInt(row.dimensionValues[0].value);
    const item       = row.dimensionValues[1].value.trim();
    const source     = row.dimensionValues[2].value;
    const medium     = row.dimensionValues[3].value;
    const campaignRaw = row.dimensionValues[4].value;
    const campaignId  = row.dimensionValues[5].value;
    const campaign    = /^\d+$/.test(campaignRaw) ? (campIdToName[campaignRaw] || campIdToName[campaignId] || campaignRaw) : campaignRaw;
    const purchases  = parseFloat(row.metricValues[0].value) || 0;
    const revenue    = parseFloat(row.metricValues[1].value) || 0;
    if (purchases === 0) continue;
    sessionRows.push([date, item, source, medium, campaign, campaignId, purchases, revenue]);
  }
  console.log(`  ✅ session — ${sessionRows.length} filas`);

  // ── 2. Último clic (begin_checkout + pageLocation con UTMs) ─────────────
  const [r2] = await client.runReport({
    property: `properties/${PROPERTY_ID}`,
    dimensions: [
      { name: "date" },
      { name: "itemName" },
      { name: "pageLocation" },
    ],
    metrics: [{ name: "activeUsers" }],
    dimensionFilter: {
      andGroup: { expressions: [
        { filter: { fieldName: "eventName",    stringFilter: { matchType: "EXACT",    value: "begin_checkout" } } },
        { filter: { fieldName: "pageLocation", stringFilter: { matchType: "CONTAINS", value: "utm_source"     } } },
      ]},
    },
    dateRanges: [{ startDate: dateFrom, endDate: dateTo }],
    orderBys: [{ dimension: { dimensionName: "date" } }],
    limit: 100000,
  });

  const lastClickRows = [];
  for (const row of r2.rows || []) {
    const date   = parseInt(row.dimensionValues[0].value);
    const item   = row.dimensionValues[1].value.trim();
    const loc    = row.dimensionValues[2].value;
    const count  = parseFloat(row.metricValues[0].value) || 0;
    if (count === 0) continue;
    const utms = parseUtms(loc);
    lastClickRows.push([date, item, utms.source, utms.medium, utms.campaign, utms.term, utms.content, count]);
  }
  console.log(`  ✅ last-click — ${lastClickRows.length} filas`);

  // ── 3. Transacciones individuales (purchase + transactionId) ────────────
  const [r3] = await client.runReport({
    property: `properties/${PROPERTY_ID}`,
    dimensions: [
      { name: "date" },
      { name: "itemName" },
      { name: "transactionId" },
      { name: "sessionSource" },
      { name: "sessionMedium" },
      { name: "sessionCampaignName" },
      { name: "sessionCampaignId" },
    ],
    metrics: [{ name: "itemRevenue" }],
    dateRanges: [{ startDate: dateFrom, endDate: dateTo }],
    orderBys: [{ dimension: { dimensionName: "date" }, desc: true }],
    limit: 100000,
  });

  const txRows = [];
  for (const row of r3.rows || []) {
    const date       = parseInt(row.dimensionValues[0].value);
    const item       = row.dimensionValues[1].value.trim();
    const txId       = row.dimensionValues[2].value;
    const source     = row.dimensionValues[3].value;
    const medium     = row.dimensionValues[4].value;
    const campaignRaw = row.dimensionValues[5].value;
    const campaignId  = row.dimensionValues[6].value;
    const campaign    = /^\d+$/.test(campaignRaw) ? (campIdToName[campaignRaw] || campIdToName[campaignId] || campaignRaw) : campaignRaw;
    const revenue    = parseFloat(row.metricValues[0].value) || 0;
    if (!txId || txId === "(not set)") continue;
    txRows.push([date, item, source, medium, campaign, campaignId, txId, revenue]);
  }
  console.log(`  ✅ tx — ${txRows.length} filas`);

  // ── Merge con datos existentes ───────────────────────────────────────────
  let existing = {
    updated: "",
    utm_live_from: "2026-07-20",
    session_cols:    ["date","item","source","medium","campaign","campaign_id","purchases","revenue"],
    lastclick_cols:  ["date","item","source","medium","campaign","term","content","count"],
    tx_cols:         ["date","item","source","medium","campaign","campaign_id","transaction_id","revenue"],
    rows:            [],
    lastclick_rows:  [],
    tx_rows:         [],
    campaign_lookup: {},
  };
  if (fs.existsSync(DATA_PATH)) {
    try { existing = Object.assign(existing, JSON.parse(fs.readFileSync(DATA_PATH, "utf8"))); } catch(e) {}
  }
  if (!Array.isArray(existing.rows))           existing.rows = [];
  if (!Array.isArray(existing.lastclick_rows)) existing.lastclick_rows = [];
  if (!Array.isArray(existing.tx_rows))        existing.tx_rows = [];
  if (typeof existing.campaign_lookup !== 'object') existing.campaign_lookup = {};
  Object.assign(existing.campaign_lookup, campIdToName);

  const fromNum = parseInt(dateFrom.replace(/-/g, ""));
  const toNum   = parseInt(dateTo.replace(/-/g, ""));

  existing.rows = existing.rows.filter(r => r[0] < fromNum || r[0] > toNum);
  existing.rows.push(...sessionRows);
  existing.rows.sort((a, b) => a[0] - b[0]);

  existing.lastclick_rows = existing.lastclick_rows.filter(r => r[0] < fromNum || r[0] > toNum);
  existing.lastclick_rows.push(...lastClickRows);
  existing.lastclick_rows.sort((a, b) => a[0] - b[0]);

  existing.tx_rows = existing.tx_rows.filter(r => r[0] < fromNum || r[0] > toNum);
  existing.tx_rows.push(...txRows);
  existing.tx_rows.sort((a, b) => b[0] - a[0]); // más reciente primero

  existing.updated = dateTo;

  fs.writeFileSync(DATA_PATH, JSON.stringify(existing), "utf8");
  console.log(`  ✅ atribucion-data.json guardado`);
}

async function main() {
  const args     = process.argv.slice(2);
  const fromArg  = args.find(a => a.startsWith("--from="));
  const toArg    = args.find(a => a.startsWith("--to="));
  const dateFrom = fromArg ? fromArg.split("=")[1] : daysAgo(30);
  const dateTo   = toArg   ? toArg.split("=")[1]   : daysAgo(0);
  await refresh(dateFrom, dateTo);
}

main().catch(e => { console.error("❌ atribucion error:", e.message); process.exit(1); });
