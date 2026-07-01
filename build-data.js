#!/usr/bin/env node
// build-data.js — Carga histórica de data.json desde Portermetrics (2025-01 → hoy)
// Uso: node build-data.js
// Ejecutar UNA sola vez. Tarda ~1h. Puede interrumpirse y reanudarse.

const { execSync } = require("child_process");
const fs   = require("fs");
const path = require("path");

const DIR       = path.dirname(__filename);
const DATA_PATH = path.join(DIR, "data.json");

// ── Meses a procesar ──────────────────────────────────────────────────────────
function generateMonths(startYear, startMonth, endYear, endMonth) {
  const result = [];
  let y = startYear, m = startMonth;
  const today = new Date().toISOString().slice(0, 10);
  while (y < endYear || (y === endYear && m <= endMonth)) {
    const from = y + "-" + String(m).padStart(2, "0") + "-01";
    const lastDay = new Date(y, m, 0).getDate();
    const rawTo = y + "-" + String(m).padStart(2, "0") + "-" + String(lastDay).padStart(2, "0");
    const to = rawTo > today ? today : rawTo;
    result.push([from, to]);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return result;
}

const FORCE = process.argv.includes("--force");
const now = new Date();
const MONTHS = generateMonths(2025, 1, now.getFullYear(), now.getMonth() + 1);

// ── Cargar estado actual ───────────────────────────────────────────────────────
let data = { v: 1, updated: "", days: {} };
if (fs.existsSync(DATA_PATH)) {
  try { data = JSON.parse(fs.readFileSync(DATA_PATH, "utf8")); } catch(e) {}
}
if (!data.days) data.days = {};

const existingDays = new Set(Object.keys(data.days));

// ── Reglas de slug ────────────────────────────────────────────────────────────
const SLUG_RULES = `
Extrae el slug de destino del nombre del anuncio/adset/grupo aplicando estas reglas (primera coincidencia):
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
- "sao martinho"/"martinho"/"porto" → martinho-do-porto; "puerto santa maria"/"puerto santa"/"puerto sta" → puerto-santa-maria
- "somo parque" → somo-parque; "somo" → somo-playa; "conil"/"canos"/"caños" → conil
- "tarifa" → tarifa; "trafalgar" → trafalgar; "calella" → calella; "tossa" → tossa-de-mar; "menorca" → menorca
- "alquezar" → alquezar; "neptuno" → neptuno; "navajas" → navajas; "blanes" → blanes; "palamos" → palamos
- "donana"/"doñana" → donana; "benicassim" → benicassim; "mendigorria" → mendigorria; "llanes" → llanes
- "cambrils" → cambrils; "crevillent" → crevillent; "roquetas" → roquetas; "tavira" → tavira; "zumaia" → zumaia
- "estepona" → estepona; "lagoa" → lagoa; "oyambre" → oyambre; "ruiloba" → ruiloba
- "cabaneros"/"cabañeros" → cabañeros; "cordoba"/"córdoba" → cordoba; "paloma" → paloma
- "pedroso" → pedroso; "rianxo" → rianxo; "grazalema" → grazalema; "almadrava" → almadrava
- "flumendosa" → flumendosa; "lisboa" → lisboa; "guarda" → a-guarda; "deva" → deva; "cova negra" → cova-negra
- Google Search: Formato Search_Tipo_SLUG → extrae último segmento y aplica reglas anteriores.
  Campaña "Search_Marca_palmar" → el-palmar; "Search_No-Marca_isla-cristina" → isla-cristina.
  Si el segmento es genérico (Marca, No-Marca, Campings, Competencia, CCAA, Provincia, Verano, España, LKL sin destino claro) → sin-etiquetar.
- Google GenDemand, Display, Video, YouTube genérico → sin-etiquetar.
- PMAX: NO aparece en este paso (se trata en paso 4 con asset groups).
- Todo lo demás → sin-etiquetar`.trim();

// ── Reglas de slug para PMAX asset groups ────────────────────────────────────
const PMAX_SLUG_RULES = `
Normaliza el asset_group_name de PMAX al slug canónico:
- Quita acentos: "ría"→"ria", "córdoba"→"cordoba", "doñana"→"donana", "mendigorría"→"mendigorria", "platja d'aro"→"platja-de-aro"
- "palmar" → el-palmar
- "doñana" / "donana" → donana
- "los-caños" / "caños" / "canos" / "conil" → conil
- "platjadaro" / "platja-de-aro" → platja-de-aro
- "ría-de-vigo" / "ria-de-vigo" → ria-de-vigo
- El resto de asset_group_names ya son slugs canónicos directamente (las-arenas, isla-cristina, tarifa, etc.)
  Aplica también las SLUG_RULES generales si hay dudas.
`.trim();

// ── Procesar cada mes ─────────────────────────────────────────────────────────
console.log("🏗️  Construcción de data.json — " + MONTHS.length + " meses a procesar");
console.log("📊 Días ya cargados: " + existingDays.size);
console.log("");

let processed = 0;
let skipped   = 0;

for (const [from, to] of MONTHS) {
  const monthKey = from.slice(0, 7);

  // Comprobar si este mes ya está completo (todos los días del rango en data.days)
  const fromD = new Date(from + "T00:00:00Z");
  const toD   = new Date(to   + "T00:00:00Z");
  let allPresent = true;
  for (let d = new Date(fromD); d <= toD; d.setUTCDate(d.getUTCDate() + 1)) {
    if (!existingDays.has(d.toISOString().slice(0, 10))) { allPresent = false; break; }
  }
  if (!FORCE && allPresent) {
    console.log("⏭️  " + monthKey + " — ya está en data.json, saltando");
    skipped++;
    continue;
  }
  if (FORCE && allPresent) {
    console.log("🔄 " + monthKey + " — forzando reprocesado (--force)");
  }

  console.log("📥 " + monthKey + " (" + from + " → " + to + ")...");

  const tmpPath = path.join(DIR, "data-tmp-" + monthKey + ".json");

  const PROMPT = `
Consulta Portermetrics para el período ${from} a ${to} y escribe el resultado en ${tmpPath}.

1. Meta Ads España + Francia (sourceUserId: facebook-ads-victorarias@kampaoh.com)
   Campos: date, adset_name, amount_spent (o spend). Límite: 10000 filas.

2. TikTok Ads Kampaoh1221 (id: 7044164688510255106, sourceUserId: tiktok-ads-victorarias@kampaoh.com)
   Campos: date, adgroup_name, spend. Límite: 10000 filas.

3. Google Ads (SIN PMAX) — Adwords Kampaoh (id: 4052984517-4052984517, sourceUserId: google-ads-103062776159609254731)
   Campos: date, google_ads_campaign_name, google_ads_ad_group_name, google_ads_cost_micros. Límite: 10000 filas.
   Filtro obligatorio: google_ads_campaign_name NOT contains "PMAX".
   Aplica SLUG_RULES al google_ads_ad_group_name para obtener el slug de destino.

4. Google Ads PMAX por asset group — misma cuenta Google.
   Campos: date, google_ads_campaign_name, google_ads_asset_group_name, google_ads_cost_micros. Límite: 10000 filas.
   Filtro obligatorio: google_ads_campaign_name contains "PMAX".
   Aplica PMAX_SLUG_RULES al google_ads_asset_group_name para obtener el slug de destino.
   FUSIONA el resultado con el gasto Google del paso 3: misma clave (date, slug), suma los importes.

${SLUG_RULES}

${PMAX_SLUG_RULES}

Para cada fila: extrae el slug del nombre. Agrega el gasto por (date, slug) dentro de cada plataforma.
Los pasos 3 y 4 se combinan en un único diccionario "g". Redondea a 2 decimales.

Escribe EXACTAMENTE este JSON en ${tmpPath} con el tool Write:
{
  "YYYY-MM-DD": {
    "m": { "slug": gasto_meta_ese_dia, ... },
    "t": { "slug": gasto_tiktok_ese_dia, ... },
    "g": { "slug": gasto_google_ese_dia, ... }
  },
  ... (una entrada por cada día con datos)
}
Incluye solo días y slugs con gasto > 0. Si una plataforma no tiene datos un día, omite esa clave o usa {}.
  `.trim();

  try {
    if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);

    execSync(
      `claude -p "${PROMPT.replace(/"/g, '\\"').replace(/\n/g, ' ')}" --allowedTools "mcp__claude_ai_Portermetrics__query_data,mcp__claude_ai_Portermetrics__list_known_accounts,mcp__claude_ai_Portermetrics__list_user_accounts,Write,Read"`,
      { stdio: "inherit", cwd: DIR }
    );

    if (!fs.existsSync(tmpPath)) {
      console.warn("⚠️  " + monthKey + ": Claude no generó el fichero temporal, saltando");
      continue;
    }

    const monthData = JSON.parse(fs.readFileSync(tmpPath, "utf8"));

    // Merge en data
    for (const day of Object.keys(monthData)) {
      data.days[day] = monthData[day];
      existingDays.add(day);
    }
    data.updated = to;

    // Guardar data.json después de cada mes (permite reanudar si se interrumpe)
    fs.writeFileSync(DATA_PATH, JSON.stringify(data), "utf8");
    fs.unlinkSync(tmpPath);

    processed++;
    console.log("   ✅ " + Object.keys(monthData).length + " días añadidos. Total: " + Object.keys(data.days).length);
  } catch(e) {
    console.error("   ❌ Error en " + monthKey + ": " + e.message);
    if (fs.existsSync(tmpPath)) {
      try {
        const partial = JSON.parse(fs.readFileSync(tmpPath, "utf8"));
        Object.assign(data.days, partial);
        data.updated = to;
        fs.writeFileSync(DATA_PATH, JSON.stringify(data), "utf8");
        console.log("   ♻️  Datos parciales guardados");
      } catch(_) {}
    }
  }
}

console.log("");
console.log("🏁 Build completado. Procesados: " + processed + ", Saltados: " + skipped);
console.log("   Total días en data.json: " + Object.keys(data.days).length);
