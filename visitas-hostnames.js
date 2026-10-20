#!/usr/bin/env node
// Comprueba qué hostnames hay en las sesiones del property GA4
const { BetaAnalyticsDataClient } = require("@google-analytics/data");
const path = require("path");

const client = new BetaAnalyticsDataClient({ keyFilename: path.join(__dirname, "ga4-credentials.json") });

async function main() {
  // Sesiones por hostname y yearMonth para ver cuándo aparece cada dominio
  const [res] = await client.runReport({
    property: "properties/347358752",
    dimensions: [{ name: "hostName" }, { name: "yearMonth" }],
    metrics: [{ name: "sessions" }],
    dateRanges: [{ startDate: "2024-10-01", endDate: "2026-08-27" }],
    orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    limit: 100,
  });

  // Agrupar por hostname
  const byHost = {};
  for (const row of res.rows || []) {
    const host = row.dimensionValues[0].value;
    const mo = row.dimensionValues[1].value;
    const sessions = parseInt(row.metricValues[0].value) || 0;
    if (!byHost[host]) byHost[host] = { total: 0, months: {} };
    byHost[host].total += sessions;
    byHost[host].months[mo] = (byHost[host].months[mo] || 0) + sessions;
  }

  const fmt = n => n >= 1000 ? Math.round(n/1000)+'k' : String(n);

  // Ordenar por total
  const sorted = Object.entries(byHost).sort((a,b) => b[1].total - a[1].total);

  console.log('\n=== SESIONES POR HOSTNAME (Oct 2024 – Ago 2026) ===\n');
  for (const [host, v] of sorted) {
    if (v.total < 100) continue;
    console.log(`${host.padEnd(35)} Total: ${fmt(v.total)}`);
    // Mostrar trend por mes (solo últimos 12 meses)
    const months = Object.entries(v.months).sort((a,b) => a[0].localeCompare(b[0])).slice(-12);
    const trend = months.map(([mo,s]) => `${mo.slice(4)}: ${fmt(s)}`).join('  ');
    console.log(`  ${trend}`);
  }

  // También ver si hay sesiones que cruzan dominios (cross-domain)
  console.log('\n=== RESUMEN MENSUAL: kampaoh.com vs booking.kampaoh.com ===');
  const main = byHost['www.kampaoh.com'] || byHost['kampaoh.com'] || { months: {} };
  const booking = byHost['booking.kampaoh.com'] || { months: {} };
  const allMonths = new Set([...Object.keys(main.months), ...Object.keys(booking.months)]);
  const sorted_months = [...allMonths].sort().slice(-12);
  console.log('Mes     kampaoh.com    booking.k.com');
  for (const mo of sorted_months) {
    const m = (main.months[mo]||0);
    const b = (booking.months[mo]||0);
    console.log(`${mo}  ${fmt(m).padStart(10)}    ${fmt(b).padStart(10)}`);
  }
}

main().catch(console.error);
