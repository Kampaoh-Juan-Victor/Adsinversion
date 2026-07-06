#!/usr/bin/env node
// Script de diagnóstico — ejecutar y pegar el output
const { BetaAnalyticsDataClient } = require("@google-analytics/data");
const path = require("path");

const client = new BetaAnalyticsDataClient({
  keyFilename: path.join(__dirname, "ga4-credentials.json"),
});

const OPTS = { timeout: 30000 };

(async () => {
  // Test 1: query más simple posible
  console.log("Test 1: query simple sin filtros...");
  try {
    const [r] = await client.runReport({
      property: "properties/347358752",
      dimensions: [{ name: "date" }],
      metrics:    [{ name: "eventCount" }],
      dateRanges: [{ startDate: "2026-07-01", endDate: "2026-07-03" }],
      limit: 5,
    }, OPTS);
    console.log("✅ OK:", r.rows?.length, "filas, total eventos:", r.rows?.reduce((s,x)=>s+parseInt(x.metricValues[0].value),0));
  } catch(e) {
    console.error("❌ Error test 1:", e.message);
  }

  // Test 2: filtro booking.kampaoh.com sin filtro de eventName
  console.log("\nTest 2: filtro pageLocation booking.kampaoh.com/search (sin eventName)...");
  try {
    const [r] = await client.runReport({
      property: "properties/347358752",
      dimensions: [{ name: "pageLocation" }, { name: "date" }],
      metrics:    [{ name: "eventCount" }],
      dimensionFilter: {
        filter: { fieldName: "pageLocation", stringFilter: { matchType: "CONTAINS", value: "booking.kampaoh.com/search?" } },
      },
      dateRanges: [{ startDate: "2026-07-01", endDate: "2026-07-03" }],
      limit: 5,
    }, OPTS);
    console.log("✅ OK:", r.rows?.length, "filas");
  } catch(e) {
    console.error("❌ Error test 2:", e.message);
  }

  // Test 3: mismo filtro con eventName (la query completa)
  console.log("\nTest 3: filtro booking.kampaoh.com/search con eventName=page_view...");
  try {
    const [r] = await client.runReport({
      property: "properties/347358752",
      dimensions: [{ name: "pageLocation" }, { name: "date" }],
      metrics:    [{ name: "eventCount" }],
      dimensionFilter: {
        andGroup: { expressions: [
          { filter: { fieldName: "eventName",    stringFilter: { matchType: "EXACT",    value: "page_view" } } },
          { filter: { fieldName: "pageLocation", stringFilter: { matchType: "CONTAINS", value: "booking.kampaoh.com/search?" } } },
        ]},
      },
      dateRanges: [{ startDate: "2026-07-01", endDate: "2026-07-03" }],
      limit: 5,
    }, OPTS);
    console.log("✅ OK:", r.rows?.length, "filas");
    if (r.rows?.length) console.log("  Ejemplo:", r.rows[0].dimensionValues[0].value);
  } catch(e) {
    console.error("❌ Error test 3:", e.message);
  }

  console.log("\nDiagnóstico completado.");
})();
