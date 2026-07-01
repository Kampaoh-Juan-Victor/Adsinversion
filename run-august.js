#!/usr/bin/env node
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const DIR = path.dirname(__filename);
const TMP_PATH = path.join(DIR, "data-tmp-2025-08.json");

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

const PMAX_SLUG_RULES = `
Normaliza el asset_group_name de PMAX al slug canónico:
- Quita acentos: "ría"→"ria", "córdoba"→"cordoba", "doñana"→"donana", "mendigorría"→"mendigorria", "platja d'aro"→"platja-de-aro"
- "palmar" → el-palmar
- "doñana" / "donana" → donana
- "los-caños" / "caños" / "canos" / "conil" → conil
- "platjadaro" / "platja-de-aro" → platja-de-aro
- "ría-de-vigo" / "ria-de-vigo" → ria-de-vigo
- El resto de asset_group_names ya son slugs canónicos directamente (las-arenas, isla-cristina, tarifa, etc.)
  Aplica también las SLUG_RULES generales si hay dudas.`.trim();

const PROMPT = `Consulta Portermetrics para el período 2025-08-01 a 2025-08-31 y escribe el resultado en ${TMP_PATH}.

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

Para cada fila: extrae el slug del nombre. Agrega el gasto por (date, slug) dentro de cada plataforma. Los pasos 3 y 4 se combinan en un único diccionario "g". Redondea a 2 decimales.

Escribe EXACTAMENTE este JSON en ${TMP_PATH} con el tool Write (nada más):
{
  "YYYY-MM-DD": {
    "m": { "slug": gasto_meta_ese_dia, ... },
    "t": { "slug": gasto_tiktok_ese_dia, ... },
    "g": { "slug": gasto_google_ese_dia, ... }
  },
  ... (una entrada por cada día con datos)
}
Incluye solo días y slugs con gasto > 0. Si una plataforma no tiene datos un día, omite esa clave o usa {}.`;

if (fs.existsSync(TMP_PATH)) fs.unlinkSync(TMP_PATH);

const escaped = PROMPT.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, ' ');

execSync(
  `claude -p "${escaped}" --allowedTools "mcp__claude_ai_Portermetrics__query_data,mcp__claude_ai_Portermetrics__list_known_accounts,mcp__claude_ai_Portermetrics__list_user_accounts,Write,Read"`,
  { stdio: "inherit", cwd: DIR, timeout: 540000 }
);

if (fs.existsSync(TMP_PATH)) {
  console.log("✅ data-tmp-2025-08.json generado");
  const d = JSON.parse(fs.readFileSync(TMP_PATH, "utf8"));
  console.log("   Días con datos:", Object.keys(d).length);
} else {
  console.error("❌ No se generó el archivo");
  process.exit(1);
}
