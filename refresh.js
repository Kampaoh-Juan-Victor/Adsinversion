#!/usr/bin/env node
// refresh.js — Añade el día de ayer (o una fecha concreta) a data.json
// Uso:
//   node refresh.js                  → procesa ayer
//   node refresh.js --date=2026-05-20
// Cron diario a las 8:00: 0 8 * * * cd "/Users/victorarias/Documents/Ads inversión" && node refresh.js >> refresh.log 2>&1

const { execSync } = require("child_process");
const fs   = require("fs");
const path = require("path");

const DIR      = path.dirname(__filename);
const DATA_PATH = path.join(DIR, "data.json");
const TMP_PATH  = path.join(DIR, "data-tmp.json");

// ── Fecha a procesar ──────────────────────────────────────────────────────────
const args    = process.argv.slice(2);
const dateArg = (args.find(a => a.startsWith("--date=")) || "").split("=")[1];

function yesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}
const dateStr = dateArg || yesterday();

console.log("🔄 Actualizando data.json para " + dateStr + "...");
console.log("📅 " + new Date().toLocaleString("es-ES"));

// ── Prompt para Claude ────────────────────────────────────────────────────────
const SLUG_RULES = `
Extrae el slug de destino del nombre del anuncio/adset/grupo aplicando estas reglas en orden (primera coincidencia):
- "somo parque" → somo-parque; "kikopark rural" → kikopark-rural; "kikopark playa"/"kikopark" → kikopark-playa
- "costa brava" → costa-brava; "costa blanca" → costa-blanca; "la franca"/"franca" → la-franca
- "sierra nevada"/"nevada" → sierra-nevada; "sierra urbasa"/"urbasa" → sierra-de-urbasa
- "playa de levante"/"playa levante"/"levante" → playa-de-levante; "playa troenzo"/"troenzo" → playa-troenzo
- "los escullos"/"escullos" → los-escullos; "isla cristina"/"isla" → isla-cristina
- "lago de arcos"/"lago arcos" → lago-de-arcos; "santillana del mar"/"santillana" → santillana-del-mar
- "fonts d'algar"/"fonts algar"/"algar" → fonts-dalgar; "delta del ebro"/"delta ebro"/"ebro" → delta-ebro
- "ria de vigo"/"vigo" → ria-de-vigo; "platja de aro"/"platja d'aro"/"platjadaro"/"platja" → platja-de-aro
- "bayona playa"/"bayona" → bayona-playa; "el palmar"/"palmar" → el-palmar; "las arenas"/"arenas" → las-arenas
- "el rocio"/"rocio" → el-rocio; "o pedrouzo"/"pedrouzo" → o-pedrouzo
- "sao martinho"/"martinho"/"porto" → martinho-do-porto
- "puerto santa maria"/"puerto santa"/"puerto sta" → puerto-santa-maria
- "somo parque" → somo-parque; "somo" → somo-playa
- "canos"/"caños" → canos; "conil" → conil; "tarifa" → tarifa; "trafalgar" → trafalgar
- "calella" → calella; "tossa" → tossa-de-mar; "menorca" → menorca; "alquezar" → alquezar
- "neptuno" → neptuno; "navajas" → navajas; "blanes" → blanes; "palamos" → palamos
- "donana"/"doñana" → donana; "benicassim" → benicassim; "mendigorria" → mendigorria
- "llanes" → llanes; "cambrils" → cambrils; "crevillent" → crevillent; "roquetas" → roquetas
- "tavira" → tavira; "zumaia" → zumaia; "estepona" → estepona; "lagoa" → lagoa
- "oyambre" → oyambre; "ruiloba" → ruiloba; "cabaneros"/"cabañeros" → cabañeros
- "cordoba"/"córdoba" → cordoba; "paloma" → paloma; "pedroso" → pedroso; "rianxo" → rianxo
- "grazalema" → grazalema; "almadrava" → almadrava; "flumendosa" → flumendosa
- "lisboa" → lisboa; "guarda" → a-guarda; "deva" → deva; "cova negra" → cova-negra
- Google Search: formato Search_Tipo_SLUG → extrae el último segmento y aplica reglas. Si es genérico (Marca, No-Marca, Campings, Competencia, CCAA, Provincia, Verano, España) → sin-etiquetar.
- Google GenDemand, Display, Video, YouTube genérico → sin-etiquetar.
- PMAX: NO se procesa aquí, se trata en paso 4 con asset groups.
- Todo lo demás → sin-etiquetar`.trim();

const PMAX_SLUG_RULES = `
Normaliza el asset_group_name de PMAX al slug canónico:
- "palmar" → el-palmar; "doñana"/"donana" → donana; "los-caños"/"caños" → conil
- "platjadaro"/"platja-de-aro" → platja-de-aro; "ría-de-vigo" → ria-de-vigo
- "mendigorría" → mendigorria; quita acentos en general
- El resto ya son slugs canónicos directamente (las-arenas, isla-cristina, tarifa, etc.)
`.trim();

const PROMPT = `
Consulta Portermetrics para el día ${dateStr} y escribe el resultado en el fichero ${TMP_PATH}.

1. Meta Ads España + Francia — usa mcp__claude_ai_Portermetrics__query_data.
   sourceUserId: facebook-ads-victorarias@kampaoh.com
   Campos: facebook_ads_date, facebook_ads_adset_name, facebook_ads_spend. date_from:"${dateStr}", date_to:"${dateStr}".
   Cuentas: act_2068744546681151 (España) y act_3652417178310478 (Francia).
   El campo de gasto es facebook_ads_spend (string numérico). Convierte a float para sumar.

2. TikTok Ads Kampaoh1221 (id: 7044164688510255106, sourceUserId: tiktok-ads-victorarias@kampaoh.com)
   Campos: date, adgroup_name, spend. Mismo rango.

3. Google Ads (SIN PMAX) — Adwords Kampaoh (id: 4052984517-4052984517, sourceUserId: google-ads-103062776159609254731)
   Campos: date, google_ads_campaign_name, google_ads_ad_group_name, google_ads_cost_micros. Mismo rango.
   Filtro: google_ads_campaign_name NOT contains "PMAX".

4. Google Ads PMAX por asset group — misma cuenta.
   Campos: date, google_ads_campaign_name, google_ads_asset_group_name, google_ads_cost_micros. Mismo rango.
   Filtro: google_ads_campaign_name contains "PMAX".
   Aplica PMAX_SLUG_RULES al asset_group_name. FUSIONA con el gasto Google del paso 3.

${SLUG_RULES}

${PMAX_SLUG_RULES}

Para cada fila: extrae el slug. Los pasos 3 y 4 se combinan en un único diccionario "g".
Agrega el gasto por slug dentro de cada plataforma. Redondea a 2 decimales.

Escribe EXACTAMENTE este JSON en ${TMP_PATH} usando el tool Write (nada más):
{
  "${dateStr}": {
    "m": { "slug": gasto_meta, ... },
    "t": { "slug": gasto_tiktok, ... },
    "g": { "slug": gasto_google, ... }
  }
}
Incluye solo slugs con gasto > 0. Si una plataforma no tiene datos ese día, usa {}.
`.trim();

// ── Ejecutar Claude ───────────────────────────────────────────────────────────
try {
  if (fs.existsSync(TMP_PATH)) fs.unlinkSync(TMP_PATH);

  execSync(
    `claude -p "${PROMPT.replace(/"/g, '\\"').replace(/\n/g, ' ')}" --allowedTools "mcp__claude_ai_Portermetrics__query_data,mcp__claude_ai_Portermetrics__list_known_accounts,mcp__claude_ai_Portermetrics__list_user_accounts,Write,Read"`,
    { stdio: "inherit", cwd: DIR }
  );

  if (!fs.existsSync(TMP_PATH)) {
    console.error("❌ Claude no generó data-tmp.json");
    process.exit(1);
  }

  // ── Merge en data.json ──────────────────────────────────────────────────────
  const dayData = JSON.parse(fs.readFileSync(TMP_PATH, "utf8"));

  let data = { v: 1, updated: "", days: {} };
  if (fs.existsSync(DATA_PATH)) {
    try { data = JSON.parse(fs.readFileSync(DATA_PATH, "utf8")); } catch(e) {}
  }
  if (!data.days) data.days = {};

  Object.assign(data.days, dayData);
  data.updated = dateStr;

  fs.writeFileSync(DATA_PATH, JSON.stringify(data), "utf8");
  fs.unlinkSync(TMP_PATH);

  console.log("✅ data.json actualizado con datos del " + dateStr);
  console.log("   Total días en data.json: " + Object.keys(data.days).length);
} catch(e) {
  console.error("❌ Error:", e.message);
  process.exit(1);
}
