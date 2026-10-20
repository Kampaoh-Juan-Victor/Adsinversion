#!/usr/bin/env node
// visitas-refresh.js — Sesiones GA4 por mes, 2025 vs 2026
const { BetaAnalyticsDataClient } = require("@google-analytics/data");
const path = require("path");

const PROPERTY_ID = "347358752";
const CREDENTIALS_PATH = path.join(__dirname, "ga4-credentials.json");
const client = new BetaAnalyticsDataClient({ keyFilename: CREDENTIALS_PATH });

const PAID_CHANNELS = new Set([
  'Paid Search','Paid Social','Display','Paid Video','Paid Other','Paid Shopping','Paid Unknown'
]);

function isPaid(channel) {
  return PAID_CHANNELS.has(channel) || channel.toLowerCase().startsWith('paid');
}

async function getSessionsByChannel(startDate, endDate, excludeGuias) {
  // Solo WordPress principal — excluye motores de reservas y otros subdominios
  const hostnameFilter = {
    filter: {
      fieldName: "hostName",
      stringFilter: { matchType: "EXACT", value: "es.kampaoh.com" },
    }
  };

  const guiasFilter = {
    notExpression: {
      filter: {
        fieldName: "pagePath",
        stringFilter: { matchType: "BEGINS_WITH", value: "/guias-de-viaje/" }
      }
    }
  };

  const dimensionFilter = excludeGuias
    ? { andGroup: { expressions: [hostnameFilter, guiasFilter] } }
    : hostnameFilter;

  const [res] = await client.runReport({
    property: `properties/${PROPERTY_ID}`,
    dimensions: [{ name: "yearMonth" }, { name: "sessionDefaultChannelGrouping" }],
    metrics: [{ name: "sessions" }],
    dateRanges: [{ startDate, endDate }],
    dimensionFilter,
  });

  const byMonth = {};
  for (const row of res.rows || []) {
    const mo = row.dimensionValues[0].value;
    const channel = row.dimensionValues[1].value;
    const sessions = parseInt(row.metricValues[0].value) || 0;
    if (!byMonth[mo]) byMonth[mo] = { total: 0, paid: 0, organic: 0, channels: {} };
    byMonth[mo].total += sessions;
    if (isPaid(channel)) byMonth[mo].paid += sessions;
    else byMonth[mo].organic += sessions;
    byMonth[mo].channels[channel] = (byMonth[mo].channels[channel] || 0) + sessions;
  }
  return byMonth;
}

function printTable(label, data25, data26) {
  const meses = ['','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const fmt = n => n >= 1000 ? (n/1000).toFixed(1)+'k' : String(n);
  const sign = d => d >= 0 ? '+' : '';

  console.log(`\n=== ${label} ===`);
  console.log('Mes        2025      2026     Dif       %');
  console.log('─'.repeat(46));
  let t25=0, t26=0;
  for (let i=1; i<=8; i++) {
    const mm = String(i).padStart(2,'0');
    const s25 = data25['2025'+mm] || 0;
    const s26 = data26['2026'+mm] || 0;
    if (s25+s26 === 0) continue;
    t25+=s25; t26+=s26;
    const diff = s26-s25;
    const pct = s25>0 ? (diff/s25*100).toFixed(1)+'%' : '-';
    console.log(meses[i].padEnd(8)+fmt(s25).padStart(8)+fmt(s26).padStart(9)+'  '+sign(diff)+fmt(diff).padStart(6)+'   '+sign(diff)+pct);
  }
  console.log('─'.repeat(46));
  const d=t26-t25;
  console.log('TOTAL   '+fmt(t25).padStart(8)+fmt(t26).padStart(9)+'  '+sign(d)+fmt(d).padStart(6)+'   '+sign(d)+((d/t25)*100).toFixed(1)+'%');
}

async function main() {
  console.log('Fetching sesiones GA4 por canal...');

  const [data25, data26] = await Promise.all([
    getSessionsByChannel('2025-01-01', '2025-08-27', true),
    getSessionsByChannel('2026-01-01', '2026-08-27', true),
  ]);

  const extract = (data, type) => {
    const out = {};
    for (const [mo, v] of Object.entries(data)) out[mo] = v[type] || 0;
    return out;
  };

  printTable('TOTAL (sin /guias-de-viaje/)', extract(data25,'total'), extract(data26,'total'));
  printTable('PAGO (Paid Search + Social + Display...)', extract(data25,'paid'), extract(data26,'paid'));
  printTable('ORGÁNICO (Organic + Direct + Referral...)', extract(data25,'organic'), extract(data26,'organic'));

  // Tabla cruzada: filas=mes, columnas=canal
  const allChannels = new Set();
  for (const v of [...Object.values(data25), ...Object.values(data26)]) {
    for (const c of Object.keys(v.channels||{})) allChannels.add(c);
  }
  const sum = (data, chan) => Object.values(data).reduce((a,v) => a + (v.channels?.[chan]||0), 0);
  const fmt = n => n >= 1000 ? Math.round(n/1000)+'k' : n > 0 ? String(n) : '—';
  const chanList = [...allChannels]
    .map(c => ({ c, tot: sum(data25,c)+sum(data26,c) }))
    .filter(x => x.tot >= 5000)
    .sort((a,b) => b.tot - a.tot)
    .map(x => x.c);

  const LABELS = {
    'Organic Search': 'Org.Search',
    'Paid Search': 'Paid.Search',
    'Unassigned': 'Unassigned',
    'Paid Social': 'Paid.Social',
    'Direct': 'Direct',
    'Cross-network': 'Cross-net',
    'Referral': 'Referral',
    'Organic Social': 'Org.Social',
    'Email': 'Email',
  };
  const cols = chanList.map(c => LABELS[c] || c.slice(0,10));
  const meses = ['','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago'];

  const COL = 11;
  const header = 'Año  Mes   Total'.padEnd(18) + cols.map(c => c.padStart(COL)).join('');
  const sep = '─'.repeat(18 + cols.length * COL);

  for (const year of ['2025','2026']) {
    const data = year === '2025' ? data25 : data26;
    console.log(`\n${header}`);
    console.log(sep);
    let totTotal = 0; const totCols = chanList.map(() => 0);
    for (let i=1; i<=8; i++) {
      const mm = String(i).padStart(2,'0');
      const mo = year+mm;
      const v = data[mo];
      if (!v) continue;
      const total = v.total || 0;
      totTotal += total;
      const cells = chanList.map((c,ci) => { const n = v.channels?.[c]||0; totCols[ci]+=n; return fmt(n).padStart(COL); });
      console.log(`${year} ${meses[i].padEnd(4)} ${fmt(total).padStart(7)}   ${cells.join('')}`);
    }
    console.log(sep);
    const totCells = totCols.map(n => fmt(n).padStart(COL));
    console.log(`     TOTAL ${fmt(totTotal).padStart(7)}   ${totCells.join('')}`);
  }

  // Fila de diferencia %
  console.log(`\n${'Dif %'.padEnd(18)}${cols.map(c => c.padStart(COL)).join('')}`);
  console.log(sep);
  for (let i=1; i<=8; i++) {
    const mm = String(i).padStart(2,'0');
    const t25 = data25['2025'+mm]?.total || 0;
    const t26 = data26['2026'+mm]?.total || 0;
    if (t25+t26 === 0) continue;
    const totPct = t25>0 ? ((t26-t25)/t25*100).toFixed(0)+'%' : '-';
    const cells = chanList.map(c => {
      const s25 = data25['2025'+mm]?.channels?.[c]||0;
      const s26 = data26['2026'+mm]?.channels?.[c]||0;
      const pct = s25>0 ? ((s26-s25)/s25*100).toFixed(0)+'%' : s26>0?'nuevo':'-';
      return pct.padStart(COL);
    });
    console.log(`     ${meses[i].padEnd(4)} ${totPct.padStart(7)}   ${cells.join('')}`);
  }
}

main().catch(console.error);
