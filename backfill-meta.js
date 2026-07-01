#!/usr/bin/env node
// backfill-meta.js — Procesa un fichero raw de Porter (Meta) y actualiza data.json
// Uso: node backfill-meta.js <raw-porter-file.json>
// El fichero JSON debe tener el schema de porter-reporting.query_data:
//   { columns: [...], rows: [[adset_name, date_YYYYMMDD, spend], ...] }

const fs   = require("fs");
const path = require("path");

const rawFile = process.argv[2];
if (!rawFile || !fs.existsSync(rawFile)) {
  console.error("Uso: node backfill-meta.js <raw-porter-file.json>");
  process.exit(1);
}

const DIR       = path.dirname(__filename);
const DATA_PATH = path.join(DIR, "data.json");

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
  if (n.includes("cabaneros") || n.includes("cabañeros")) return "cabañeros";
  if (n.includes("cordoba")) return "cordoba";
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

function extractMetaSlug(adsetName) {
  return slugFromText(normalize(adsetName)) || "sin-etiquetar";
}

// Leer fichero raw de Porter
const raw = JSON.parse(fs.readFileSync(rawFile, "utf8"));
const cols = raw.columns;

// Determinar índices de columnas (el orden puede variar)
const iDate  = cols.indexOf("facebook_ads_date");
const iName  = cols.indexOf("facebook_ads_adset_name");
const iSpend = cols.indexOf("facebook_ads_spend");

if (iDate === -1 || iName === -1 || iSpend === -1) {
  console.error("Columnas esperadas: facebook_ads_date, facebook_ads_adset_name, facebook_ads_spend");
  console.error("Columnas encontradas:", cols);
  process.exit(1);
}

// Agregar por (date, slug)
const byDay = {};
let skipped = 0;

for (const row of raw.rows) {
  const rawDate = String(row[iDate]);
  const adset   = row[iName] || "";
  const spend   = parseFloat(row[iSpend]) || 0;
  if (spend <= 0) { skipped++; continue; }

  // Normalizar fecha a YYYY-MM-DD
  const date = rawDate.length === 8
    ? rawDate.slice(0,4)+"-"+rawDate.slice(4,6)+"-"+rawDate.slice(6,8)
    : rawDate.slice(0,10);

  const slug = extractMetaSlug(adset);
  if (!byDay[date]) byDay[date] = {};
  byDay[date][slug] = Math.round(((byDay[date][slug] || 0) + spend) * 100) / 100;
}

// Merge en data.json
let data = { v: 1, updated: "", days: {} };
if (fs.existsSync(DATA_PATH)) {
  try { data = JSON.parse(fs.readFileSync(DATA_PATH, "utf8")); } catch(e) {}
}
if (!data.days) data.days = {};

let updated = 0;
for (const [date, slugMap] of Object.entries(byDay)) {
  if (!data.days[date]) data.days[date] = { m:{}, t:{}, g:{} };
  data.days[date].m = slugMap;
  updated++;
}

data.updated = new Date().toISOString().slice(0,10);
fs.writeFileSync(DATA_PATH, JSON.stringify(data), "utf8");

console.log(`✅ ${rawFile}`);
console.log(`   Filas procesadas: ${raw.rows.length - skipped} | Skipped (spend=0): ${skipped}`);
console.log(`   Días actualizados en data.json: ${updated}`);
