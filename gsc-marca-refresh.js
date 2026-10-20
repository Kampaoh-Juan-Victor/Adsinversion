#!/usr/bin/env node
// Fetch GSC brand-only clicks by month (May 2025 – Sep 2026)

const { GoogleAuth } = require("google-auth-library");
const fs   = require("fs");
const path = require("path");

const SITE_URL   = "https://es.kampaoh.com/";
const CREDS_PATH = path.join(__dirname, "ga4-credentials.json");

const BRAND_TERMS = ["kampaoh", "kampao", "kampoah", "kampaho", "kampaog", "kampaok", "kampahoh", "kampaoo"];

const auth = new GoogleAuth({
  keyFile: CREDS_PATH,
  scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
});

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

async function main() {
  const client = await auth.getClient();
  const token  = (await client.getAccessToken()).token;

  const startDate = "2025-05-01";
  const endDate   = "2026-09-26";

  // Fetch with query + yearMonth dimensions, no filter — then filter brand client-side
  // GSC allows max 25k rows; request in batches by brand term to stay within limits
  const byMonth = {};

  for (const term of BRAND_TERMS) {
    console.log(`  Fetching term: "${term}"...`);
    const res = await gscQuery(token, {
      startDate,
      endDate,
      dimensions: ["date", "query"],
      dimensionFilterGroups: [{
        filters: [{ dimension: "query", operator: "contains", expression: term }]
      }],
      rowLimit: 25000,
    });

    (res.rows || []).forEach(r => {
      const date  = r.keys[0]; // "2025-05-01"
      const query = r.keys[1];
      const ym    = date.slice(0, 7).replace("-", ""); // "202505"
      if (!byMonth[ym]) byMonth[ym] = { clicks: 0, impressions: 0 };
      byMonth[ym].clicks      += r.clicks;
      byMonth[ym].impressions += r.impressions;
    });
  }

  // Dedupe: some queries match multiple terms → use date+query as unique key
  console.log("  Fetching deduplicated (date+query)...");
  const deduped = {};

  for (const term of BRAND_TERMS) {
    const res = await gscQuery(token, {
      startDate, endDate,
      dimensions: ["date", "query"],
      dimensionFilterGroups: [{
        filters: [{ dimension: "query", operator: "contains", expression: term }]
      }],
      rowLimit: 25000,
    });
    (res.rows || []).forEach(r => {
      const date  = r.keys[0];
      const query = r.keys[1];
      const ym    = date.slice(0, 7).replace("-", "");
      const key   = `${date}|${query}`;
      if (!deduped[key]) deduped[key] = { ym, clicks: r.clicks, impressions: r.impressions };
    });
  }

  // Classify each query to main brand bucket
  function brandBucket(query) {
    if (query.includes("kampaho"))  return "kampaho";
    if (query.includes("kampoah"))  return "kampoah";
    if (query.includes("kampaoh"))  return "kampaoh";
    if (query.includes("kampao"))   return "kampao";
    return "other";
  }

  // Aggregate: total by month + by keyword bucket + per query
  const result      = {};
  const byKeyword   = {};
  const queryMonths = {}; // { "kampaoh las arenas": { "202505": clicks, ... }, ... }
  const queryTotal  = {}; // total clicks per query (for ranking)

  Object.entries(deduped).forEach(([key, { ym, clicks, impressions }]) => {
    const query  = key.split("|")[1];
    const bucket = brandBucket(query);

    // Total by month
    if (!result[ym]) result[ym] = { clicks: 0, impressions: 0 };
    result[ym].clicks      += clicks;
    result[ym].impressions += impressions;

    // By keyword bucket
    if (!byKeyword[bucket]) byKeyword[bucket] = {};
    if (!byKeyword[bucket][ym]) byKeyword[bucket][ym] = { clicks: 0, impressions: 0 };
    byKeyword[bucket][ym].clicks      += clicks;
    byKeyword[bucket][ym].impressions += impressions;

    // Per individual query
    if (!queryMonths[query]) queryMonths[query] = {};
    queryMonths[query][ym] = (queryMonths[query][ym] || 0) + clicks;
    queryTotal[query] = (queryTotal[query] || 0) + clicks;
  });

  // Keep only top 30 queries by total clicks (for artifact size)
  const top30 = Object.entries(queryTotal)
    .sort((a,b) => b[1]-a[1])
    .slice(0, 30)
    .map(([q]) => q);

  const byQueryMonth = {};
  top30.forEach(q => { byQueryMonth[q] = queryMonths[q]; });

  const sorted = Object.keys(result).sort();
  sorted.forEach(m => {
    const { clicks, impressions } = result[m];
    console.log(`  ${m}: ${clicks.toLocaleString()} clicks | ${impressions.toLocaleString()} impr`);
  });

  console.log("\nPor keyword:");
  ["kampaoh","kampao","kampoah","kampaho"].forEach(kw => {
    if (!byKeyword[kw]) return;
    const total = Object.values(byKeyword[kw]).reduce((s, v) => s + v.clicks, 0);
    console.log(`  ${kw}: ${total.toLocaleString()} clicks totales`);
  });

  console.log("\nTop 30 queries con datos mensuales:");
  top30.forEach((q,i) => console.log(`  ${i+1}. ${q}: ${queryTotal[q].toLocaleString()} clicks`));

  const out = { byMonth: result, byKeyword, byQueryMonth, updated: new Date().toISOString().slice(0,10) };
  const outPath = path.join(__dirname, "gsc-marca-bymonth.json");
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(`\n✅ Guardado: gsc-marca-bymonth.json`);
}

main().catch(e => { console.error(e); process.exit(1); });
