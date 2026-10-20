#!/usr/bin/env node
// Fetch atribución Data-Driven GA4 (booking.kampaoh.com) — compras por canal
// El modelo last-click ya está en el artifact; este script obtiene el modelo data-driven
const { BetaAnalyticsDataClient } = require("@google-analytics/data");
const path = require("path");
const fs   = require("fs");

const BASE = "/Users/victorarias/Documents/Ads inversión";
const PROPERTY_ID = "347358752";
const client = new BetaAnalyticsDataClient({ keyFilename: path.join(BASE, "ga4-credentials.json") });

// Mismo clasificador de canales que en atribución last-click
const CHANNEL_MAP = {
  "organic search": "Google Orgánico",
  "paid search":    "Google Ads",
  "cross-network":  "Google Ads",
  "direct":         "Directo",
  "referral":       "Referral/Social",
  "organic social": "Referral/Social",
  "email":          "Email",
  "ai assistant":   "IA (ChatGPT/Gemini)",
};
function classifyForAtr(source, medium, channel) {
  const s = (source||'').toLowerCase();
  const c = (channel||'').toLowerCase();
  if (s === 'ig' || s === 'fb' || s === 'meta' || s.includes('facebook') || s.includes('instagram')) return 'Meta Ads';
  if (s === 'tiktok' || s.includes('tiktok')) return 'TikTok Ads';
  if (s.includes('googlemybusiness') || s.includes('google_my_business')) return 'Google My Business';
  return CHANNEL_MAP[c] || 'Orgánico otros';
}

async function fetchDataDriven(startDate, endDate) {
  const [res] = await client.runReport({
    property: `properties/${PROPERTY_ID}`,
    dimensions: [
      { name: "yearMonth" },
      { name: "sessionDefaultChannelGrouping" },
      { name: "sessionSource" },
      { name: "sessionMedium" },
    ],
    metrics: [
      { name: "purchases" },
      { name: "purchaseRevenue" },
    ],
    dateRanges: [{ startDate, endDate }],
    dimensionFilter: {
      filter: { fieldName: "hostName", stringFilter: { matchType: "EXACT", value: "booking.kampaoh.com" } }
    },
    // Data-driven attribution model
    attributionSettings: {
      reportingAttributionModel: "REPORTING_ATTRIBUTION_MODEL_DATA_DRIVEN"
    }
  });
  return res;
}

async function fetchLastClick(startDate, endDate) {
  const [res] = await client.runReport({
    property: `properties/${PROPERTY_ID}`,
    dimensions: [
      { name: "yearMonth" },
      { name: "sessionDefaultChannelGrouping" },
      { name: "sessionSource" },
      { name: "sessionMedium" },
    ],
    metrics: [
      { name: "purchases" },
      { name: "purchaseRevenue" },
    ],
    dateRanges: [{ startDate, endDate }],
    dimensionFilter: {
      filter: { fieldName: "hostName", stringFilter: { matchType: "EXACT", value: "booking.kampaoh.com" } }
    }
    // No attributionSettings = last-click (GA4 default)
  });
  return res;
}

function processRows(res) {
  const byMonth = {};
  for (const row of res.rows || []) {
    const mo  = row.dimensionValues[0].value;
    const ch  = row.dimensionValues[1].value;
    const src = row.dimensionValues[2].value;
    const med = row.dimensionValues[3].value;
    const p   = parseFloat(row.metricValues[0].value) || 0;
    const r   = parseFloat(row.metricValues[1].value) || 0;
    const group = classifyForAtr(src, med, ch);
    if (!byMonth[mo]) byMonth[mo] = {};
    if (!byMonth[mo][group]) byMonth[mo][group] = { p:0, r:0 };
    byMonth[mo][group].p += p;
    byMonth[mo][group].r += r;
  }
  // Totales
  const totals = {};
  for (const v of Object.values(byMonth))
    for (const [ch, d] of Object.entries(v)) {
      if (!totals[ch]) totals[ch] = { p:0, r:0 };
      totals[ch].p += d.p;
      totals[ch].r += d.r;
    }
  return { byMonth, totals };
}

async function main() {
  // Fecha completa disponible: abr 2026 – sep 2026
  const START = "2026-04-01";
  const END   = "2026-09-24";

  console.log("Fetching DATA-DRIVEN attribution...");
  let ddRes;
  try {
    ddRes = await fetchDataDriven(START, END);
    console.log(`  Filas recibidas: ${ddRes.rows?.length || 0}`);
  } catch(e) {
    console.error("  ERROR data-driven:", e.message);
    console.log("  → Intentando sin attributionSettings (fallback last-click)...");
    ddRes = (await fetchLastClick(START, END));
  }

  console.log("Fetching LAST-CLICK attribution (UTMs: abr–sep 26)...");
  const lcRes = await fetchLastClick(START, END);
  console.log(`  Filas recibidas: ${lcRes.rows?.length || 0}`);

  const dd = processRows(ddRes);
  const lc = processRows(lcRes);

  // Resumen comparativo
  console.log("\n=== COMPARATIVA por canal (abr–sep 2026) ===");
  console.log("Canal                         | Data-Driven   | Last-Click");
  const allChannels = new Set([...Object.keys(dd.totals), ...Object.keys(lc.totals)]);
  [...allChannels].sort((a,b)=>(dd.totals[b]?.p||0)-(dd.totals[a]?.p||0)).forEach(ch => {
    const dp = Math.round(dd.totals[ch]?.p||0);
    const lp = Math.round(lc.totals[ch]?.p||0);
    console.log(`${ch.padEnd(30)}| ${dp.toString().padStart(8)} compras | ${lp.toString().padStart(8)} compras`);
  });

  const totalDD = Object.values(dd.totals).reduce((s,v)=>s+v.p,0);
  const totalLC = Object.values(lc.totals).reduce((s,v)=>s+v.p,0);
  console.log(`\nTotal compras DD: ${Math.round(totalDD).toLocaleString()} | LC: ${Math.round(totalLC).toLocaleString()}`);

  const out = { dataDriven: dd, lastClick: lc };
  const dest = path.join(BASE, "atr-datadriven-data.json");
  fs.writeFileSync(dest, JSON.stringify(out, null, 2));
  console.log(`\n✅ Guardado: ${dest}`);
}

main().catch(console.error);
