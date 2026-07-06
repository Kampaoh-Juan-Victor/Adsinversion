#!/usr/bin/env node
// extract-property-map.js — Extrae mapa de propiedades del booking engine desde GA4
// Resultado: property-map.json  { "123": "Kampaoh Costa Brava (Girona)", ... }

const { BetaAnalyticsDataClient } = require("@google-analytics/data");
const fs   = require("fs");
const path = require("path");

const client = new BetaAnalyticsDataClient({
  keyFilename: path.join(__dirname, "ga4-credentials.json"),
});

const GENERIC = new Set([
  "detalles del alojamiento", "resultados de búsqueda",
  "kampaoh", "inicio", "home", "(not set)", "",
]);

async function main() {
  console.log("Consultando GA4 para mapa de propiedades...");

  const allRows = [];
  let offset = 0;
  const pageSize = 10000;

  while (true) {
    const [response] = await client.runReport({
      property: "properties/347358752",
      dimensions: [
        { name: "pageLocation" },
        { name: "pageTitle" },
      ],
      metrics: [{ name: "eventCount" }],
      dimensionFilter: {
        andGroup: {
          expressions: [
            { filter: { fieldName: "eventName",    stringFilter: { matchType: "EXACT",    value: "page_view" } } },
            { filter: { fieldName: "pageLocation", stringFilter: { matchType: "CONTAINS", value: "booking.kampaoh.com/property/" } } },
          ],
        },
      },
      dateRanges: [{ startDate: "2026-06-01", endDate: "2026-07-03" }],
      limit:  pageSize,
      offset,
    }, { timeout: 120000 });

    const rows = response.rows || [];
    for (const r of rows) allRows.push(r);
    process.stdout.write(`\r  ${allRows.length} filas...`);
    if (rows.length < pageSize) break;
    offset += pageSize;
  }

  console.log(`\n  Total: ${allRows.length} filas únicas (URL × título)`);

  const map = {};       // { propertyId: nombre }
  const conflicts = {}; // IDs con más de un nombre válido

  for (const row of allRows) {
    const url   = row.dimensionValues[0].value || "";
    const title = row.dimensionValues[1].value || "";
    const count = parseInt(row.metricValues[0].value) || 0;

    // Extraer ID numérico de la URL: /property/123
    const match = url.match(/\/property\/(\d+)/);
    if (!match) continue;
    const id = match[1];

    const name = title.replace(/\s*[·|]\s*Kampaoh\s*$/i, "").trim();
    if (!name || GENERIC.has(name.toLowerCase())) continue;

    if (!map[id]) {
      map[id] = { name, count };
    } else if (map[id].name !== name) {
      // Conflicto: quedarse con el más visto
      if (!conflicts[id]) conflicts[id] = [map[id]];
      conflicts[id].push({ name, count });
      if (count > map[id].count) map[id] = { name, count };
    } else {
      map[id].count += count;
    }
  }

  // Convertir a formato simple { id: nombre }
  const result = {};
  for (const [id, v] of Object.entries(map)) result[id] = v.name;

  const outPath = path.join(__dirname, "property-map.json");
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2), "utf8");

  console.log(`  ✅ ${Object.keys(result).length} propiedades identificadas → property-map.json`);

  if (Object.keys(conflicts).length) {
    console.log(`  ⚠️  ${Object.keys(conflicts).length} IDs con títulos distintos (se usó el más visto)`);
  }

  // Mostrar tabla
  const sorted = Object.entries(result).sort((a, b) => a[1].localeCompare(b[1]));
  console.log("\n  ID     Nombre");
  console.log("  ─────  " + "─".repeat(50));
  for (const [id, name] of sorted) {
    console.log(`  ${id.padEnd(6)} ${name}`);
  }
}

main().catch(e => { console.error("❌ Error:", e.message); process.exit(1); });
