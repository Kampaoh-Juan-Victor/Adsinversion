#!/usr/bin/env node
// users-by-channel-refresh.js — Usuarios únicos por canal (es.kampaoh.com)
// Misma propiedad y dimensión que sessionsByMonth del artifact

const { BetaAnalyticsDataClient } = require("@google-analytics/data");
const fs   = require("fs");
const path = require("path");

const PROPERTY_ID      = "347358752";
const CREDENTIALS_PATH = path.join(__dirname, "ga4-credentials.json");
const client = new BetaAnalyticsDataClient({ keyFilename: CREDENTIALS_PATH });

async function main() {
  console.log("Fetching usuarios únicos por canal y mes desde GA4...");

  const [res] = await client.runReport({
    property: `properties/${PROPERTY_ID}`,
    dimensions: [
      { name: "yearMonth" },
      { name: "sessionDefaultChannelGrouping" },
    ],
    metrics: [{ name: "totalUsers" }],
    dateRanges: [{ startDate: "2024-10-01", endDate: "2026-09-26" }],
    dimensionFilter: {
      filter: {
        fieldName: "hostname",
        stringFilter: { matchType: "EXACT", value: "es.kampaoh.com" },
      }
    },
    limit: 10000,
  });

  const byMonth = {};
  for (const row of res.rows || []) {
    const ym      = row.dimensionValues[0].value;
    const channel = row.dimensionValues[1].value;
    const users   = parseInt(row.metricValues[0].value || 0);
    if (!byMonth[ym]) byMonth[ym] = {};
    byMonth[ym][channel] = (byMonth[ym][channel] || 0) + users;
  }

  // Print summary
  const months = Object.keys(byMonth).sort();
  months.forEach(ym => {
    const total = Object.values(byMonth[ym]).reduce((s,v)=>s+v,0);
    console.log(`  ${ym}: ${total.toLocaleString()} usuarios únicos`);
  });

  fs.writeFileSync(path.join(__dirname, "users-by-channel.json"), JSON.stringify({ byMonth, updated: new Date().toISOString().slice(0,10) }, null, 2));
  console.log("\n✅ Guardado: users-by-channel.json");
}

main().catch(e => { console.error(e); process.exit(1); });
