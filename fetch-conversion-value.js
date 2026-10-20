#!/usr/bin/env node
// fetch-conversion-value.js — Obtiene valor de conversión (€) de Meta y TikTok
// por mes para Oct 2024–Sep 2025 y Oct 2025–Sep 2026

require("dotenv").config();
const https = require("https");
const fs    = require("fs");
const path  = require("path");

// ── Helpers ──────────────────────────────────────────────────────────────────

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let buf = "";
      res.on("data", d => buf += d);
      res.on("end", () => {
        try { resolve(JSON.parse(buf)); }
        catch(e) { reject(new Error("JSON parse error: " + buf.slice(0, 200))); }
      });
    }).on("error", reject);
  });
}

function tiktokGet(params) {
  const qs = new URLSearchParams(params).toString();
  const url = `https://business-api.tiktok.com/open_api/v1.3/report/integrated/get/?${qs}`;
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: "business-api.tiktok.com",
      path: `/open_api/v1.3/report/integrated/get/?${qs}`,
      headers: { "Access-Token": process.env.TIKTOK_ACCESS_TOKEN },
    };
    https.get(opts, res => {
      let buf = "";
      res.on("data", d => buf += d);
      res.on("end", () => {
        try { resolve(JSON.parse(buf)); }
        catch(e) { reject(new Error("TikTok JSON: " + buf.slice(0, 200))); }
      });
    }).on("error", reject);
  });
}

// ── Meta ─────────────────────────────────────────────────────────────────────

async function fetchMetaMonth(from, to) {
  const token    = process.env.META_ACCESS_TOKEN;
  const account  = process.env.META_AD_ACCOUNT_ID;
  const params   = new URLSearchParams({
    time_range:   JSON.stringify({ since: from, until: to }),
    fields:       "spend,action_values",
    level:        "account",
    access_token: token,
  });
  const url = `https://graph.facebook.com/v21.0/act_${account}/insights?${params}`;
  const res = await get(url);
  if (res.error) throw new Error("Meta: " + res.error.message);
  const row = (res.data || [])[0];
  if (!row) return { spend: 0, value: 0 };
  const spend = parseFloat(row.spend || 0);
  const value = (row.action_values || [])
    .filter(a => a.action_type === "purchase")
    .reduce((s, a) => s + parseFloat(a.value || 0), 0);
  return { spend, value };
}

// ── TikTok ───────────────────────────────────────────────────────────────────

async function fetchTikTokMonth(from, to) {
  const res = await tiktokGet({
    advertiser_id:  process.env.TIKTOK_ADVERTISER_ID,
    report_type:    "BASIC",
    data_level:     "AUCTION_ADVERTISER",
    dimensions:     JSON.stringify(["stat_time_day"]),
    metrics:        JSON.stringify(["spend", "complete_payment_roas"]),
    start_date:     from,
    end_date:       to,
    page_size:      1000,
  });
  const rows = (res.data && res.data.list) || [];
  let spend = 0, roas_sum = 0, roas_days = 0;
  for (const r of rows) {
    const s = parseFloat(r.metrics.spend || 0);
    const roas = parseFloat(r.metrics.complete_payment_roas || 0);
    spend += s;
    if (roas > 0) { roas_sum += roas * s; roas_days += s; } // weighted avg by spend
  }
  const avg_roas = roas_days > 0 ? roas_sum / roas_days : 0;
  const value = spend * avg_roas;
  return { spend, value, roas: avg_roas };
}

// ── Google (ya lo tenemos en gads-data.json) ─────────────────────────────────

function getGoogleData(from, to) {
  const rows = require("./gads-data.json").rows;
  // from/to: "YYYY-MM-DD"
  const fromNum = from.replace(/-/g, "");
  const toNum   = to.replace(/-/g, "");
  let spend = 0, value = 0;
  for (const r of rows) {
    const d = String(r.date);
    if (d < fromNum || d > toNum) continue;
    spend += parseFloat(r.spend || 0);
    value += parseFloat(r.conversions_value || 0);
  }
  return { spend, value };
}

// ── Períodos mensuales ────────────────────────────────────────────────────────

function monthRange(year, month) {
  const from = `${year}-${String(month).padStart(2,"0")}-01`;
  const d = new Date(year, month, 0); // último día del mes
  const to = `${year}-${String(month).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  return { from, to };
}

// Oct 2024–Sep 2025 y Oct 2025–Sep 2026
const periods = [
  ...Array.from({length:3},(_,i) => ({ year:2024, month:10+i })), // Oct-Dic 2024
  ...Array.from({length:9},(_,i) => ({ year:2025, month:1+i  })), // Ene-Sep 2025
  ...Array.from({length:3},(_,i) => ({ year:2025, month:10+i })), // Oct-Dic 2025
  ...Array.from({length:9},(_,i) => ({ year:2026, month:1+i  })), // Ene-Sep 2026
];

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Fetching conversion values...\n");

  const results = {};

  for (const { year, month } of periods) {
    const { from, to } = monthRange(year, month);
    const key = `${year}-${String(month).padStart(2,"0")}`;

    process.stdout.write(`  ${key}  Meta...`);
    const meta = await fetchMetaMonth(from, to).catch(e => { console.error(e.message); return {spend:0,value:0}; });
    process.stdout.write(` ✓  TikTok...`);
    const tiktok = await fetchTikTokMonth(from, to).catch(e => { console.error(e.message); return {spend:0,value:0}; });
    const google = getGoogleData(from, to);
    process.stdout.write(` ✓  Google local ✓\n`);

    results[key] = { meta, google, tiktok };
  }

  // Imprimir tabla
  console.log("\n=== COSTE TOTAL ===");
  console.log("Mes        |   Meta €  |  Google € |  TikTok € |   Total €");
  for (const [k, v] of Object.entries(results)) {
    const total = v.meta.spend + v.google.spend + v.tiktok.spend;
    console.log(`${k}  | ${fmt(v.meta.spend)} | ${fmt(v.google.spend)} | ${fmt(v.tiktok.spend)} | ${fmt(total)}`);
  }

  console.log("\n=== VALOR CONVERSIÓN (€) ===");
  console.log("Mes        |   Meta €  |  Google € |  TikTok € |   Total €");
  for (const [k, v] of Object.entries(results)) {
    const total = v.meta.value + v.google.value + v.tiktok.value;
    console.log(`${k}  | ${fmt(v.meta.value)} | ${fmt(v.google.value)} | ${fmt(v.tiktok.value)} | ${fmt(total)}`);
  }

  console.log("\n=== ROI ===");
  console.log("Mes        |   Meta    |  Google   |  TikTok   |  Total");
  for (const [k, v] of Object.entries(results)) {
    const totalSpend = v.meta.spend + v.google.spend + v.tiktok.spend;
    const totalValue = v.meta.value + v.google.value + v.tiktok.value;
    const roi = (p, s) => s > 0 ? (p/s).toFixed(1) : "—";
    console.log(`${k}  | ×${roi(v.meta.value,v.meta.spend).padEnd(7)}| ×${roi(v.google.value,v.google.spend).padEnd(7)}| ×${roi(v.tiktok.value,v.tiktok.spend).padEnd(7)}| ×${roi(totalValue,totalSpend)}`);
  }

  // Totales por período
  const p1 = Object.entries(results).filter(([k]) => k >= "2024-10" && k <= "2025-09");
  const p2 = Object.entries(results).filter(([k]) => k >= "2025-10" && k <= "2026-09");
  const sumPeriod = (rows) => rows.reduce((acc, [, v]) => ({
    spend: { meta: acc.spend.meta+v.meta.spend, google: acc.spend.google+v.google.spend, tiktok: acc.spend.tiktok+v.tiktok.spend },
    value: { meta: acc.value.meta+v.meta.value, google: acc.value.google+v.google.value, tiktok: acc.value.tiktok+v.tiktok.value },
  }), { spend:{meta:0,google:0,tiktok:0}, value:{meta:0,google:0,tiktok:0} });

  const s1 = sumPeriod(p1);
  const s2 = sumPeriod(p2);

  console.log("\n=== RESUMEN PERÍODO ===");
  console.log("                     Oct24-Sep25      Oct25-Sep26      YoY%");
  const pct = (a,b) => b>0 ? ((a/b-1)*100).toFixed(1)+"%" : "—";

  for (const plat of ["meta","google","tiktok"]) {
    const sp1 = s1.spend[plat], sp2 = s2.spend[plat];
    const sv1 = s1.value[plat], sv2 = s2.value[plat];
    const roi1 = sp1>0 ? (sv1/sp1).toFixed(1) : "—";
    const roi2 = sp2>0 ? (sv2/sp2).toFixed(1) : "—";
    console.log(`\n${plat.toUpperCase()}`);
    console.log(`  Coste:          ${fmt(sp1).padEnd(16)} ${fmt(sp2).padEnd(16)} ${pct(sp2,sp1)}`);
    console.log(`  Val.Conv:       ${fmt(sv1).padEnd(16)} ${fmt(sv2).padEnd(16)} ${pct(sv2,sv1)}`);
    console.log(`  ROI:            ×${roi1.padEnd(15)} ×${roi2.padEnd(15)}`);
  }

  const ts1s = s1.spend.meta+s1.spend.google+s1.spend.tiktok;
  const ts2s = s2.spend.meta+s2.spend.google+s2.spend.tiktok;
  const ts1v = s1.value.meta+s1.value.google+s1.value.tiktok;
  const ts2v = s2.value.meta+s2.value.google+s2.value.tiktok;
  console.log(`\nTOTAL`);
  console.log(`  Coste:          ${fmt(ts1s).padEnd(16)} ${fmt(ts2s).padEnd(16)} ${pct(ts2s,ts1s)}`);
  console.log(`  Val.Conv:       ${fmt(ts1v).padEnd(16)} ${fmt(ts2v).padEnd(16)} ${pct(ts2v,ts1v)}`);
  console.log(`  ROI:            ×${(ts1v/ts1s).toFixed(1).padEnd(15)} ×${(ts2v/ts2s).toFixed(1)}`);

  // Guardar JSON por si acaso
  fs.writeFileSync(path.join(__dirname, "conversion-value-data.json"), JSON.stringify({ updated: new Date().toISOString().slice(0,10), results }, null, 2));
  console.log("\n✅ Guardado en conversion-value-data.json");
}

const fmt = n => n.toLocaleString("es-ES", {minimumFractionDigits:0, maximumFractionDigits:0}).padStart(9);

main().catch(e => { console.error("❌", e.message); process.exit(1); });
