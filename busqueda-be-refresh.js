#!/usr/bin/env node
// busqueda-be-refresh.js — Búsquedas en booking.kampaoh.com via GA4
// Tipos: zona (/search?label=...) y propiedad (/property/{ID}?checkin=...)
//
// Schema de fila: [date, type, label, checkin, checkout, adults, children, babies, fpa, count]
//   type: "zona" | "propiedad"
//
// Uso:
//   node busqueda-be-refresh.js                              → filtrado, últimos 30 días
//   node busqueda-be-refresh.js --all                        → todo el tráfico, últimos 14 días
//   node busqueda-be-refresh.js --from=2026-06-01 --to=2026-06-30

const { BetaAnalyticsDataClient } = require("@google-analytics/data");
const fs = require("fs");
const path = require("path");

const PROPERTY_ID      = "347358752";
const CREDENTIALS_PATH = path.join(__dirname, "ga4-credentials.json");
const PROP_MAP_PATH    = path.join(__dirname, "property-map.json");

// Modo --all: sin filtro de pageReferrer, guarda en archivo separado
const IS_ALL  = process.argv.includes("--all");
const DATA_PATH = path.join(__dirname, IS_ALL ? "busqueda-be-data-all.json" : "busqueda-be-data.json");

const client = new BetaAnalyticsDataClient({ keyFilename: CREDENTIALS_PATH });

// Mapa ID numérico → nombre canónico de la propiedad
const PROP_MAP = fs.existsSync(PROP_MAP_PATH)
  ? JSON.parse(fs.readFileSync(PROP_MAP_PATH, "utf8"))
  : {};

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

// ── Parsers ────────────────────────────────────────────────────────────────

function parseSearchUrl(url) {
  try {
    const qIdx = url.indexOf("?");
    if (qIdx === -1) return null;
    const params = new URLSearchParams(url.slice(qIdx + 1));

    const label   = (params.get("label") || "").trim();
    const checkin  = params.get("checkin")  || "";
    const checkout = params.get("checkout") || "";

    if (!label || !checkin || !checkout) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(checkin) || !/^\d{4}-\d{2}-\d{2}$/.test(checkout)) return null;

    return {
      type: "zona",
      label,
      checkin,
      checkout,
      adults:   parseInt(params.get("adults")   || "0") || 0,
      children: parseInt(params.get("children") || "0") || 0,
      babies:   parseInt(params.get("babies")   || "0") || 0,
      fpa:      params.get("fpa") === "pets" ? 1 : 0,
    };
  } catch(e) {
    return null;
  }
}

function parsePropertyUrl(url, pageTitle) {
  try {
    if (!url.includes("/property/")) return null;
    const qIdx = url.indexOf("?");
    if (qIdx === -1) return null;
    const params = new URLSearchParams(url.slice(qIdx + 1));

    const checkin  = params.get("checkin")  || "";
    const checkout = params.get("checkout") || "";

    // Sin fechas = navegación normal, no búsqueda
    if (!checkin && !checkout) return null;
    if (checkin  && !/^\d{4}-\d{2}-\d{2}$/.test(checkin))  return null;
    if (checkout && !/^\d{4}-\d{2}-\d{2}$/.test(checkout)) return null;

    // Nombre desde pageTitle: quitar " · Kampaoh" al final
    const label = (pageTitle || "")
      .replace(/\s*·\s*Kampaoh\s*$/i, "")
      .replace(/\s*\|\s*Kampaoh\s*$/i, "")
      .trim();
    if (!label) return null;

    return {
      type:     "propiedad",
      label,
      checkin:  checkin  || checkout,
      checkout: checkout || checkin,
      adults:   parseInt(params.get("adults")   || "0") || 0,
      children: parseInt(params.get("children") || "0") || 0,
      babies:   parseInt(params.get("babies")   || "0") || 0,
      fpa:      params.get("fpa") === "pets" ? 1 : 0,
    };
  } catch(e) {
    return null;
  }
}

// ── GA4 fetchers ───────────────────────────────────────────────────────────

async function fetchAllSearch(dateFrom, dateTo) {
  const allRows = [];
  let offset = 0;
  const pageSize = 10000;

  while (true) {
    const [response] = await client.runReport({
      property: `properties/${PROPERTY_ID}`,
      dimensions: [{ name: "pageLocation" }, { name: "date" }],
      metrics:    [{ name: "activeUsers" }],
      dimensionFilter: {
        andGroup: {
          expressions: [
            { filter: { fieldName: "eventName",    stringFilter: { matchType: "EXACT",    value: "page_view" } } },
            { filter: { fieldName: "pageLocation", stringFilter: { matchType: "CONTAINS", value: "booking.kampaoh.com/search?" } } },
            ...(!IS_ALL ? [{ filter: { fieldName: "pageReferrer", stringFilter: { matchType: "CONTAINS", value: "booking.kampaoh.com" } } }] : []),
          ],
        },
      },
      dateRanges: [{ startDate: dateFrom, endDate: dateTo }],
      limit:  pageSize,
      offset,
    }, { timeout: 60000 });

    const rows = response.rows || [];
    for (const r of rows) allRows.push(r);
    if (rows.length < pageSize) break;
    offset += pageSize;
  }

  return allRows;
}

async function fetchAllProperty(dateFrom, dateTo) {
  const allRows = [];
  let offset = 0;
  const pageSize = 10000;

  while (true) {
    const [response] = await client.runReport({
      property: `properties/${PROPERTY_ID}`,
      dimensions: [
        { name: "pageLocation" },
        { name: "date" },
        { name: "pageTitle" },
      ],
      metrics:    [{ name: "activeUsers" }],
      dimensionFilter: {
        andGroup: {
          expressions: [
            { filter: { fieldName: "eventName",    stringFilter: { matchType: "EXACT",    value: "page_view" } } },
            { filter: { fieldName: "pageLocation", stringFilter: { matchType: "CONTAINS", value: "booking.kampaoh.com/property/" } } },
            { filter: { fieldName: "pageLocation", stringFilter: { matchType: "CONTAINS", value: "checkin=" } } },
            ...(!IS_ALL ? [{ filter: { fieldName: "pageReferrer", stringFilter: { matchType: "CONTAINS", value: "booking.kampaoh.com" } } }] : []),
          ],
        },
      },
      dateRanges: [{ startDate: dateFrom, endDate: dateTo }],
      limit:  pageSize,
      offset,
    }, { timeout: IS_ALL ? 300000 : 120000 });

    const rows = response.rows || [];
    for (const r of rows) allRows.push(r);
    process.stdout.write(`\r  → /property: ${allRows.length} filas...`);
    if (rows.length < pageSize) break;
    offset += pageSize;
  }
  process.stdout.write('\n');

  return allRows;
}

// ── Main refresh ───────────────────────────────────────────────────────────

async function refreshBusquedaBE(dateFrom, dateTo) {
  console.log(`  Fetching búsquedas BE ${dateFrom} → ${dateTo}...`);

  console.log("  → Consultando /search...");
  const searchRaw = await fetchAllSearch(dateFrom, dateTo);
  console.log(`  → /search OK: ${searchRaw.length} filas`);

  console.log("  → Consultando /property...");
  const propRaw = await fetchAllProperty(dateFrom, dateTo);
  console.log(`  → /property OK: ${propRaw.length} filas`);

  console.log(`  ${searchRaw.length} URLs /search  |  ${propRaw.length} URLs /property`);

  // Mapa propertyPath → nombre válido (para rellenar títulos genéricos)
  const GENERIC_TITLES = new Set([
    "detalles del alojamiento", "resultados de búsqueda", "kampaoh",
    "inicio", "home", "(not set)", "",
  ]);
  const titleMap = {};
  for (const row of propRaw) {
    const url   = row.dimensionValues[0].value;
    const title = row.dimensionValues[2].value || "";
    const clean = title.replace(/\s*[·|]\s*Kampaoh\s*$/i, "").trim();
    if (!clean || GENERIC_TITLES.has(clean.toLowerCase())) continue;
    try {
      const pathKey = url.replace(/^https?:\/\/[^/]+/, "").split("?")[0];
      if (!titleMap[pathKey]) titleMap[pathKey] = clean;
    } catch(_) {}
  }
  console.log(`  → mapa de nombres: ${Object.keys(titleMap).length} propiedades identificadas`);

  const aggMap = {};
  let skipped = 0;

  for (const row of searchRaw) {
    const url   = row.dimensionValues[0].value;
    const date  = parseInt(row.dimensionValues[1].value);
    const count = parseInt(row.metricValues[0].value) || 0;

    const p = parseSearchUrl(url);
    if (!p) { skipped++; continue; }

    const key = `${p.type}|${date}|${p.label}|${p.checkin}|${p.checkout}|${p.adults}|${p.children}|${p.babies}|${p.fpa}`;
    if (!aggMap[key]) {
      aggMap[key] = [date, p.type, p.label, p.checkin, p.checkout, p.adults, p.children, p.babies, p.fpa, 0];
    }
    aggMap[key][9] += count;
  }

  for (const row of propRaw) {
    const url       = row.dimensionValues[0].value;
    const date      = parseInt(row.dimensionValues[1].value);
    const rawTitle  = row.dimensionValues[2].value || "";
    const count     = parseInt(row.metricValues[0].value) || 0;

    // Resolver nombre: 1) mapa canónico por ID, 2) titleMap de GA4, 3) rawTitle
    let resolvedTitle = rawTitle;
    try {
      const idMatch = url.match(/\/property\/(\d+)/);
      if (idMatch && PROP_MAP[idMatch[1]]) {
        resolvedTitle = PROP_MAP[idMatch[1]] + " · Kampaoh";
      } else {
        const cleanTitle = rawTitle.replace(/\s*[·|]\s*Kampaoh\s*$/i, "").trim();
        if (!cleanTitle || GENERIC_TITLES.has(cleanTitle.toLowerCase())) {
          const pathKey = url.replace(/^https?:\/\/[^/]+/, "").split("?")[0];
          if (titleMap[pathKey]) resolvedTitle = titleMap[pathKey] + " · Kampaoh";
        }
      }
    } catch(_) {}

    const p = parsePropertyUrl(url, resolvedTitle);
    if (!p) { skipped++; continue; }

    const key = `${p.type}|${date}|${p.label}|${p.checkin}|${p.checkout}|${p.adults}|${p.children}|${p.babies}|${p.fpa}`;
    if (!aggMap[key]) {
      aggMap[key] = [date, p.type, p.label, p.checkin, p.checkout, p.adults, p.children, p.babies, p.fpa, 0];
    }
    aggMap[key][9] += count;
  }

  const rows = Object.values(aggMap);
  const zonas = rows.filter(r => r[1] === "zona").length;
  const props = rows.filter(r => r[1] === "propiedad").length;
  console.log(`  ${skipped} descartadas | ${rows.length} válidas → ${zonas} zona, ${props} propiedad`);

  let existing = {
    updated: "",
    cols: ["date","type","label","checkin","checkout","adults","children","babies","fpa","count"],
    rows: [],
  };
  if (fs.existsSync(DATA_PATH)) {
    try { existing = JSON.parse(fs.readFileSync(DATA_PATH, "utf8")); } catch(e) {}
  }
  if (!Array.isArray(existing.rows)) existing.rows = [];

  const fromNum = parseInt(dateFrom.replace(/-/g, ""));
  const toNum   = parseInt(dateTo.replace(/-/g, ""));
  existing.rows = existing.rows.filter(r => r[0] < fromNum || r[0] > toNum);
  for (const r of rows) existing.rows.push(r);
  existing.rows.sort((a, b) => a[0] - b[0] || (a[2] || "").localeCompare(b[2] || ""));
  existing.updated = dateTo;
  existing.cols = ["date","type","label","checkin","checkout","adults","children","babies","fpa","count"];

  fs.writeFileSync(DATA_PATH, JSON.stringify(existing), "utf8");
  const label = IS_ALL ? "busqueda-be-data-all.json" : "busqueda-be-data.json";
  console.log(`  ✅ ${label} — ${rows.length} filas para el período`);
}

async function main() {
  const args = process.argv.slice(2);
  const fromArg = args.find(a => a.startsWith("--from="));
  const toArg   = args.find(a => a.startsWith("--to="));
  const dateFrom = fromArg ? fromArg.split("=")[1] : daysAgo(IS_ALL ? 13 : 29);
  const dateTo   = toArg   ? toArg.split("=")[1]   : daysAgo(0);
  await refreshBusquedaBE(dateFrom, dateTo);
}

main().catch(e => { console.error("❌ Error:", e.message); process.exit(1); });
