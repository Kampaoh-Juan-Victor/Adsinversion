const { BetaAnalyticsDataClient } = require("@google-analytics/data");
const path = require("path");
const client = new BetaAnalyticsDataClient({ keyFilename: path.join(__dirname, "ga4-credentials.json") });

(async () => {
  // 1. Resumen por canal (todos los ítems)
  console.log("\n=== Por source/medium (últimos 30 días) ===");
  const [r1] = await client.runReport({
    property: "properties/347358752",
    dimensions: [{ name: "sessionSource" }, { name: "sessionMedium" }],
    metrics: [{ name: "itemsPurchased" }, { name: "itemRevenue" }],
    dateRanges: [{ startDate: "2026-06-20", endDate: "2026-07-19" }],
    orderBys: [{ metric: { metricName: "itemsPurchased" }, desc: true }],
    limit: 20,
  });
  (r1.rows||[]).forEach(row => {
    const [src, med] = row.dimensionValues.map(v => v.value);
    const [purch, rev] = row.metricValues.map(v => parseFloat(v.value));
    console.log(`  ${(src+'/'+med).padEnd(30)} | x${purch.toString().padStart(4)} | €${rev.toFixed(0).padStart(8)}`);
  });

  // 2. Por itemName con canal — para ver si "item" = propiedad de Kampaoh
  console.log("\n=== Items más comprados con canal ===");
  const [r2] = await client.runReport({
    property: "properties/347358752",
    dimensions: [{ name: "itemName" }, { name: "sessionSource" }, { name: "sessionMedium" }],
    metrics: [{ name: "itemsPurchased" }, { name: "itemRevenue" }],
    dateRanges: [{ startDate: "2026-06-20", endDate: "2026-07-19" }],
    orderBys: [{ metric: { metricName: "itemsPurchased" }, desc: true }],
    limit: 30,
  });
  (r2.rows||[]).forEach(row => {
    const [item, src, med] = row.dimensionValues.map(v => v.value);
    const [purch, rev] = row.metricValues.map(v => parseFloat(v.value));
    if (purch >= 3) console.log(`  ${(src+'/'+med).padEnd(22)} | ${item.slice(0,30).padEnd(30)} | x${purch} €${rev.toFixed(0)}`);
  });
})().catch(e => console.error("❌", e.message));
