#!/usr/bin/env node
// process-month.js — Lee datos raw de Portermetrics y actualiza data.json
// Uso: node process-month.js <meta.json> <tiktok.json> <google.json> <pmax.json> <YYYY-MM>
// Los archivos son resultados directos de query_data (columnas + rows)

const fs   = require("fs");
const path = require("path");

const [,, metaFile, tiktokFile, googleFile, pmaxFile, monthKey] = process.argv;
if (!metaFile || !monthKey) {
  console.error("Uso: node process-month.js meta.json tiktok.json google.json pmax.json YYYY-MM");
  process.exit(1);
}

const DIR       = path.dirname(__filename);
const DATA_PATH = path.join(DIR, "data.json");

// ── Slug rules ────────────────────────────────────────────────────────────────
function normalize(s) {
  return (s||"").toLowerCase()
    .replace(/á/g,"a").replace(/é/g,"e").replace(/í/g,"i")
    .replace(/ó/g,"o").replace(/ú/g,"u").replace(/ü/g,"u")
    .replace(/ñ/g,"n").replace(/ç/g,"c");
}

function slugFromText(n) {
  if (n.includes("somo parque") || n.includes("somo-parque")) return "somo-parque";
  if (n.includes("kikopark rural") || n.includes("kikopark-rural")) return "kikopark-rural";
  if (n.includes("kikopark")) return "kikopark-playa";
  if (n.includes("costa brava") || n.includes("costa-brava")) return "costa-brava";
  if (n.includes("costa blanca") || n.includes("costa-blanca")) return "costa-blanca";
  if (n.includes("la franca") || n.includes("la-franca") || n === "franca") return "la-franca";
  if (n.includes("sierra nevada") || n.includes("sierra-nevada")) return "sierra-nevada";
  if (n.includes("sierra urbasa") || n.includes("sierra-urbasa") || n.includes("urbasa")) return "sierra-de-urbasa";
  if (n.includes("playa de levante") || n.includes("playa-de-levante") || n.includes("playa levante") || (n.includes("levante") && !n.includes("advantage") && !n.includes("catalogo"))) return "playa-de-levante";
  if (n.includes("playa troenzo") || n.includes("playa-troenzo") || n.includes("troenzo")) return "playa-troenzo";
  if (n.includes("los escullos") || n.includes("los-escullos") || n === "escullos") return "los-escullos";
  if (n.includes("isla cristina") || n.includes("isla-cristina") || (n.includes("isla") && !n.includes("baleares"))) return "isla-cristina";
  if (n.includes("lago de arcos") || n.includes("lago-de-arcos") || n.includes("lago arcos") || n.includes("lago-de-arcos")) return "lago-de-arcos";
  if (n.includes("santillana del mar") || n.includes("santillana-del-mar") || n.includes("santillana")) return "santillana-del-mar";
  if (n.includes("fonts d'algar") || n.includes("fonts-dalgar") || n.includes("fonts algar") || (n.includes("algar") && !n.includes("algarve"))) return "fonts-dalgar";
  if (n.includes("delta del ebro") || n.includes("delta-ebro") || n.includes("delta ebro") || n === "ebro") return "delta-ebro";
  if (n.includes("ria de vigo") || n.includes("ria-de-vigo") || n.includes("vigo")) return "ria-de-vigo";
  if (n.includes("platja de aro") || n.includes("platja d'aro") || n.includes("platjadaro") || n.includes("platja-de-aro") || (n.includes("platja") && !n.includes("palafrug"))) return "platja-de-aro";
  if (n.includes("bayona playa") || n.includes("bayona-playa") || n.includes("bayona")) return "bayona-playa";
  if (n.includes("el palmar") || n.includes("el-palmar") || n === "palmar") return "el-palmar";
  if (n.includes("las arenas") || n.includes("las-arenas")) return "las-arenas";
  if (n.includes("el rocio") || n.includes("el-rocio") || n === "rocio") return "el-rocio";
  if (n.includes("o pedrouzo") || n.includes("o-pedrouzo") || n === "pedrouzo") return "o-pedrouzo";
  if (n.includes("sao martinho") || n.includes("martinho") || (n.includes("porto") && !n.includes("portosin"))) return "martinho-do-porto";
  if (n.includes("puerto santa maria") || n.includes("puerto-santa-maria") || n.includes("puerto sta") || n.includes("el puerto de santa")) return "puerto-santa-maria";
  if (n.includes("somo")) return "somo-playa";
  if (n.includes("conil") || n.includes("los canos") || n.includes("los-canos") || n.includes("caños") || n.includes("canos")) return "conil";
  if (n === "tarifa" || (n.includes("tarifa") && !n.includes("tarifas"))) return "tarifa";
  if (n === "trafalgar" || n.includes("trafalgar")) return "trafalgar";
  if (n === "calella" || n.includes("calella")) return "calella";
  if (n.includes("tossa")) return "tossa-de-mar";
  if (n === "menorca" || n.includes("menorca")) return "menorca";
  if (n.includes("alquezar")) return "alquezar";
  if (n === "neptuno" || n.includes("neptuno")) return "neptuno";
  if (n === "navajas" || n.includes("navajas")) return "navajas";
  if (n === "blanes" || n.includes("blanes")) return "blanes";
  if (n === "palamos" || n.includes("palamos")) return "palamos";
  if (n.includes("donana") || n.includes("donana")) return "donana";
  if (n === "benicassim" || n.includes("benicassim") || n.includes("benicasim")) return "benicassim";
  if (n === "mendigorria" || n.includes("mendigorria")) return "mendigorria";
  if (n === "llanes" || n.includes("llanes")) return "llanes";
  if (n === "cambrils" || n.includes("cambrils")) return "cambrils";
  if (n === "crevillent" || n.includes("crevillent")) return "crevillent";
  if (n === "roquetas" || n.includes("roquetas")) return "roquetas";
  if (n === "tavira" || n.includes("tavira")) return "tavira";
  if (n === "zumaia" || n.includes("zumaia")) return "zumaia";
  if (n === "estepona" || n.includes("estepona")) return "estepona";
  if (n === "lagoa" || n.includes("lagoa")) return "lagoa";
  if (n === "oyambre" || n.includes("oyambre")) return "oyambre";
  if (n === "ruiloba" || n.includes("ruiloba")) return "ruiloba";
  if (n.includes("cabaneros") || n.includes("cabaneros")) return "cabañeros";
  if (n === "cordoba" || n.includes("cordoba") || (n.includes("córdoba") && !n.includes("cordobes"))) return "cordoba";
  if (n === "paloma" || n.includes("paloma")) return "paloma";
  if (n === "pedroso" || n.includes("pedroso")) return "pedroso";
  if (n === "rianxo" || n.includes("rianxo")) return "rianxo";
  if (n === "grazalema" || n.includes("grazalema")) return "grazalema";
  if (n === "almadrava" || n.includes("almadrava")) return "almadrava";
  if (n === "flumendosa" || n.includes("flumendosa")) return "flumendosa";
  if (n === "lisboa" || n.includes("lisboa")) return "lisboa";
  if (n.includes("a guarda") || n.includes("a-guarda") || n === "guarda") return "a-guarda";
  if (n === "deva" || n.includes("deva")) return "deva";
  if (n.includes("cova negra") || n.includes("cova-negra")) return "cova-negra";
  if (n.includes("sierra nevada") || n.includes("nevada")) return "sierra-nevada";
  return null;
}

// Google Search pattern: ES_Conversiones_Search_Tipo_slug or similar
function extractGoogleSlug(campaign, adgroup) {
  const cn = normalize(campaign);
  const ag = normalize(adgroup);

  // GenDemand, Display, Video, YouTube → sin-etiquetar
  if (/gendemand|demand.gen|display|video|youtube|shorts|alcance|trafico/.test(cn)) return "sin-etiquetar";

  // Search campaigns: try to extract slug from adgroup name
  if (cn.includes("search")) {
    // Pattern: ES_Search_slug or Search_slug_destination
    const parts = ag.split("_").map(p => p.replace(/-/g, " ").trim());
    // Try each part as a slug
    for (let i = parts.length - 1; i >= 0; i--) {
      const s = slugFromText(parts[i]);
      if (s && s !== "sin-etiquetar") return s;
    }
    // Also try the full adgroup name
    const full = slugFromText(ag.replace(/_/g, " "));
    if (full && full !== "sin-etiquetar") return full;
    return "sin-etiquetar";
  }

  // Fallback: try adgroup name
  const s = slugFromText(ag);
  if (s) return s;
  return "sin-etiquetar";
}

function extractMetaSlug(adsetName) {
  const n = normalize(adsetName);
  const s = slugFromText(n);
  if (s) return s;
  return "sin-etiquetar";
}

function extractTiktokSlug(adgroupName) {
  const n = normalize(adgroupName);
  const s = slugFromText(n);
  if (s) return s;
  return "sin-etiquetar";
}

function extractPmaxSlug(assetGroupName) {
  const n = normalize(assetGroupName)
    .replace(/kampaoh\s*/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  // Direct match from known slugs
  const direct = slugFromText(normalize(assetGroupName).replace(/kampaoh\s*/i, ""));
  if (direct) return direct;
  // Try normalized slug directly
  const knownSlugs = ["las-arenas","el-palmar","conil","isla-cristina","donana","tarifa","trafalgar",
    "menorca","costa-brava","calella","tossa-de-mar","ria-de-vigo","somo-playa","paloma","kikopark-playa",
    "alquezar","cova-negra","santillana-del-mar","lago-de-arcos","fonts-dalgar","navajas","neptuno",
    "playa-de-levante","blanes","palamos","benicassim","mendigorria","llanes","sierra-de-urbasa",
    "sierra-nevada","costa-blanca","cambrils","bayona-playa","el-rocio","crevillent","roquetas","deva",
    "platja-de-aro","zumaia","estepona","lagoa","la-franca","oyambre","ruiloba","playa-troenzo",
    "kikopark-rural","los-escullos","martinho-do-porto","puerto-santa-maria","cordoba","pedroso",
    "rianxo","grazalema","cabañeros","delta-ebro","somo-parque","a-guarda","o-pedrouzo","almadrava",
    "flumendosa","lisboa","tavira"];
  if (knownSlugs.includes(n)) return n;
  return "sin-etiquetar";
}

// ── Parse Portermetrics result file ─────────────────────────────────────────
function parseResult(file) {
  if (!file || file === "none" || !fs.existsSync(file)) return [];
  const raw = JSON.parse(fs.readFileSync(file, "utf8"));
  const cols = raw.columns;
  return raw.rows.map(row => {
    const obj = {};
    cols.forEach((c, i) => { obj[c] = row[i]; });
    return obj;
  });
}

// ── Aggregate spend ──────────────────────────────────────────────────────────
const result = {}; // { "YYYY-MM-DD": { m:{}, t:{}, g:{} } }

function addSpend(date, platform, slug, spend) {
  const amt = parseFloat(spend) || 0;
  if (amt <= 0) return;
  const d = date.length === 8 ? date.slice(0,4)+"-"+date.slice(4,6)+"-"+date.slice(6,8) : date;
  if (!result[d]) result[d] = { m:{}, t:{}, g:{} };
  const p = result[d][platform];
  p[slug] = (p[slug] || 0) + amt;
}

// ── Process Meta ─────────────────────────────────────────────────────────────
const metaRows = parseResult(metaFile);
metaRows.forEach(r => {
  const slug = extractMetaSlug(r.adset_name || "");
  addSpend(r.date, "m", slug, r.amount_spent);
});
console.log("Meta rows:", metaRows.length);

// ── Process TikTok ───────────────────────────────────────────────────────────
const tiktokRows = parseResult(tiktokFile);
tiktokRows.forEach(r => {
  const name = r.tiktok_ads_adgroup_name || r.adgroup_name || "";
  const slug = extractTiktokSlug(name);
  const spend = r.tiktok_ads_spend || r.spend || 0;
  addSpend(r.date, "t", slug, spend);
});
console.log("TikTok rows:", tiktokRows.length);

// ── Process Google non-PMAX ──────────────────────────────────────────────────
const googleRows = parseResult(googleFile);
googleRows.forEach(r => {
  const campaign = r.google_ads_campaign_name || "";
  const adgroup  = r.google_ads_ad_group_name || "";
  const slug = extractGoogleSlug(campaign, adgroup);
  // cost_micros is already in EUR (Portermetrics converts it)
  addSpend(r.date, "g", slug, r.google_ads_cost_micros);
});
console.log("Google rows:", googleRows.length);

// ── Process Google PMAX ──────────────────────────────────────────────────────
const pmaxRows = parseResult(pmaxFile);
pmaxRows.forEach(r => {
  const assetGroup = r.google_ads_asset_group_name || "";
  const slug = extractPmaxSlug(assetGroup);
  addSpend(r.date, "g", slug, r.google_ads_cost_micros);
});
console.log("PMAX rows:", pmaxRows.length);

// ── Round all values ─────────────────────────────────────────────────────────
Object.keys(result).forEach(day => {
  ["m","t","g"].forEach(p => {
    Object.keys(result[day][p]).forEach(slug => {
      result[day][p][slug] = Math.round(result[day][p][slug] * 100) / 100;
    });
    // Remove zero/empty
    Object.keys(result[day][p]).forEach(slug => {
      if (result[day][p][slug] <= 0) delete result[day][p][slug];
    });
  });
});

// ── Merge into data.json ─────────────────────────────────────────────────────
let data = { v: 1, updated: "", days: {} };
if (fs.existsSync(DATA_PATH)) {
  try { data = JSON.parse(fs.readFileSync(DATA_PATH, "utf8")); } catch(e) {}
}
if (!data.days) data.days = {};

const newDays = Object.keys(result);
newDays.forEach(day => { data.days[day] = result[day]; });
data.updated = monthKey;

fs.writeFileSync(DATA_PATH, JSON.stringify(data), "utf8");

console.log("✅ " + monthKey + " — " + newDays.length + " días escritos en data.json");
console.log("   Total días en data.json: " + Object.keys(data.days).length);
