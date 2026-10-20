#!/usr/bin/env node
// ia-refresh.js — Sesiones, usuarios y reservas desde fuentes IA (GA4)
// Propiedad: booking.kampaoh.com (347358752)

const { BetaAnalyticsDataClient } = require("@google-analytics/data");
const fs   = require("fs");
const path = require("path");

const PROPERTY_ID      = "347358752";
const CREDENTIALS_PATH = path.join(__dirname, "ga4-credentials.json");

const client = new BetaAnalyticsDataClient({ keyFilename: CREDENTIALS_PATH });

const AI_SOURCES = [
  "chatgpt.com",
  "gemini.google.com",
  "copilot.microsoft.com",
  "perplexity.ai",
  "claude.ai",
  "you.com",
  "bing.com",  // Copilot también aparece como bing
];

async function main() {
  console.log("Fetching IA sessions/users/reservas desde GA4...");

  const [res] = await client.runReport({
    property: `properties/${PROPERTY_ID}`,
    dimensions: [
      { name: "yearMonth" },
      { name: "sessionSource" },
    ],
    metrics: [
      { name: "sessions" },
      { name: "totalUsers" },
      { name: "ecommercePurchases" },
      { name: "purchaseRevenue" },
    ],
    dateRanges: [{ startDate: "2026-04-01", endDate: "2026-09-26" }],
    dimensionFilter: {
      orGroup: {
        expressions: AI_SOURCES.map(src => ({
          filter: {
            fieldName: "sessionSource",
            stringFilter: { matchType: "EXACT", value: src },
          }
        }))
      }
    },
    limit: 5000,
  });

  const bySource = {};  // { "chatgpt.com": { "202605": { sessions, users, purchases, revenue }, ... } }

  for (const row of res.rows || []) {
    const ym       = row.dimensionValues[0].value; // "202605"
    const source   = row.dimensionValues[1].value;
    const sessions = parseInt(row.metricValues[0].value || 0);
    const users    = parseInt(row.metricValues[1].value || 0);
    const purchases= parseFloat(row.metricValues[2].value || 0);
    const revenue  = parseFloat(row.metricValues[3].value || 0);

    if (!bySource[source]) bySource[source] = {};
    if (!bySource[source][ym]) bySource[source][ym] = { sessions:0, users:0, purchases:0, revenue:0 };
    bySource[source][ym].sessions  += sessions;
    bySource[source][ym].users     += users;
    bySource[source][ym].purchases += purchases;
    bySource[source][ym].revenue   += revenue;
  }

  // Print summary
  const totals = { sessions:0, users:0, purchases:0, revenue:0 };
  console.log("\nPor fuente:");
  Object.entries(bySource)
    .sort((a,b) => Object.values(b[1]).reduce((s,v)=>s+v.sessions,0) - Object.values(a[1]).reduce((s,v)=>s+v.sessions,0))
    .forEach(([src, months]) => {
      const t = Object.values(months).reduce((s,v)=>({
        sessions: s.sessions+v.sessions, users: s.users+v.users,
        purchases: s.purchases+v.purchases, revenue: s.revenue+v.revenue
      }), {sessions:0,users:0,purchases:0,revenue:0});
      totals.sessions  += t.sessions;
      totals.users     += t.users;
      totals.purchases += t.purchases;
      totals.revenue   += t.revenue;
      console.log(`  ${src}: ${t.sessions.toLocaleString()} sesiones | ${t.users.toLocaleString()} usuarios | ${Math.round(t.purchases)} reservas | ${Math.round(t.revenue).toLocaleString()} €`);
    });
  console.log(`\nTOTAL IA: ${totals.sessions.toLocaleString()} sesiones | ${totals.users.toLocaleString()} usuarios | ${Math.round(totals.purchases)} reservas | ${Math.round(totals.revenue).toLocaleString()} €`);

  // Monthly totals across all AI sources
  const byMonth = {};
  Object.values(bySource).forEach(months => {
    Object.entries(months).forEach(([ym, v]) => {
      if (!byMonth[ym]) byMonth[ym] = { sessions:0, users:0, purchases:0, revenue:0 };
      byMonth[ym].sessions  += v.sessions;
      byMonth[ym].users     += v.users;
      byMonth[ym].purchases += v.purchases;
      byMonth[ym].revenue   += v.revenue;
    });
  });

  console.log("\nPor mes (totales IA):");
  Object.keys(byMonth).sort().forEach(ym => {
    const v = byMonth[ym];
    console.log(`  ${ym}: ${v.sessions.toLocaleString()} ses | ${v.users.toLocaleString()} usr | ${Math.round(v.purchases)} res | ${Math.round(v.revenue).toLocaleString()} €`);
  });

  const out = { bySource, byMonth, totals, updated: new Date().toISOString().slice(0,10) };
  const outPath = path.join(__dirname, "ia-data.json");
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(`\n✅ Guardado: ia-data.json`);
}

main().catch(e => { console.error(e); process.exit(1); });
