const { BetaAnalyticsDataClient } = require("@google-analytics/data");
const { BetaAnalyticsDataClient: BetaClient } = require("@google-analytics/data");
const path = require("path");

const client = new BetaAnalyticsDataClient({ keyFilename: path.join(__dirname, "ga4-credentials.json") });

(async () => {
  // Buscar si hay custom params de UTM en el evento purchase
  console.log("=== Parámetros del evento purchase (últimos 7 días) ===");
  try {
    const [r] = await client.runReport({
      property: "properties/347358752",
      dimensions: [
        { name: "eventName" },
        { name: "customEvent:utm_source" },
        { name: "customEvent:utm_medium" },
        { name: "customEvent:utm_campaign" },
      ],
      metrics: [{ name: "eventCount" }],
      dimensionFilter: {
        filter: { fieldName: "eventName", stringFilter: { matchType: "EXACT", value: "purchase" } }
      },
      dateRanges: [{ startDate: "2026-07-13", endDate: "2026-07-19" }],
      limit: 20,
    });
    console.log("filas:", r.rows?.length);
    (r.rows||[]).forEach(row => {
      const [ev, src, med, camp] = row.dimensionValues.map(v => v.value);
      const n = row.metricValues[0].value;
      console.log(`  ${src}/${med} | ${camp} | x${n}`);
    });
  } catch(e) {
    console.error("❌ custom params:", e.message);
  }

  // También probar con page_location en el evento purchase
  console.log("\n=== pageLocation en evento purchase ===");
  try {
    const [r2] = await client.runReport({
      property: "properties/347358752",
      dimensions: [
        { name: "eventName" },
        { name: "pageLocation" },
      ],
      metrics: [{ name: "eventCount" }],
      dimensionFilter: {
        filter: { fieldName: "eventName", stringFilter: { matchType: "EXACT", value: "purchase" } }
      },
      dateRanges: [{ startDate: "2026-07-18", endDate: "2026-07-19" }],
      limit: 10,
    });
    (r2.rows||[]).forEach(row => {
      const [ev, loc] = row.dimensionValues.map(v => v.value);
      console.log(" ", loc.slice(0,120));
    });
  } catch(e) {
    console.error("❌ pageLocation:", e.message);
  }
})();
