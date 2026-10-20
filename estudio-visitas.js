#!/usr/bin/env node
// estudio-visitas.js — Ene–Ago 2025 vs 2026 · es.kampaoh.com · sin /guias-de-viaje/
const { GoogleAuth }             = require('google-auth-library');
const { BetaAnalyticsDataClient } = require('@google-analytics/data');

const SITE_URL = 'https://es.kampaoh.com/';
const auth = new GoogleAuth({ keyFile: './ga4-credentials.json', scopes: ['https://www.googleapis.com/auth/webmasters.readonly'] });
const ga4  = new BetaAnalyticsDataClient({ keyFilename: './ga4-credentials.json' });

const PAID = new Set(['Paid Search','Paid Social','Display','Paid Video','Paid Other','Paid Shopping','Paid Unknown']);
const isPaid = c => PAID.has(c) || c.toLowerCase().startsWith('paid');

const MES  = ['','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago'];
const fmt  = n => n >= 1000 ? Math.round(n/1000)+'k' : n > 0 ? String(n) : '—';
const fmtM = n => n >= 1e6 ? (n/1e6).toFixed(1)+'M' : n >= 1000 ? Math.round(n/1000)+'k' : String(n||0);
const pct  = (a,b) => a > 0 ? ((b-a)/a*100).toFixed(0)+'%' : b > 0 ? 'nuevo' : '—';
const sign = d => d >= 0 ? '+' : '';

// ── GSC ──────────────────────────────────────────────────────────────────────
async function gscMonth(token, year, month) {
  const mm  = String(month).padStart(2,'0');
  const end = (year === 2026 && month === 8) ? '28' : String(new Date(year, month, 0).getDate()).padStart(2,'0');
  const res = await fetch(
    'https://www.googleapis.com/webmasters/v3/sites/' + encodeURIComponent(SITE_URL) + '/searchAnalytics/query',
    { method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startDate: `${year}-${mm}-01`, endDate: `${year}-${mm}-${end}`,
        dimensions: ['date'],
        dimensionFilterGroups: [{ filters: [{ dimension: 'page', operator: 'notContains', expression: '/guias-de-viaje/' }] }],
        rowLimit: 25000,
      }),
    }
  );
  return (await res.json()).rows?.reduce((a,r) => ({ c: a.c + r.clicks, i: a.i + r.impressions }), { c:0, i:0 }) || { c:0, i:0 };
}

// ── GA4 ──────────────────────────────────────────────────────────────────────
async function ga4Fetch(startDate, endDate) {
  const [res] = await ga4.runReport({
    property: 'properties/347358752',
    dimensions: [{ name: 'yearMonth' }, { name: 'sessionDefaultChannelGrouping' }],
    metrics: [{ name: 'sessions' }],
    dateRanges: [{ startDate, endDate }],
    dimensionFilter: { andGroup: { expressions: [
      { filter: { fieldName: 'hostName',                     stringFilter: { matchType: 'EXACT',        value: 'es.kampaoh.com'   } } },
      { notExpression: { filter: { fieldName: 'pagePath',    stringFilter: { matchType: 'BEGINS_WITH',  value: '/guias-de-viaje/' } } } },
    ]}},
  });
  const byMonth = {};
  for (const row of res.rows || []) {
    const mo  = row.dimensionValues[0].value;
    const ch  = row.dimensionValues[1].value;
    const ses = parseInt(row.metricValues[0].value) || 0;
    if (!byMonth[mo]) byMonth[mo] = { total: 0, paid: 0, organic: 0, ch: {} };
    byMonth[mo].total += ses;
    if (isPaid(ch)) byMonth[mo].paid += ses; else byMonth[mo].organic += ses;
    byMonth[mo].ch[ch] = (byMonth[mo].ch[ch] || 0) + ses;
  }
  return byMonth;
}

// ── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('Fetching datos…');
  const client = await auth.getClient();
  const { token } = await client.getAccessToken();

  const months = [1,2,3,4,5,6,7,8];

  const [gsc25arr, gsc26arr, ga25, ga26] = await Promise.all([
    Promise.all(months.map(m => gscMonth(token, 2025, m))),
    Promise.all(months.map(m => gscMonth(token, 2026, m))),
    ga4Fetch('2025-01-01', '2025-08-28'),
    ga4Fetch('2026-01-01', '2026-08-28'),
  ]);

  const gsc25 = Object.fromEntries(months.map((m,i) => [m, gsc25arr[i]]));
  const gsc26 = Object.fromEntries(months.map((m,i) => [m, gsc26arr[i]]));

  const SEP = '─'.repeat(62);

  // ── TABLA 1: Totales por mes ───────────────────────────────────────────────
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║  SESIONES TOTALES · es.kampaoh.com · sin /guias-de-viaje/  ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('Mes     Ses 2025  Ses 2026    Dif       %');
  console.log(SEP);
  let tt25=0, tt26=0;
  for (const i of months) {
    const mm = String(i).padStart(2,'0');
    const s25 = ga25['2025'+mm]?.total || 0;
    const s26 = ga26['2026'+mm]?.total || 0;
    if (s25+s26 === 0) continue;
    tt25 += s25; tt26 += s26;
    const d = s26-s25;
    console.log(MES[i].padEnd(7)+fmt(s25).padStart(9)+fmt(s26).padStart(9)+'   '+sign(d)+fmt(Math.abs(d)).padStart(6)+'   '+sign(d)+pct(s25,s26));
  }
  console.log(SEP);
  const dt = tt26-tt25;
  console.log('TOTAL  '+fmt(tt25).padStart(9)+fmt(tt26).padStart(9)+'   '+sign(dt)+fmt(Math.abs(dt)).padStart(6)+'   '+sign(dt)+pct(tt25,tt26));

  // ── TABLA 2: Pago vs Orgánico por mes ────────────────────────────────────
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║         PAGO vs ORGÁNICO por mes (2025 → 2026)             ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('         ──── PAGO ────────────    ──── ORGÁNICO ───────────');
  console.log('Mes     2025     2026    %       2025     2026    %');
  console.log(SEP);
  let tp25=0,tp26=0,to25=0,to26=0;
  for (const i of months) {
    const mm = String(i).padStart(2,'0');
    const p25 = ga25['2025'+mm]?.paid    || 0;
    const p26 = ga26['2026'+mm]?.paid    || 0;
    const o25 = ga25['2025'+mm]?.organic || 0;
    const o26 = ga26['2026'+mm]?.organic || 0;
    if (p25+p26+o25+o26 === 0) continue;
    tp25+=p25; tp26+=p26; to25+=o25; to26+=o26;
    console.log(MES[i].padEnd(7)+
      fmt(p25).padStart(7)+fmt(p26).padStart(7)+(sign(p26-p25)+pct(p25,p26)).padStart(7)+'   '+
      fmt(o25).padStart(7)+fmt(o26).padStart(7)+(sign(o26-o25)+pct(o25,o26)).padStart(7));
  }
  console.log(SEP);
  console.log('TOTAL  '+
    fmt(tp25).padStart(7)+fmt(tp26).padStart(7)+(sign(tp26-tp25)+pct(tp25,tp26)).padStart(7)+'   '+
    fmt(to25).padStart(7)+fmt(to26).padStart(7)+(sign(to26-to25)+pct(to25,to26)).padStart(7));

  // ── TABLA 3: Canales detalle por mes ──────────────────────────────────────
  const allCh = new Set();
  for (const v of [...Object.values(ga25), ...Object.values(ga26)]) for (const c of Object.keys(v.ch||{})) allCh.add(c);
  const sumCh = (data, ch) => Object.values(data).reduce((a,v) => a + (v.ch?.[ch]||0), 0);
  const chList = [...allCh].filter(c => sumCh(ga25,c)+sumCh(ga26,c) >= 3000).sort((a,b) => sumCh(ga26,b)+sumCh(ga25,b) - (sumCh(ga26,a)+sumCh(ga25,a)));

  for (const ch of chList) {
    const tag = isPaid(ch) ? '💳' : '🌿';
    console.log(`\n${tag}  ${ch}`);
    console.log('Mes     2025     2026     Dif      %');
    console.log('─'.repeat(40));
    let t25=0,t26=0;
    for (const i of months) {
      const mm = String(i).padStart(2,'0');
      const s25 = ga25['2025'+mm]?.ch?.[ch] || 0;
      const s26 = ga26['2026'+mm]?.ch?.[ch] || 0;
      if (s25+s26 === 0) continue;
      t25+=s25; t26+=s26;
      const d = s26-s25;
      console.log(MES[i].padEnd(7)+fmt(s25).padStart(7)+fmt(s26).padStart(7)+'  '+sign(d)+fmt(Math.abs(d)).padStart(5)+'  '+sign(d)+pct(s25,s26));
    }
    console.log('─'.repeat(40));
    const d=t26-t25;
    console.log('TOTAL  '+fmt(t25).padStart(7)+fmt(t26).padStart(7)+'  '+sign(d)+fmt(Math.abs(d)).padStart(5)+'  '+sign(d)+pct(t25,t26));
  }

  // ── TABLA 4: GSC sin guías ────────────────────────────────────────────────
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║  GSC · Clicks + Impresiones · sin /guias-de-viaje/         ║');
  console.log('║  (datos GSC 2025 solo desde mayo — Ene–Abr sin referencia) ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('Mes     Clicks25  Clicks26   Dif%    Impr25    Impr26   Dif%    CTR25   CTR26');
  console.log('─'.repeat(80));
  let gc25=0,gc26=0,gi25=0,gi26=0;
  for (const i of months) {
    const g25 = gsc25[i]; const g26 = gsc26[i];
    const hasPrior = g25.c > 0;
    gc25+=g25.c; gc26+=g26.c; gi25+=g25.i; gi26+=g26.i;
    const dc  = sign(g26.c-g25.c)+pct(g25.c, g26.c);
    const di  = sign(g26.i-g25.i)+pct(g25.i, g26.i);
    const c25 = g25.i > 0 ? (g25.c/g25.i*100).toFixed(1)+'%' : '—';
    const c26 = g26.i > 0 ? (g26.c/g26.i*100).toFixed(1)+'%' : '—';
    console.log(MES[i].padEnd(7)+
      (hasPrior?fmt(g25.c):'—').padStart(8)+fmt(g26.c).padStart(9)+(hasPrior?dc:'n/d').padStart(7)+'  '+
      (hasPrior?fmtM(g25.i):'—').padStart(8)+fmtM(g26.i).padStart(9)+(hasPrior?di:'n/d').padStart(7)+'  '+
      c25.padStart(7)+c26.padStart(7));
  }
  console.log('─'.repeat(80));
  const dcc=gc26-gc25; const dii=gi26-gi25;
  const ctrt25 = gi25>0?(gc25/gi25*100).toFixed(1)+'%':'—';
  const ctrt26 = gi26>0?(gc26/gi26*100).toFixed(1)+'%':'—';
  console.log('TOTAL  '+fmt(gc25).padStart(8)+fmt(gc26).padStart(9)+(sign(dcc)+pct(gc25,gc26)).padStart(7)+'  '+
    fmtM(gi25).padStart(8)+fmtM(gi26).padStart(9)+(sign(dii)+pct(gi25,gi26)).padStart(7)+'  '+
    ctrt25.padStart(7)+ctrt26.padStart(7));
  console.log('(Totales incluyen Ene–Abr 2026 sin par de 2025 en GSC)');
}

main().catch(console.error);
