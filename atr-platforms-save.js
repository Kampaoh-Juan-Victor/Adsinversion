#!/usr/bin/env node
// Fetch conversiones auto-atribuidas por Meta, Google Ads y TikTok (abr–sep 2026)
// Comparar con lo que GA4 asigna a cada plataforma

const path = require("path");
const fs   = require("fs");

const BASE = "/Users/victorarias/Documents/Ads inversión";

// ──────────────────────────────────────────────
// META ADS: compras y revenue atribuidas por Meta
// ──────────────────────────────────────────────
async function fetchMeta() {
  const meta = JSON.parse(fs.readFileSync(path.join(BASE, "meta-credentials.json")));
  const AD_ACCOUNT = meta.ad_account_id;
  const TOKEN = meta.access_token;

  const months = [
    ["2026-04-01","2026-04-30"],
    ["2026-05-01","2026-05-31"],
    ["2026-06-01","2026-06-30"],
    ["2026-07-01","2026-07-31"],
    ["2026-08-01","2026-08-31"],
    ["2026-09-01","2026-09-24"],
  ];

  const byMonth = {};
  let totalPurchases = 0, totalRevenue = 0;

  for (const [start, end] of months) {
    const yearMonth = start.replace(/-/g,'').slice(0,6);
    const url = `https://graph.facebook.com/v19.0/${AD_ACCOUNT}/insights?` +
      `fields=spend,actions,action_values&` +
      `time_range={"since":"${start}","until":"${end}"}&` +
      `action_attribution_windows=["7d_click","1d_view"]&` +
      `access_token=${TOKEN}`;

    const res = await fetch(url);
    const data = await res.json();
    if (data.error) { console.error("Meta error:", data.error); continue; }

    const row = data.data?.[0] || {};
    const actions = row.actions || [];
    const actionValues = row.action_values || [];

    const purAction = actions.find(a => a.action_type === 'purchase' || a.action_type === 'offsite_conversion.fb_pixel_purchase');
    const revAction = actionValues.find(a => a.action_type === 'purchase' || a.action_type === 'offsite_conversion.fb_pixel_purchase');

    const p = parseFloat(purAction?.value || 0);
    const r = parseFloat(revAction?.value || 0);
    byMonth[yearMonth] = { p, r };
    totalPurchases += p;
    totalRevenue += r;
    console.log(`  Meta ${yearMonth}: ${Math.round(p)} compras | ${Math.round(r)} €`);
  }

  return { byMonth, totals: { p: totalPurchases, r: totalRevenue } };
}

// ──────────────────────────────────────────────
// GOOGLE ADS: conversiones atribuidas por Google
// ──────────────────────────────────────────────
async function fetchGoogle() {
  const { GoogleAdsApi } = require("google-ads-api");
  const gCreds = JSON.parse(fs.readFileSync(path.join(BASE, "google-credentials.json")));

  const client = new GoogleAdsApi({
    client_id: gCreds.client_id,
    client_secret: gCreds.client_secret,
    developer_token: gCreds.developer_token,
  });

  const customer = client.Customer({
    customer_id: gCreds.customer_id,
    refresh_token: gCreds.refresh_token,
  });

  const query = `
    SELECT
      segments.year,
      segments.month,
      metrics.conversions,
      metrics.conversions_value,
      metrics.cost_micros
    FROM campaign
    WHERE segments.date BETWEEN '2026-04-01' AND '2026-09-24'
    ORDER BY segments.year, segments.month
  `;

  const rows = await customer.query(query);
  const byMonth = {};
  for (const row of rows) {
    const y = row.segments.year;
    const m = String(row.segments.month).padStart(2,'0');
    const ym = `${y}${m}`;
    if (!byMonth[ym]) byMonth[ym] = { p:0, r:0 };
    byMonth[ym].p += row.metrics.conversions || 0;
    byMonth[ym].r += (row.metrics.conversions_value || 0);
  }

  const totals = Object.values(byMonth).reduce((a,v)=>({ p:a.p+v.p, r:a.r+v.r }),{p:0,r:0});
  for (const [ym, v] of Object.entries(byMonth))
    console.log(`  Google ${ym}: ${Math.round(v.p)} conv | ${Math.round(v.r)} €`);

  return { byMonth, totals };
}

// ──────────────────────────────────────────────
// TIKTOK ADS: conversiones atribuidas por TikTok
// ──────────────────────────────────────────────
async function fetchTikTok() {
  const ttCreds = JSON.parse(fs.readFileSync(path.join(BASE, "tiktok-credentials.json")));
  const ADVERTISER_ID = ttCreds.advertiser_id;
  const TOKEN = ttCreds.access_token;

  const months = [
    ["2026-04-01","2026-04-30"],
    ["2026-05-01","2026-05-31"],
    ["2026-06-01","2026-06-30"],
    ["2026-07-01","2026-07-31"],
    ["2026-08-01","2026-08-31"],
    ["2026-09-01","2026-09-24"],
  ];

  const byMonth = {};
  let totalPurchases = 0, totalRevenue = 0;

  for (const [start, end] of months) {
    const yearMonth = start.replace(/-/g,'').slice(0,6);
    const url = `https://business-api.tiktok.com/open_api/v1.3/report/integrated/get/?` +
      `advertiser_id=${ADVERTISER_ID}&` +
      `report_type=BASIC&` +
      `data_level=AUCTION_ADVERTISER&` +
      `dimensions=["stat_time_day"]&` +
      `metrics=["complete_payment","value_per_complete_payment"]&` +
      `start_date=${start}&end_date=${end}&` +
      `page_size=50`;

    const res = await fetch(url, {
      headers: { 'Access-Token': TOKEN }
    });
    const data = await res.json();
    if (data.code !== 0) { console.error("TikTok error:", data.message); continue; }

    const rows = data.data?.list || [];
    let monthP = 0, monthR = 0;
    for (const row of rows) {
      monthP += parseFloat(row.metrics?.complete_payment || 0);
      const vpp = parseFloat(row.metrics?.value_per_complete_payment || 0);
      monthR += vpp * parseFloat(row.metrics?.complete_payment || 0);
    }
    byMonth[yearMonth] = { p: monthP, r: monthR };
    totalPurchases += monthP;
    totalRevenue += monthR;
    console.log(`  TikTok ${yearMonth}: ${Math.round(monthP)} compras | ${Math.round(monthR)} €`);
  }

  return { byMonth, totals: { p: totalPurchases, r: totalRevenue } };
}

async function main() {
  const results = {};

  console.log("\n=== META ADS ===");
  try { results.meta = await fetchMeta(); }
  catch(e) { console.error("Meta ERROR:", e.message); results.meta = null; }

  console.log("\n=== GOOGLE ADS ===");
  try { results.google = await fetchGoogle(); }
  catch(e) { console.error("Google ERROR:", e.message); results.google = null; }

  console.log("\n=== TIKTOK ADS ===");
  try { results.tiktok = await fetchTikTok(); }
  catch(e) { console.error("TikTok ERROR:", e.message); results.tiktok = null; }

  console.log("\n=== RESUMEN ===");
  for (const [plat, d] of Object.entries(results)) {
    if (d) console.log(`${plat.padEnd(10)}: ${Math.round(d.totals.p).toLocaleString()} compras | ${Math.round(d.totals.r/1000)}k€`);
    else console.log(`${plat.padEnd(10)}: ERROR (sin datos)`);
  }

  const dest = path.join(BASE, "atr-platforms-data.json");
  fs.writeFileSync(dest, JSON.stringify(results, null, 2));
  console.log(`\n✅ Guardado: ${dest}`);
}

main().catch(console.error);
