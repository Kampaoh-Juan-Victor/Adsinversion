#!/usr/bin/env node
// process-raw.js — Procesa archivos raw de Portermetrics y actualiza data.json
// Uso: node process-raw.js --meta <file> --tiktok <file> --google <file> --pmax <file>

const fs   = require("fs");
const path = require("path");

const args = process.argv.slice(2);
const get = (flag) => { const i = args.indexOf(flag); return i !== -1 ? args[i+1] : null; };

const metaFile   = get("--meta");
const tiktokFile = get("--tiktok");
const googleFile = get("--google");
const pmaxFile   = get("--pmax");

const DIR       = path.dirname(__filename);
const DATA_PATH = path.join(DIR, "data.json");

// ── Normalize ────────────────────────────────────────────────────────────────
function normalize(s) {
  return (s||"").toLowerCase()
    .replace(/á/g,"a").replace(/é/g,"e").replace(/í/g,"i")
    .replace(/ó/g,"o").replace(/ú/g,"u").replace(/ü/g,"u")
    .replace(/ñ/g,"n").replace(/ç/g,"c");
}

function slugFromText(n) {
  if (!n) return null;
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
  if (n.includes("lago de arcos") || n.includes("lago-de-arcos") || n.includes("lago arcos")) return "lago-de-arcos";
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
  if (n.includes("conil") || n.includes("los canos") || n.includes("los-canos") || n.includes("canos") || n.includes("caños")) return "conil";
  if (n.includes("tarifa") && !n.includes("tarifas")) return "tarifa";
  if (n.includes("trafalgar")) return "trafalgar";
  if (n.includes("calella")) return "calella";
  if (n.includes("tossa")) return "tossa-de-mar";
  if (n.includes("menorca")) return "menorca";
  if (n.includes("alquezar")) return "alquezar";
  if (n.includes("neptuno")) return "neptuno";
  if (n.includes("navajas")) return "navajas";
  if (n.includes("blanes")) return "blanes";
  if (n.includes("palamos")) return "palamos";
  if (n.includes("donana") || n.includes("doñana")) return "donana";
  if (n.includes("benicassim") || n.includes("benicasim")) return "benicassim";
  if (n.includes("mendigorria")) return "mendigorria";
  if (n.includes("llanes")) return "llanes";
  if (n.includes("cambrils")) return "cambrils";
  if (n.includes("crevillent")) return "crevillent";
  if (n.includes("roquetas")) return "roquetas";
  if (n.includes("tavira")) return "tavira";
  if (n.includes("zumaia")) return "zumaia";
  if (n.includes("estepona")) return "estepona";
  if (n.includes("lagoa")) return "lagoa";
  if (n.includes("oyambre")) return "oyambre";
  if (n.includes("ruiloba")) return "ruiloba";
  if (n.includes("cabaneros") || n.includes("cabaneros") || n.includes("cabañeros")) return "cabañeros";
  if (n.includes("cordoba") || n.includes("cordoba")) return "cordoba";
  if (n.includes("paloma")) return "paloma";
  if (n.includes("pedroso")) return "pedroso";
  if (n.includes("rianxo")) return "rianxo";
  if (n.includes("grazalema")) return "grazalema";
  if (n.includes("almadrava")) return "almadrava";
  if (n.includes("flumendosa")) return "flumendosa";
  if (n.includes("lisboa")) return "lisboa";
  if (n.includes("a guarda") || n.includes("a-guarda") || n === "guarda") return "a-guarda";
  if (n.includes("deva")) return "deva";
  if (n.includes("cova negra") || n.includes("cova-negra")) return "cova-negra";
  return null;
}

function extractGoogleSlug(campaign, adgroup) {
  const cn = normalize(campaign);
  const ag = normalize(adgroup);
  if (/gendemand|demand.gen|display|video|youtube|shorts|alcance|trafico/.test(cn)) return "sin-etiquetar";
  if (cn.includes("search")) {
    const parts = ag.split("_").map(p => p.replace(/-/g, " ").trim());
    for (let i = parts.length - 1; i >= 0; i--) {
      const s = slugFromText(parts[i]);
      if (s) return s;
    }
    const full = slugFromText(ag.replace(/_/g, " "));
    if (full) return full;
    return "sin-etiquetar";
  }
  const s = slugFromText(ag);
  return s || "sin-etiquetar";
}

function extractMetaSlug(adsetName) {
  return slugFromText(normalize(adsetName)) || "sin-etiquetar";
}

function extractTiktokSlug(name) {
  return slugFromText(normalize(name)) || "sin-etiquetar";
}

function extractPmaxSlug(assetGroupName) {
  const direct = slugFromText(normalize(assetGroupName).replace(/kampaoh\s*/i, ""));
  if (direct) return direct;
  const n = normalize(assetGroupName)
    .replace(/kampaoh\s*/g, "").replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "");
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

function parseRawFile(file) {
  if (!file || !fs.existsSync(file)) return [];
  const raw = JSON.parse(fs.readFileSync(file, "utf8"));
  const cols = raw.columns;
  return raw.rows.map(row => {
    const obj = {};
    cols.forEach((c, i) => { obj[c] = row[i]; });
    return obj;
  });
}

const result = {};

function addSpend(date, platform, slug, spend) {
  const amt = parseFloat(spend) || 0;
  if (amt <= 0) return;
  const d = String(date).length === 8
    ? String(date).slice(0,4)+"-"+String(date).slice(4,6)+"-"+String(date).slice(6,8)
    : String(date).slice(0,10);
  if (!result[d]) result[d] = { m:{}, t:{}, g:{} };
  result[d][platform][slug] = (result[d][platform][slug] || 0) + amt;
}

// Meta
const metaRows = parseRawFile(metaFile);
metaRows.forEach(r => {
  addSpend(r.date, "m", extractMetaSlug(r.adset_name || ""), r.amount_spent);
});
console.log("  Meta rows:", metaRows.length);

// TikTok
const tiktokRows = parseRawFile(tiktokFile);
tiktokRows.forEach(r => {
  const name = r.tiktok_ads_adgroup_name || r.adgroup_name || "";
  const spend = r.tiktok_ads_spend || r.spend || 0;
  addSpend(r.date, "t", extractTiktokSlug(name), spend);
});
console.log("  TikTok rows:", tiktokRows.length);

// Google non-PMAX
const googleRows = parseRawFile(googleFile);
googleRows.forEach(r => {
  addSpend(r.date, "g", extractGoogleSlug(r.google_ads_campaign_name||"", r.google_ads_ad_group_name||""), r.google_ads_cost_micros);
});
console.log("  Google non-PMAX rows:", googleRows.length);

// Google PMAX
const pmaxRows = parseRawFile(pmaxFile);
pmaxRows.forEach(r => {
  addSpend(r.date, "g", extractPmaxSlug(r.google_ads_asset_group_name||""), r.google_ads_cost_micros);
});
console.log("  Google PMAX rows:", pmaxRows.length);

// Round
Object.keys(result).forEach(day => {
  ["m","t","g"].forEach(p => {
    Object.keys(result[day][p]).forEach(slug => {
      result[day][p][slug] = Math.round(result[day][p][slug] * 100) / 100;
      if (result[day][p][slug] <= 0) delete result[day][p][slug];
    });
  });
});

// Merge into data.json
let data = { v: 1, updated: "", days: {} };
if (fs.existsSync(DATA_PATH)) {
  try { data = JSON.parse(fs.readFileSync(DATA_PATH, "utf8")); } catch(e) {}
}
if (!data.days) data.days = {};

const newDays = Object.keys(result);
newDays.forEach(day => { data.days[day] = result[day]; });
data.updated = new Date().toISOString().slice(0,7);

fs.writeFileSync(DATA_PATH, JSON.stringify(data), "utf8");
console.log("✅ " + newDays.length + " días nuevos escritos. Total en data.json: " + Object.keys(data.days).length);
