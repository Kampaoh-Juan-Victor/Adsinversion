#!/usr/bin/env node
// funnel-refresh.js — Funnel de conversión booking.kampaoh.com via GA4
// Uso: node funnel-refresh.js
//      node funnel-refresh.js --from=2026-06-01 --to=2026-07-01

const { BetaAnalyticsDataClient } = require("@google-analytics/data");
const fs   = require("fs");
const path = require("path");

const PROPERTY_ID      = "347358752";
const DATA_PATH        = path.join(__dirname, "funnel-data.json");
const CREDENTIALS_PATH = path.join(__dirname, "ga4-credentials.json");

const client = new BetaAnalyticsDataClient({ keyFilename: CREDENTIALS_PATH });

const FUNNEL_STEPS = [
  { key: "view_item",          label: "Ficha de propiedad" },
  { key: "view_room",          label: "Ver habitación" },
  { key: "add_to_cart",        label: "Seleccionar tienda" },
  { key: "begin_checkout",     label: "Paso 1 · Tus datos" },
  { key: "view_checkout_step2",label: "Paso 2 · Condiciones" },
  { key: "view_checkout_step3",label: "Paso 3 · Pago" },
  { key: "purchase",           label: "Reserva completada" },
];

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

async function main() {
  const args    = process.argv.slice(2);
  const fromArg = args.find(a => a.startsWith("--from="));
  const toArg   = args.find(a => a.startsWith("--to="));
  // 90 días para soportar vistas de 7/30/90d + comparación año anterior
  const dateFrom = fromArg ? fromArg.split("=")[1] : daysAgo(89);
  const dateTo   = toArg   ? toArg.split("=")[1]   : daysAgo(0);

  console.log(`  Fetching funnel GA4 ${dateFrom} → ${dateTo}...`);

  const eventNames = FUNNEL_STEPS.map(s => s.key);

  // ── Por destino (view_item + purchase) ──────────────────────────────────
  const [viewsDestRes, purchasesDestRes] = await Promise.all([
    client.runReport({
      property: `properties/${PROPERTY_ID}`,
      dimensions: [{ name: "itemId" }, { name: "itemName" }, { name: "sessionDefaultChannelGroup" }],
      metrics:    [{ name: "itemsViewed" }],
      dimensionFilter: { filter: { fieldName: "hostName", stringFilter: { matchType: "CONTAINS", value: "booking.kampaoh.com" } } },
      dateRanges: [{ startDate: dateFrom, endDate: dateTo }],
      limit: 2000,
    }),
    client.runReport({
      property: `properties/${PROPERTY_ID}`,
      dimensions: [{ name: "itemId" }, { name: "itemName" }, { name: "sessionDefaultChannelGroup" }],
      metrics:    [{ name: "itemsPurchased" }],
      dimensionFilter: { filter: { fieldName: "hostName", stringFilter: { matchType: "CONTAINS", value: "booking.kampaoh.com" } } },
      dateRanges: [{ startDate: dateFrom, endDate: dateTo }],
      limit: 2000,
    }),
  ]);

  // Cruzar por itemId (mismo ID en view_item y purchase)
  // Usar el nombre de view_item (más descriptivo: "Kampaoh Las Arenas (Cantabria)")
  // channelViews/channelPurchases: { itemId: { channel: count } }
  const viewsById = {}, nameById = {}, channelViews = {};
  (viewsDestRes[0].rows || []).forEach(r => {
    const id      = r.dimensionValues[0].value;
    const name    = r.dimensionValues[1].value;
    const channel = r.dimensionValues[2].value || '(not set)';
    if (!id || id === '(not set)') return;
    const val = parseInt(r.metricValues[0].value) || 0;
    viewsById[id] = (viewsById[id] || 0) + val;
    if (!nameById[id]) nameById[id] = name;
    if (!channelViews[id]) channelViews[id] = {};
    channelViews[id][channel] = (channelViews[id][channel] || 0) + val;
  });

  const purchasesById = {}, channelPurchases = {};
  (purchasesDestRes[0].rows || []).forEach(r => {
    const id      = r.dimensionValues[0].value;
    const channel = r.dimensionValues[2].value || '(not set)';
    if (!id || id === '(not set)') return;
    const val = parseInt(r.metricValues[0].value) || 0;
    purchasesById[id] = (purchasesById[id] || 0) + val;
    if (!channelPurchases[id]) channelPurchases[id] = {};
    channelPurchases[id][channel] = (channelPurchases[id][channel] || 0) + val;
  });

  // Unir canales de vistas y reservas por destino
  const allIds = new Set([...Object.keys(viewsById), ...Object.keys(purchasesById)]);
  const destinations = Array.from(allIds).map(id => {
    const allChannels = new Set([
      ...Object.keys(channelViews[id]   || {}),
      ...Object.keys(channelPurchases[id] || {}),
    ]);
    const channels = {};
    allChannels.forEach(ch => {
      channels[ch] = {
        views:     (channelViews[id]     || {})[ch] || 0,
        purchases: (channelPurchases[id] || {})[ch] || 0,
      };
    });
    return {
      id,
      name:      nameById[id] || id,
      views:     viewsById[id]     || 0,
      purchases: purchasesById[id] || 0,
      channels,
    };
  }).sort((a, b) => b.views - a.views);

  const matched = destinations.filter(d => d.views > 0 && d.purchases > 0).length;
  console.log(`  Destinos: ${destinations.length} (${matched} con vistas y reservas)`);

  // ── Por destino + fecha (sin canal, para tabla dinámica por período) ────────
  const [viewsDestDateRes, purchDestDateRes] = await Promise.all([
    client.runReport({
      property: `properties/${PROPERTY_ID}`,
      dimensions: [{ name: "date" }, { name: "itemId" }],
      metrics:    [{ name: "itemsViewed" }],
      dimensionFilter: { filter: { fieldName: "hostName", stringFilter: { matchType: "CONTAINS", value: "booking.kampaoh.com" } } },
      dateRanges: [{ startDate: dateFrom, endDate: dateTo }],
      limit: 50000,
    }),
    client.runReport({
      property: `properties/${PROPERTY_ID}`,
      dimensions: [{ name: "date" }, { name: "itemId" }],
      metrics:    [{ name: "itemsPurchased" }],
      dimensionFilter: { filter: { fieldName: "hostName", stringFilter: { matchType: "CONTAINS", value: "booking.kampaoh.com" } } },
      dateRanges: [{ startDate: dateFrom, endDate: dateTo }],
      limit: 50000,
    }),
  ]);

  const byDestDate = {};
  (viewsDestDateRes[0].rows || []).forEach(r => {
    const rawDate = r.dimensionValues[0].value;
    const date = `${rawDate.slice(0,4)}-${rawDate.slice(4,6)}-${rawDate.slice(6,8)}`;
    const id = r.dimensionValues[1].value;
    if (!id || id === '(not set)') return;
    const val = parseInt(r.metricValues[0].value) || 0;
    if (!byDestDate[date]) byDestDate[date] = {};
    if (!byDestDate[date][id]) byDestDate[date][id] = { v: 0, p: 0 };
    byDestDate[date][id].v += val;
  });
  (purchDestDateRes[0].rows || []).forEach(r => {
    const rawDate = r.dimensionValues[0].value;
    const date = `${rawDate.slice(0,4)}-${rawDate.slice(4,6)}-${rawDate.slice(6,8)}`;
    const id = r.dimensionValues[1].value;
    if (!id || id === '(not set)') return;
    const val = parseInt(r.metricValues[0].value) || 0;
    if (!byDestDate[date]) byDestDate[date] = {};
    if (!byDestDate[date][id]) byDestDate[date][id] = { v: 0, p: 0 };
    byDestDate[date][id].p += val;
  });
  console.log(`  byDestDate: ${Object.keys(byDestDate).length} fechas`);

  // ── Funnel por fecha ─────────────────────────────────────────────────────
  const allRows = [];
  let offset = 0;
  const pageSize = 10000;

  while (true) {
    const [response] = await client.runReport({
      property: `properties/${PROPERTY_ID}`,
      dimensions: [{ name: "date" }, { name: "eventName" }],
      metrics:    [{ name: "eventCount" }],
      dimensionFilter: {
        andGroup: {
          expressions: [
            { filter: { fieldName: "hostName",  stringFilter: { matchType: "CONTAINS", value: "booking.kampaoh.com" } } },
            { filter: { fieldName: "eventName", inListFilter: { values: eventNames } } },
          ],
        },
      },
      dateRanges: [{ startDate: dateFrom, endDate: dateTo }],
      limit:  pageSize,
      offset,
    });

    const rows = response.rows || [];
    for (const r of rows) allRows.push(r);
    if (rows.length < pageSize) break;
    offset += pageSize;
  }

  // Indexar por fecha → eventName → count
  const byDate = {};
  for (const row of allRows) {
    const rawDate = row.dimensionValues[0].value; // YYYYMMDD
    const date    = `${rawDate.slice(0,4)}-${rawDate.slice(4,6)}-${rawDate.slice(6,8)}`;
    const event   = row.dimensionValues[1].value;
    const count   = parseInt(row.metricValues[0].value) || 0;
    if (!byDate[date]) byDate[date] = {};
    byDate[date][event] = (byDate[date][event] || 0) + count;
  }

  // Totales del período completo
  const totals = {};
  for (const events of Object.values(byDate)) {
    for (const [ev, cnt] of Object.entries(events)) {
      totals[ev] = (totals[ev] || 0) + cnt;
    }
  }

  console.log(`  Días con datos: ${Object.keys(byDate).length}`);
  FUNNEL_STEPS.forEach(s => {
    const cnt = totals[s.key] || 0;
    console.log(`  ${s.key}: ${cnt.toLocaleString("es")}`);
  });

  const output = {
    updated:    dateTo,
    dateFrom,
    dateTo,
    steps:      FUNNEL_STEPS,
    byDate,
    destinations,
    byDestDate,
  };

  fs.writeFileSync(DATA_PATH, JSON.stringify(output), "utf8");
  console.log(`  ✅ funnel-data.json guardado`);
}

main().catch(e => { console.error("❌ Error:", e.message); process.exit(1); });
