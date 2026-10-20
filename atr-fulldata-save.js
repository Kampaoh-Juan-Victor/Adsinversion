#!/usr/bin/env node
// Fetch atribución GA4 booking.kampaoh.com: last-click (sessionDefaultChannelGrouping)
// y first-touch (firstUserDefaultChannelGroup) — abr–sep 2026
const { BetaAnalyticsDataClient } = require("@google-analytics/data");
const path = require("path");
const fs   = require("fs");

const BASE = "/Users/victorarias/Documents/Ads inversión";
const PROPERTY_ID = "347358752";
const client = new BetaAnalyticsDataClient({ keyFilename: path.join(BASE, "ga4-credentials.json") });

function classifyChannel(source, medium, channel) {
  const s = (source||'').toLowerCase();
  const c = (channel||'').toLowerCase();
  if (s.includes('facebook') || s.includes('instagram') || s === 'fb' || s === 'ig' || s === 'meta') return 'Meta Ads';
  if (s.includes('tiktok') || s.includes('bytedance')) return 'TikTok Ads';
  if (s.includes('googlemybusiness') || s.includes('google_my_business')) return 'Google My Business';
  if (c === 'paid search') return 'Google Ads';
  if (c === 'cross-network') return 'Google Ads';
  if (c === 'organic search') return 'Google Orgánico';
  if (c === 'direct') return 'Directo';
  if (c === 'referral' || c === 'organic social') return 'Referral/Social';
  if (c === 'email') return 'Email';
  if (c === 'ai assistant') return 'IA (ChatGPT/Gemini)';
  if (c === 'paid social') {
    if (s.includes('tiktok')) return 'TikTok Ads';
    return 'Meta Ads'; // la mayoría de paid social es Meta
  }
  return 'Otros';
}

async function runQuery(channelDim, startDate, endDate) {
  const [res] = await client.runReport({
    property: `properties/${PROPERTY_ID}`,
    dimensions: [
      { name: "yearMonth" },
      { name: channelDim },
      { name: "sessionSource" },
      { name: "sessionMedium" },
    ],
    metrics: [{ name: "ecommercePurchases" }, { name: "purchaseRevenue" }],
    dateRanges: [{ startDate, endDate }],
    dimensionFilter: {
      filter: { fieldName: "hostName", stringFilter: { matchType: "EXACT", value: "booking.kampaoh.com" } }
    },
    orderBys: [{ dimension: { dimensionName: "yearMonth" } }],
    limit: 50000,
  });
  return res;
}

function processRows(res) {
  const byMonth = {};
  for (const row of res.rows || []) {
    const mo  = row.dimensionValues[0].value;
    const src = row.dimensionValues[2].value;
    const med = row.dimensionValues[3].value;
    const ch  = row.dimensionValues[1].value;
    const p   = parseFloat(row.metricValues[0].value) || 0;
    const r   = parseFloat(row.metricValues[1].value) || 0;
    const group = classifyChannel(src, med, ch);
    if (!byMonth[mo]) byMonth[mo] = {};
    if (!byMonth[mo][group]) byMonth[mo][group] = { p:0, r:0 };
    byMonth[mo][group].p += p;
    byMonth[mo][group].r += r;
  }
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
  const FT_START = "2025-10-01";
  const LC_START = "2026-08-01";
  const END      = "2026-09-27";

  console.log(`Fetching LAST-CLICK (sessionDefaultChannelGrouping) ${LC_START} → ${END}...`);
  const lcRaw = await runQuery("sessionDefaultChannelGrouping", LC_START, END);
  const lc = processRows(lcRaw);
  console.log(`  ${lcRaw.rows?.length || 0} filas`);

  console.log(`Fetching FIRST-TOUCH (firstUserDefaultChannelGroup) ${FT_START} → ${END}...`);
  const ftRaw = await runQuery("firstUserDefaultChannelGroup", FT_START, END);
  const ft = processRows(ftRaw);
  console.log(`  ${ftRaw.rows?.length || 0} filas`);

  // Comparativa
  console.log("\n=== Canal | First-Touch | Last-Click ===");
  const allCh = new Set([...Object.keys(ft.totals), ...Object.keys(lc.totals)]);
  [...allCh].sort((a,b)=>(ft.totals[b]?.p||0)-(ft.totals[a]?.p||0)).forEach(ch => {
    const fp = Math.round(ft.totals[ch]?.p||0);
    const fr = Math.round(ft.totals[ch]?.r||0);
    const lp = Math.round(lc.totals[ch]?.p||0);
    const lr = Math.round(lc.totals[ch]?.r||0);
    console.log(`${ch.padEnd(26)}| ${fp.toString().padStart(6)} p (${(fr/1000).toFixed(0)}k€) | ${lp.toString().padStart(6)} p (${(lr/1000).toFixed(0)}k€)`);
  });

  const totFt = Object.values(ft.totals).reduce((s,v)=>s+v.p,0);
  const totLc = Object.values(lc.totals).reduce((s,v)=>s+v.p,0);
  console.log(`\nTOTAL first-touch: ${Math.round(totFt).toLocaleString()} | last-click: ${Math.round(totLc).toLocaleString()}`);

  // Guardar
  const out = {
    firstTouch: ft,
    lastClick:  lc,
    ftMonths: Object.keys(Object.values(ft.byMonth).length ? ft.byMonth : {}).sort(),
    lcMonths: Object.keys(Object.values(lc.byMonth).length ? lc.byMonth : {}).sort(),
  };
  const dest = path.join(BASE, "atr-fulldata.json");
  fs.writeFileSync(dest, JSON.stringify(out, null, 2));
  console.log(`\n✅ Guardado: ${dest}`);
}

main().catch(console.error);
