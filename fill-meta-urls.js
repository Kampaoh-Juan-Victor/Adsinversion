#!/usr/bin/env node
// fill-meta-urls.js — Rellena el cache de URLs creativas de Meta para todos los
// ad_ids en meta-ads-data.json, luego añade la columna dest_url al archivo.
// No re-fetcha métricas — solo URLs.

require("dotenv").config();
const https = require("https");
const fs    = require("fs");
const path  = require("path");

const ACCESS_TOKEN   = process.env.META_ACCESS_TOKEN;
const API_VERSION    = "v21.0";
const META_ADS_PATH  = path.join(__dirname, "meta-ads-data.json");
const URL_CACHE_PATH = path.join(__dirname, "meta-ad-urls.json");
const PROPERTY_MAP_PATH = path.join(__dirname, "property-map.json");

const { extractDestination } = require("./destinos-config");

// Construir mapa property_id → slug desde property-map.json
const _propertyMap = fs.existsSync(PROPERTY_MAP_PATH)
  ? JSON.parse(fs.readFileSync(PROPERTY_MAP_PATH, "utf8"))
  : {};
const PROPERTY_SLUG_MAP = {};
for (const [id, name] of Object.entries(_propertyMap)) {
  const slug = extractDestination(name);
  if (slug !== "sin-etiquetar") PROPERTY_SLUG_MAP[id] = slug;
}

function extractSlugFromUrl(url) {
  if (!url) return "sin-etiquetar";
  try {
    const u = new URL(url);
    if (u.hostname === "booking.kampaoh.com") {
      const m = u.pathname.match(/\/property\/(\d+)/);
      if (m && PROPERTY_SLUG_MAP[m[1]]) return PROPERTY_SLUG_MAP[m[1]];
    }
    const parts = u.pathname.split("/").filter(Boolean);
    for (const part of parts) {
      const slug = extractDestination(part);
      if (slug !== "sin-etiquetar") return slug;
    }
  } catch(e) {}
  return "sin-etiquetar";
}

function apiGet(endpoint, params) {
  return new Promise((resolve, reject) => {
    params.access_token = ACCESS_TOKEN;
    const qs = new URLSearchParams(params).toString();
    const options = {
      hostname: "graph.facebook.com",
      path: `/${API_VERSION}/${endpoint}?${qs}`,
      method: "GET",
    };
    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", c => body += c);
      res.on("end", () => {
        try { resolve(JSON.parse(body)); }
        catch(e) { reject(new Error("JSON parse error: " + body.slice(0,200))); }
      });
    });
    req.on("error", reject);
    req.end();
  });
}

async function fetchAdCreativeUrls(adIds, cache) {
  const missing = adIds.filter(id => id && !(id in cache));
  if (!missing.length) return;
  const BATCH = 50;
  let done = 0;
  for (let i = 0; i < missing.length; i += BATCH) {
    const chunk = missing.slice(i, i + BATCH);
    try {
      const res = await apiGet("", {
        ids: chunk.join(","),
        fields: "creative{object_url,link_url,call_to_action{value{link}},object_story_spec{link_data{link},video_data{call_to_action{value{link}}}}}",
      });
      for (const [id, data] of Object.entries(res)) {
        if (!data || data.error) { cache[id] = "sin-etiquetar"; continue; }
        const cr = data.creative || {};
        const spec = cr.object_story_spec || {};
        const url =
          (cr.call_to_action && cr.call_to_action.value && cr.call_to_action.value.link) ||
          (spec.link_data && spec.link_data.link) ||
          (spec.video_data && spec.video_data.call_to_action && spec.video_data.call_to_action.value && spec.video_data.call_to_action.value.link) ||
          cr.object_url || cr.link_url || "";
        cache[id] = extractSlugFromUrl(url);
      }
    } catch(e) {
      console.error("  Batch error:", e.message);
      chunk.forEach(id => { if (!(id in cache)) cache[id] = "sin-etiquetar"; });
    }
    done += chunk.length;
    process.stdout.write(`\r  ${done}/${missing.length} consultados...`);
  }
  console.log();
}

async function main() {
  // 1. Leer datos actuales
  const metaData = JSON.parse(fs.readFileSync(META_ADS_PATH, "utf8"));
  const AD_ID_COL = metaData.cols.indexOf("ad_id");
  const uniqueAdIds = [...new Set(metaData.rows.map(r => r[AD_ID_COL]).filter(Boolean))];
  console.log(`  ${uniqueAdIds.length} ad_ids únicos en meta-ads-data.json`);

  // 2. Cargar cache y rellenar
  const cache = fs.existsSync(URL_CACHE_PATH)
    ? JSON.parse(fs.readFileSync(URL_CACHE_PATH, "utf8"))
    : {};
  const missing = uniqueAdIds.filter(id => !(id in cache));
  console.log(`  En cache: ${uniqueAdIds.length - missing.length} | Por consultar: ${missing.length}`);

  if (missing.length > 0) {
    console.log("  Consultando API de Meta...");
    await fetchAdCreativeUrls(uniqueAdIds, cache);
    fs.writeFileSync(URL_CACHE_PATH, JSON.stringify(cache), "utf8");
    console.log("  Cache guardado →", URL_CACHE_PATH);
  } else {
    console.log("  Cache ya completo.");
  }

  // 3. Reconstruir con dest_url
  const withSlug = Object.values(cache).filter(v => v && v !== "sin-etiquetar").length;
  console.log(`  Con URL de destino: ${withSlug} / ${Object.keys(cache).length} ad_ids`);

  // 4. Añadir columna dest_url si no existe
  const hasDest = metaData.cols.includes("dest_url");
  if (!hasDest) {
    metaData.cols.push("dest_url");
    metaData.rows = metaData.rows.map(r => {
      const adId = r[AD_ID_COL];
      return [...r, cache[adId] || "sin-etiquetar"];
    });
    metaData.updated = new Date().toISOString().slice(0, 10);
    fs.writeFileSync(META_ADS_PATH, JSON.stringify(metaData), "utf8");
    console.log("  meta-ads-data.json actualizado con columna dest_url ✓");
  } else {
    // Actualizar valores existentes (re-aplica lógica mejorada)
    const DEST_URL_COL = metaData.cols.indexOf("dest_url");
    metaData.rows = metaData.rows.map(r => {
      const adId = r[AD_ID_COL];
      const updated = [...r];
      updated[DEST_URL_COL] = cache[adId] || "sin-etiquetar";
      return updated;
    });
    metaData.updated = new Date().toISOString().slice(0, 10);
    fs.writeFileSync(META_ADS_PATH, JSON.stringify(metaData), "utf8");
    console.log("  meta-ads-data.json actualizado con dest_url revisado ✓");
  }

  // 5. Resumen de destinos encontrados por URL
  const destCount = {};
  for (const [id, slug] of Object.entries(cache)) {
    if (slug && slug !== "sin-etiquetar") {
      destCount[slug] = (destCount[slug] || 0) + 1;
    }
  }
  const sorted = Object.entries(destCount).sort((a,b) => b[1]-a[1]);
  console.log(`\n  Destinos detectados por URL (${sorted.length} destinos, ${Object.values(destCount).reduce((a,b)=>a+b,0)} anuncios):`);
  sorted.forEach(([slug, n]) => console.log(`    ${slug.padEnd(25)} ${n}`));
}

main().catch(e => { console.error("❌", e.message); process.exit(1); });
