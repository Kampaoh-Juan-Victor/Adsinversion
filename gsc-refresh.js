#!/usr/bin/env node
// gsc-refresh.js — Google Search Console data
// Uso: node gsc-refresh.js
//      node gsc-refresh.js --to=2026-07-02

const { GoogleAuth } = require("google-auth-library");
const fs   = require("fs");
const path = require("path");

const SITE_URL   = "https://es.kampaoh.com/";
const DATA_PATH  = path.join(__dirname, "gsc-data.json");
const CREDS_PATH = path.join(__dirname, "ga4-credentials.json");

const auth = new GoogleAuth({
  keyFile: CREDS_PATH,
  scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
});

function isoAddDays(iso, n) {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

async function gscQuery(token, body) {
  const url = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE_URL)}/searchAnalytics/query`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`GSC HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

function mapQueries(res) {
  return (res.rows || []).map(r => ({
    query:       r.keys[0],
    clicks:      r.clicks,
    impressions: r.impressions,
    ctr:         parseFloat((r.ctr * 100).toFixed(1)),
    position:    parseFloat(r.position.toFixed(1)),
  }));
}

function mapPages(res) {
  return (res.rows || []).map(r => ({
    page:        r.keys[0].replace("https://es.kampaoh.com", ""),
    clicks:      r.clicks,
    impressions: r.impressions,
    ctr:         parseFloat((r.ctr * 100).toFixed(1)),
    position:    parseFloat(r.position.toFixed(1)),
  }));
}

function summaryFromQueries(queries, byDateSlice) {
  const clicks = byDateSlice.reduce((s, r) => s + r.clicks, 0);
  const impr   = byDateSlice.reduce((s, r) => s + r.impressions, 0);
  // posición media ponderada por impresiones
  const totalImprQ = queries.reduce((s, r) => s + r.impressions, 0);
  const position   = totalImprQ
    ? parseFloat((queries.reduce((s, r) => s + r.position * r.impressions, 0) / totalImprQ).toFixed(1))
    : 0;
  return {
    clicks,
    impressions: impr,
    ctr:      impr ? parseFloat((clicks / impr * 100).toFixed(1)) : 0,
    position,
  };
}

async function main() {
  const args  = process.argv.slice(2);
  const toArg = args.find(a => a.startsWith("--to="));
  const dateTo = toArg ? toArg.split("=")[1] : daysAgo(2);

  // byDate: últimos ~16 meses (máximo disponible en GSC)
  const byDateFrom = isoAddDays(dateTo, -484);

  const ranges = {
    "7":  { from: isoAddDays(dateTo, -6),   to: dateTo },
    "30": { from: isoAddDays(dateTo, -29),  to: dateTo },
    "90": { from: isoAddDays(dateTo, -89),  to: dateTo },
  };

  console.log(`  Fetching GSC → ${dateTo}`);
  console.log(`  byDate: ${byDateFrom} → ${dateTo}`);
  console.log(`  Períodos: 7d (${ranges["7"].from}), 30d (${ranges["30"].from}), 90d (${ranges["90"].from})`);

  const client = await auth.getClient();
  const { token } = await client.getAccessToken();

  const ORDER_CLICKS = [{ fieldName: "clicks", sortOrder: "DESCENDING" }];
  const ORDER_DATE   = [{ fieldName: "date",   sortOrder: "ASCENDING"  }];

  // 7 llamadas en paralelo
  const [bdRes, q7, p7, q30, p30, q90, p90] = await Promise.all([
    gscQuery(token, { startDate: byDateFrom, endDate: dateTo, dimensions: ["date"], rowLimit: 25000, orderBy: ORDER_DATE }),
    gscQuery(token, { startDate: ranges["7"].from,  endDate: dateTo, dimensions: ["query"], rowLimit: 1000, orderBy: ORDER_CLICKS }),
    gscQuery(token, { startDate: ranges["7"].from,  endDate: dateTo, dimensions: ["page"],  rowLimit: 1000, orderBy: ORDER_CLICKS }),
    gscQuery(token, { startDate: ranges["30"].from, endDate: dateTo, dimensions: ["query"], rowLimit: 1000, orderBy: ORDER_CLICKS }),
    gscQuery(token, { startDate: ranges["30"].from, endDate: dateTo, dimensions: ["page"],  rowLimit: 1000, orderBy: ORDER_CLICKS }),
    gscQuery(token, { startDate: ranges["90"].from, endDate: dateTo, dimensions: ["query"], rowLimit: 1000, orderBy: ORDER_CLICKS }),
    gscQuery(token, { startDate: ranges["90"].from, endDate: dateTo, dimensions: ["page"],  rowLimit: 1000, orderBy: ORDER_CLICKS }),
  ]);

  if (bdRes.error) throw new Error(bdRes.error.message);

  const byDate = (bdRes.rows || []).map(r => ({
    date:        r.keys[0],
    clicks:      r.clicks,
    impressions: r.impressions,
  }));

  function sliceByDate(from, to) {
    return byDate.filter(r => r.date >= from && r.date <= to);
  }

  const queries7  = mapQueries(q7);
  const queries30 = mapQueries(q30);
  const queries90 = mapQueries(q90);

  const periods = {
    "7":  { dateFrom: ranges["7"].from,  dateTo, queries: queries7,  pages: mapPages(p7),  summary: summaryFromQueries(queries7,  sliceByDate(ranges["7"].from,  dateTo)) },
    "30": { dateFrom: ranges["30"].from, dateTo, queries: queries30, pages: mapPages(p30), summary: summaryFromQueries(queries30, sliceByDate(ranges["30"].from, dateTo)) },
    "90": { dateFrom: ranges["90"].from, dateTo, queries: queries90, pages: mapPages(p90), summary: summaryFromQueries(queries90, sliceByDate(ranges["90"].from, dateTo)) },
  };

  const output = { updated: dateTo, byDate, periods };
  fs.writeFileSync(DATA_PATH, JSON.stringify(output), "utf8");

  for (const [key, p] of Object.entries(periods)) {
    console.log(`  ${key}d: ${p.summary.clicks.toLocaleString("es")} clicks | ${p.summary.impressions.toLocaleString("es")} impr | pos ${p.summary.position} — ${p.queries.length} queries, ${p.pages.length} págs`);
  }
  console.log(`  ✅ byDate: ${byDate.length} días (${byDateFrom} → ${dateTo})`);
}

main().catch(e => { console.error("❌ Error:", e.message); process.exit(1); });
