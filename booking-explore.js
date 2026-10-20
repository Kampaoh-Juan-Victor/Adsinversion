#!/usr/bin/env node
// Exploración de sesiones en booking.kampaoh.com — distribución por idioma y mes
const { BetaAnalyticsDataClient } = require("@google-analytics/data");
const path = require("path");

const BASE = "/Users/victorarias/Documents/Ads inversión";
const PROPERTY_ID = "347358752";
const client = new BetaAnalyticsDataClient({ keyFilename: path.join(BASE, "ga4-credentials.json") });

async function run() {
  // 1. Total sesiones booking.kampaoh.com por mes (FY25-26)
  console.log("=== Sesiones booking.kampaoh.com FY25-26 por mes ===");
  const [r1] = await client.runReport({
    property: `properties/${PROPERTY_ID}`,
    dimensions: [{ name: "yearMonth" }],
    metrics: [{ name: "sessions" }],
    dateRanges: [{ startDate: "2025-10-01", endDate: "2026-09-24" }],
    dimensionFilter: {
      filter: { fieldName: "hostName", stringFilter: { matchType: "EXACT", value: "booking.kampaoh.com" } }
    },
    orderBys: [{ dimension: { dimensionName: "yearMonth" } }]
  });
  let totalBooking = 0;
  r1.rows?.forEach(row => {
    const s = parseInt(row.metricValues[0].value);
    totalBooking += s;
    console.log(`  ${row.dimensionValues[0].value}: ${s.toLocaleString()}`);
  });
  console.log(`  TOTAL FY25-26: ${totalBooking.toLocaleString()}`);

  // 2. Sesiones booking por landingPagePlusQueryString (ver distribución lang=XX)
  console.log("\n=== Top landing pages en booking.kampaoh.com (FY25-26) ===");
  const [r2] = await client.runReport({
    property: `properties/${PROPERTY_ID}`,
    dimensions: [{ name: "landingPagePlusQueryString" }],
    metrics: [{ name: "sessions" }],
    dateRanges: [{ startDate: "2025-10-01", endDate: "2026-09-24" }],
    dimensionFilter: {
      filter: { fieldName: "hostName", stringFilter: { matchType: "EXACT", value: "booking.kampaoh.com" } }
    },
    orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    limit: 20
  });
  r2.rows?.forEach(row => {
    console.log(`  ${row.metricValues[0].value.padStart(7)} | ${row.dimensionValues[0].value}`);
  });

  // 3. Sesiones por sessionSource / sessionMedium (¿vienen de es.kampaoh.com?)
  console.log("\n=== Top sources en booking.kampaoh.com (FY25-26) ===");
  const [r3] = await client.runReport({
    property: `properties/${PROPERTY_ID}`,
    dimensions: [{ name: "sessionSource" }, { name: "sessionMedium" }],
    metrics: [{ name: "sessions" }],
    dateRanges: [{ startDate: "2025-10-01", endDate: "2026-09-24" }],
    dimensionFilter: {
      filter: { fieldName: "hostName", stringFilter: { matchType: "EXACT", value: "booking.kampaoh.com" } }
    },
    orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    limit: 15
  });
  r3.rows?.forEach(row => {
    const s = parseInt(row.metricValues[0].value);
    console.log(`  ${s.toString().padStart(7)} | ${row.dimensionValues[0].value} / ${row.dimensionValues[1].value}`);
  });

  // 4. ¿Cuántas sesiones de es.kampaoh.com vs booking.kampaoh.com en FY25-26?
  console.log("\n=== Comparativa: es.kampaoh.com vs booking.kampaoh.com FY25-26 ===");
  const [r4] = await client.runReport({
    property: `properties/${PROPERTY_ID}`,
    dimensions: [{ name: "hostName" }],
    metrics: [{ name: "sessions" }],
    dateRanges: [{ startDate: "2025-10-01", endDate: "2026-09-24" }],
    dimensionFilter: {
      orGroup: {
        expressions: [
          { filter: { fieldName: "hostName", stringFilter: { matchType: "EXACT", value: "es.kampaoh.com" } } },
          { filter: { fieldName: "hostName", stringFilter: { matchType: "EXACT", value: "booking.kampaoh.com" } } },
          { filter: { fieldName: "hostName", stringFilter: { matchType: "EXACT", value: "fr.kampaoh.com" } } },
          { filter: { fieldName: "hostName", stringFilter: { matchType: "EXACT", value: "en.kampaoh.com" } } },
          { filter: { fieldName: "hostName", stringFilter: { matchType: "EXACT", value: "pt.kampaoh.com" } } },
          { filter: { fieldName: "hostName", stringFilter: { matchType: "EXACT", value: "it.kampaoh.com" } } },
        ]
      }
    },
    orderBys: [{ metric: { metricName: "sessions" }, desc: true }]
  });
  r4.rows?.forEach(row => {
    const s = parseInt(row.metricValues[0].value);
    console.log(`  ${s.toLocaleString().padStart(10)} | ${row.dimensionValues[0].value}`);
  });
}

run().catch(console.error);
