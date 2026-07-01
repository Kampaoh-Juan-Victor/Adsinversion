#!/usr/bin/env node
// auto-refresh.js — Obtiene datos de Porter via Anthropic API + MCP
// Uso: node auto-refresh.js [--date=YYYY-MM-DD]
require("dotenv").config({ path: __dirname + "/.env" });
const Anthropic = require("@anthropic-ai/sdk");
const { BetaAnalyticsDataClient } = require("@google-analytics/data");
const fs = require("fs");
const path = require("path");

const DIR = __dirname;
const DATA_PATH = path.join(DIR, "data.json");
const GA4_PATH  = path.join(DIR, "ga4-data.json");
const CAMP_PATH = path.join(DIR, "campaigns-data.json");

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const PORTER_URL = process.env.PORTER_MCP_URL || "https://mcp.portermetrics.com/mcp";

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

// ── Slug helpers ──────────────────────────────────────────────────────────────
function extractSlug(name) {
  const n = name.toLowerCase();
  if (n.includes("somo parque") || n.includes("somo-parque")) return "somo-parque";
  if (n.includes("kikopark rural") || n.includes("kikopark-rural")) return "kikopark-rural";
  if (n.includes("kikopark playa") || n.includes("kikopark-playa") || (n.includes("kikopark") && !n.includes("rural"))) return "kikopark-playa";
  if (n.includes("costa brava") || n.includes("costa-brava")) return "costa-brava";
  if (n.includes("costa blanca") || n.includes("costa-blanca")) return "costa-blanca";
  if (n.includes("playa de levante") || n.includes("playa-de-levante") || n.includes("playa levante")) return "playa-de-levante";
  if (n.includes("playa troenzo") || n.includes("playa-troenzo") || n.includes("troenzo")) return "playa-troenzo";
  if (n.includes("los escullos") || n.includes("los-escullos")) return "los-escullos";
  if (n.includes("isla cristina") || n.includes("isla-cristina")) return "isla-cristina";
  if (n.includes("lago de arcos") || n.includes("lago-de-arcos") || n.includes("lago arcos")) return "lago-de-arcos";
  if (n.includes("santillana del mar") || n.includes("santillana-del-mar") || n.includes("santillana")) return "santillana-del-mar";
  if (n.includes("fonts d'algar") || n.includes("fonts-dalgar") || n.includes("fonts algar")) return "fonts-dalgar";
  if (n.includes("delta del ebro") || n.includes("delta-ebro") || n.includes("delta ebro")) return "delta-ebro";
  if (n.includes("ria de vigo") || n.includes("ria-de-vigo") || n.includes("ría-de-vigo") || n.includes("ría de vigo")) return "ria-de-vigo";
  if (n.includes("platja de aro") || n.includes("platja d'aro") || n.includes("platjadaro") || n.includes("platja-de-aro")) return "platja-de-aro";
  if (n.includes("bayona playa") || n.includes("bayona-playa") || n.includes("bayona")) return "bayona-playa";
  if (n.includes("hostel-palmar") || n.includes("hostel palmar")) return "el-palmar";
  if (n.includes("el palmar") || n.includes("el-palmar") || n.includes("palmar")) return "el-palmar";
  if (n.includes("las arenas") || n.includes("las-arenas") || n.includes("arenas")) return "las-arenas";
  if (n.includes("el rocio") || n.includes("el-rocio")) return "el-rocio";
  if (n.includes("o pedrouzo") || n.includes("pedrouzo")) return "o-pedrouzo";
  if (n.includes("martinho") || n.includes("sao martinho") || n.includes("martinho-do-porto")) return "martinho-do-porto";
  if (n.includes("puerto santa maria") || n.includes("puerto-santa-maria")) return "puerto-santa-maria";
  if (n.includes("somo playa") || n.includes("somo-playa") || n.includes("somo")) return "somo-playa";
  if (n.includes("canos") || n.includes("caños") || n.includes("los-caños") || n.includes("los caños")) return "canos";
  if (n.includes("conil")) return "conil";
  if (n.includes("tarifa")) return "tarifa";
  if (n.includes("trafalgar") || n.includes("hostel-trafalgar")) return "trafalgar";
  if (n.includes("calella")) return "calella";
  if (n.includes("tossa") || n.includes("tossa-de-mar")) return "tossa-de-mar";
  if (n.includes("menorca")) return "menorca";
  if (n.includes("alquezar") || n.includes("alquézar")) return "alquezar";
  if (n.includes("neptuno")) return "neptuno";
  if (n.includes("navajas")) return "navajas";
  if (n.includes("blanes")) return "blanes";
  if (n.includes("palamos") || n.includes("palamós")) return "palamos";
  if (n.includes("donana") || n.includes("doñana")) return "donana";
  if (n.includes("benicassim")) return "benicassim";
  if (n.includes("mendigorria") || n.includes("mendigorría")) return "mendigorria";
  if (n.includes("llanes")) return "llanes";
  if (n.includes("cambrils")) return "cambrils";
  if (n.includes("crevillent")) return "crevillent";
  if (n.includes("roquetas")) return "roquetas";
  if (n.includes("zumaia")) return "zumaia";
  if (n.includes("estepona")) return "estepona";
  if (n.includes("oyambre")) return "oyambre";
  if (n.includes("ruiloba")) return "ruiloba";
  if (n.includes("cabaneros") || n.includes("cabañeros")) return "cabañeros";
  if (n.includes("cordoba") || n.includes("córdoba")) return "cordoba";
  if (n.includes("paloma")) return "paloma";
  if (n.includes("pedroso")) return "pedroso";
  if (n.includes("rianxo")) return "rianxo";
  if (n.includes("grazalema")) return "grazalema";
  if (n.includes("deva")) return "deva";
  if (n.includes("cova negra") || n.includes("cova-negra")) return "cova-negra";
  if (n.includes("sierra nevada") || n.includes("sierra-nevada")) return "sierra-nevada";
  if (n.includes("sierra urbasa") || n.includes("sierra-de-urbasa") || n.includes("urbasa")) return "sierra-de-urbasa";
  return "sin-etiquetar";
}

function normalizePmaxSlug(s) {
  const n = s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (n.includes("palmar")) return "el-palmar";
  if (n.includes("donana") || n.includes("dona")) return "donana";
  if (n.includes("los-canos") || n.includes("canos")) return "conil";
  if (n.includes("platjadaro") || n.includes("platja-de-aro")) return "platja-de-aro";
  if (n.includes("ria-de-vigo") || n.includes("ria de vigo")) return "ria-de-vigo";
  if (n.includes("mendigorria")) return "mendigorria";
  return n;
}

function extractGoogleSlug(campName, agName) {
  const c = campName.toLowerCase();
  if (c.includes("gendeman") || c.includes("gendemand") || c.includes("trafi") ||
      c.includes("alcance") || c.includes("shorts") || c.includes("provincia") ||
      c.includes("ccaa") || c.includes("competencia") ||
      (c.includes("campings") && c.includes("gen")) ||
      (c.includes("verano") && c.includes("gen"))) return "sin-etiquetar";
  if (c.includes("search")) return extractSlug(agName);
  return "sin-etiquetar";
}

function addSpend(obj, slug, amount) {
  if (!amount || amount <= 0) return;
  obj[slug] = (obj[slug] || 0) + amount;
}
function round2(v) { return Math.round(v * 100) / 100; }
function roundObj(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) { const r = round2(v); if (r > 0) out[k] = r; }
  return out;
}

// ── Anthropic API + Porter MCP ────────────────────────────────────────────────
async function askPorter(prompt) {
  const messages = [{ role: "user", content: prompt }];

  for (let i = 0; i < 20; i++) {
    const resp = await client.beta.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 16000,
      betas: ["mcp-client-2025-04-04"],
      mcp_servers: [{ type: "url", url: PORTER_URL, name: "portermetrics" }],
      messages,
    });

    if (resp.stop_reason === "end_turn") {
      return resp.content.filter(b => b.type === "text").map(b => b.text).join("");
    }

    messages.push({ role: "assistant", content: resp.content });
  }
  throw new Error("Porter query did not complete in 20 turns");
}

function parseJSON(raw, label) {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error(`No JSON in ${label} response:\n${raw.slice(0, 300)}`);
  return JSON.parse(match[0]);
}

// ── Refresh functions ─────────────────────────────────────────────────────────
async function refreshAds(dateStr) {
  console.log(`  Fetching ads for ${dateStr}...`);
  const raw = await askPorter(`
You have Porter Metrics MCP available. Fetch ad spend data for ${dateStr}.

Run 4 queries using tool:porter-reporting:query_data (via the execute/mutation tool):

1. META: adset_name + date, metric: spend. Accounts: Meta España and Meta Francia (facebook_ads).
2. TIKTOK: adgroup_name + stat_time_day, metric: spend. Account: Kampaoh1221 (tiktok_ads).
3. GOOGLE non-PMAX: campaign_name + ad_group_name + date, metric: cost_micros. Exclude PERFORMANCE_MAX campaigns. Account: Google España (google_ads).
4. GOOGLE PMAX only: campaign_name + date + asset_group_name, metric: cost_micros. Only PERFORMANCE_MAX campaigns. Account: Google España (google_ads).

Return ONLY this JSON (no text before or after):
{"meta":[["adset","YYYYMMDD","euros"],...],"tiktok":[["adgroup","YYYYMMDD","euros"],...],"google":[["camp","ag","YYYYMMDD","euros"],...],"pmax":[["camp","YYYYMMDD","assetGroup","euros"],...]}
`);

  const d = parseJSON(raw, "ads");
  const day = { m: {}, t: {}, g: {} };

  for (const [adset, , spend] of (d.meta || [])) addSpend(day.m, extractSlug(adset), parseFloat(spend));
  for (const [ag, , spend] of (d.tiktok || [])) addSpend(day.t, extractSlug(ag), parseFloat(spend));
  for (const [camp, ag, , cost] of (d.google || [])) addSpend(day.g, extractGoogleSlug(camp, ag), parseFloat(cost));
  for (const [, , assetGrp, cost] of (d.pmax || [])) addSpend(day.g, normalizePmaxSlug(assetGrp), parseFloat(cost));

  let existing = { v: 1, updated: "", days: {} };
  if (fs.existsSync(DATA_PATH)) try { existing = JSON.parse(fs.readFileSync(DATA_PATH, "utf8")); } catch(e) {}
  if (!existing.days) existing.days = {};
  existing.days[dateStr] = { m: roundObj(day.m), t: roundObj(day.t), g: roundObj(day.g) };
  existing.updated = dateStr;
  fs.writeFileSync(DATA_PATH, JSON.stringify(existing), "utf8");

  const total = [...Object.values(day.m), ...Object.values(day.t), ...Object.values(day.g)].reduce((a,b)=>a+b,0);
  console.log(`  ✅ Ads OK — ${dateStr}: €${round2(total)}`);
}

async function refreshGA4(dateFrom, dateTo) {
  console.log(`  Fetching GA4 ${dateFrom} → ${dateTo}...`);

  const ga4client = new BetaAnalyticsDataClient({
    keyFilename: path.join(DIR, "ga4-credentials.json"),
  });

  const [response] = await ga4client.runReport({
    property: "properties/347358752",
    dimensions: [{ name: "date" }, { name: "itemName" }],
    metrics: [
      { name: "itemsViewed" },
      { name: "itemsAddedToCart" },
      { name: "itemsCheckedOut" },
      { name: "itemsPurchased" },
    ],
    dateRanges: [{ startDate: dateFrom, endDate: dateTo }],
  });

  const rows = [];
  for (const row of response.rows || []) {
    const dateNum  = parseInt(row.dimensionValues[0].value);
    const itemName = row.dimensionValues[1].value.replace(/\(.*$/, "").trim();
    const views     = parseInt(row.metricValues[0].value) || 0;
    const cart      = parseInt(row.metricValues[1].value) || 0;
    const checkout  = parseInt(row.metricValues[2].value) || 0;
    const purchases = parseInt(row.metricValues[3].value) || 0;
    if (views === 0) continue;
    rows.push([dateNum, itemName, views, cart, checkout, purchases]);
  }

  let existing = { updated: "", rows: [] };
  if (fs.existsSync(GA4_PATH)) try { existing = JSON.parse(fs.readFileSync(GA4_PATH, "utf8")); } catch(e) {}
  if (!Array.isArray(existing.rows)) existing.rows = [];

  const fromNum = parseInt(dateFrom.replace(/-/g, ""));
  const toNum   = parseInt(dateTo.replace(/-/g, ""));
  existing.rows = existing.rows.filter(r => r[0] < fromNum || r[0] > toNum);
  existing.rows.push(...rows);
  existing.rows.sort((a, b) => a[0] - b[0]);
  existing.updated = dateTo;
  fs.writeFileSync(GA4_PATH, JSON.stringify(existing), "utf8");
  console.log(`  ✅ GA4 OK — ${rows.length} filas`);
}

async function refreshCampaigns(dateStr) {
  console.log(`  Fetching campaigns for ${dateStr}...`);
  const raw = await askPorter(`
Use Porter Metrics MCP. Fetch campaign-level data for ${dateStr}.

Query 1 — META campaigns: dimensions=[facebook_ads_campaign_name, facebook_ads_date], metrics=[spend, reach, impressions, clicks].
Query 2 — GOOGLE campaigns (non-PMAX): dimensions=[google_ads_campaign_name, google_ads_date], metrics=[cost_micros, conversions, conversions_value, impressions, clicks].

Return ONLY JSON (numbers as numbers, spend/cost rounded to 2 decimals):
{"meta":[["name",spend,reach,impressions,clicks],...],"google":[["name",cost_euros,conversions,conv_value,impressions,clicks],...]}
`);

  const { meta, google } = parseJSON(raw, "campaigns");
  let existing = { v:1, updated:"", cols:{m:["n","s","pu","rch","imp","clk"],g:["n","s","cv","rv","imp","clk"]}, days:{} };
  if (fs.existsSync(CAMP_PATH)) try { existing = JSON.parse(fs.readFileSync(CAMP_PATH, "utf8")); } catch(e) {}
  if (!existing.days) existing.days = {};

  existing.days[dateStr] = {
    m: (meta||[]).map(([n,s,r,,imp,clk]) => [n, round2(s), Math.round(r), Math.round(r), Math.round(imp), Math.round(clk)]),
    g: (google||[]).map(([n,s,cv,rv,imp,clk]) => [n, round2(s), round2(cv), round2(rv), Math.round(imp), Math.round(clk)])
  };
  existing.updated = dateStr;
  fs.writeFileSync(CAMP_PATH, JSON.stringify(existing), "utf8");
  console.log(`  ✅ Campaigns OK`);
}

// ── Entry point ───────────────────────────────────────────────────────────────
async function main() {
  const arg = process.argv.find(a => a.startsWith("--date="));
  const dateStr = arg ? arg.split("=")[1] : daysAgo(1);

  console.log(`\n=== Kampaoh Adsinversion refresh · ${dateStr} ===`);

  try { await refreshAds(dateStr); } catch(e) { console.error("  ❌ Ads:", e.message); }
  try { await refreshGA4(daysAgo(7), daysAgo(0)); } catch(e) { console.error("  ❌ GA4:", e.message); }
  try { await refreshCampaigns(dateStr); } catch(e) { console.error("  ❌ Campaigns:", e.message); }

  console.log("=== Done ===\n");
}

main().catch(e => { console.error(e); process.exit(1); });
