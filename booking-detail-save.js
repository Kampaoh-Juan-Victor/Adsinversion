#!/usr/bin/env node
// Fetch sesiones booking.kampaoh.com por canal + split por idioma (lang param)
const { BetaAnalyticsDataClient } = require("@google-analytics/data");
const path = require("path");
const fs   = require("fs");

const BASE = "/Users/victorarias/Documents/Ads inversión";
const PROPERTY_ID = "347358752";
const client = new BetaAnalyticsDataClient({ keyFilename: path.join(BASE, "ga4-credentials.json") });

// Misma lógica de clasificación que es.kampaoh.com
function classifySource(source, medium, channel) {
  const s = (source||'').toLowerCase();
  const c = (channel||'').toLowerCase();
  if (s === 'ig' || s === 'fb' || s === 'meta' || s.includes('facebook') || s.includes('instagram') || s.includes('.fb.')) return 'Meta Ads';
  if (s === 'tiktok' || s.includes('tiktok') || s.includes('bytedance')) return 'TikTok Ads';
  if (c === 'paid social') return 'Paid Social (otros)';
  if (c === 'organic search') return 'Organic Search';
  if (c === 'paid search') return 'Google Ads (SEM)';
  if (c === 'cross-network') return 'Cross-network (PMax)';
  if (c === 'direct') return 'Direct';
  if (c === 'referral') return 'Referral';
  if (c === 'organic social') return 'Organic Social';
  if (c === 'email') return 'Email';
  if (c === 'ai assistant') return 'AI Assistant';
  if (s.includes('googlemybusiness') || s.includes('google_my_business')) return 'Google My Business';
  if (c === 'unassigned') return 'Unassigned';
  return channel || 'Otros';
}

async function fetchBookingByChannel(startDate, endDate) {
  const [res] = await client.runReport({
    property: `properties/${PROPERTY_ID}`,
    dimensions: [
      { name: "yearMonth" },
      { name: "sessionDefaultChannelGrouping" },
      { name: "sessionSource" },
      { name: "sessionMedium" },
    ],
    metrics: [{ name: "sessions" }],
    dateRanges: [{ startDate, endDate }],
    dimensionFilter: {
      filter: { fieldName: "hostName", stringFilter: { matchType: "EXACT", value: "booking.kampaoh.com" } }
    }
  });

  const byMonth = {};
  for (const row of res.rows || []) {
    const mo   = row.dimensionValues[0].value;
    const ch   = row.dimensionValues[1].value;
    const src  = row.dimensionValues[2].value;
    const med  = row.dimensionValues[3].value;
    const sess = parseInt(row.metricValues[0].value) || 0;
    const group = classifySource(src, med, ch);
    if (!byMonth[mo]) byMonth[mo] = {};
    byMonth[mo][group] = (byMonth[mo][group] || 0) + sess;
  }
  return byMonth;
}

// Intenta separar sesiones de booking.kampaoh.com por idioma usando pagePathPlusQueryString
async function fetchBookingByLang(startDate, endDate) {
  const langs = ['es','fr','en','pt','it'];
  const result = {};

  for (const lang of langs) {
    const [res] = await client.runReport({
      property: `properties/${PROPERTY_ID}`,
      dimensions: [{ name: "yearMonth" }],
      metrics: [{ name: "sessions" }],
      dateRanges: [{ startDate, endDate }],
      dimensionFilter: {
        andGroup: {
          expressions: [
            { filter: { fieldName: "hostName", stringFilter: { matchType: "EXACT", value: "booking.kampaoh.com" } } },
            { filter: { fieldName: "pagePathPlusQueryString", stringFilter: { matchType: "CONTAINS", value: `lang=${lang}` } } },
          ]
        }
      }
    });
    let total = 0;
    const byMonth = {};
    for (const row of res.rows || []) {
      const mo = row.dimensionValues[0].value;
      const s  = parseInt(row.metricValues[0].value) || 0;
      total += s;
      byMonth[mo] = (byMonth[mo] || 0) + s;
    }
    result[lang] = { total, byMonth };
    console.log(`  booking lang=${lang}: ${total.toLocaleString()} sesiones`);
  }
  return result;
}

async function main() {
  console.log("Fetching booking.kampaoh.com FY24-25 por canal...");
  const fy2425 = await fetchBookingByChannel("2024-10-01", "2025-09-30");

  console.log("Fetching booking.kampaoh.com FY25-26 por canal...");
  const fy2526 = await fetchBookingByChannel("2025-10-01", "2026-09-24");

  const byMonth = { ...fy2425, ...fy2526 };
  const totals = {};
  for (const v of Object.values(byMonth))
    for (const [ch, s] of Object.entries(v))
      totals[ch] = (totals[ch]||0) + s;

  // Totales por FY
  const FY2425 = Object.keys(fy2425).sort();
  const FY2526 = Object.keys(fy2526).sort();
  const tot = (months, data) => months.reduce((a,m)=>a+Object.values(data[m]||{}).reduce((x,y)=>x+y,0),0);
  const t2425 = tot(FY2425, fy2425);
  const t2526 = tot(FY2526, fy2526);
  console.log(`\nFY24-25: ${t2425.toLocaleString()} sesiones`);
  console.log(`FY25-26: ${t2526.toLocaleString()} sesiones`);
  console.log("\nCanales totales (ambos FY):");
  Object.entries(totals).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>console.log(`  ${k}: ${v.toLocaleString()}`));

  console.log("\nFetching split por idioma (lang= param) FY25-26...");
  const byLang2526 = await fetchBookingByLang("2025-10-01", "2026-09-24");
  console.log("Fetching split por idioma FY24-25...");
  const byLang2425 = await fetchBookingByLang("2024-10-01", "2025-09-30");

  const out = {
    byMonth,
    totals,
    fy2425Monthly: FY2425.reduce((o,m)=>({ ...o, [m]: Object.values(fy2425[m]||{}).reduce((a,b)=>a+b,0) }),{}),
    fy2526Monthly: FY2526.reduce((o,m)=>({ ...o, [m]: Object.values(fy2526[m]||{}).reduce((a,b)=>a+b,0) }),{}),
    byLang: { fy2425: byLang2425, fy2526: byLang2526 },
  };

  const dest = path.join(BASE, "booking-detail-data.json");
  fs.writeFileSync(dest, JSON.stringify(out, null, 2));
  console.log(`\n✅ Guardado: ${dest}`);
}

main().catch(console.error);
