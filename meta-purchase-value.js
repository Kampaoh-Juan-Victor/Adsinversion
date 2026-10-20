#!/usr/bin/env node
// Fetch purchase value (action_values) from Meta Marketing API
// Months: May-Sep 2026, account level

require("dotenv").config();

const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const AD_ACCOUNT   = process.env.META_AD_ACCOUNT_ID;

if (!ACCESS_TOKEN || !AD_ACCOUNT) {
  console.error("Missing META_ACCESS_TOKEN or META_AD_ACCOUNT_ID in .env");
  process.exit(1);
}

const MONTHS = [
  { ym: "202605", start: "2026-05-01", end: "2026-05-31" },
  { ym: "202606", start: "2026-06-01", end: "2026-06-30" },
  { ym: "202607", start: "2026-07-01", end: "2026-07-31" },
  { ym: "202608", start: "2026-08-01", end: "2026-08-31" },
  { ym: "202609", start: "2026-09-01", end: "2026-09-24" },
];

async function fetchMonth(start, end) {
  const url = `https://graph.facebook.com/v21.0/act_${AD_ACCOUNT}/insights?` +
    `fields=spend,actions,action_values&` +
    `time_range={"since":"${start}","until":"${end}"}&` +
    `action_attribution_windows=["7d_click","1d_view"]&` +
    `access_token=${ACCESS_TOKEN}`;

  const res = await fetch(url);
  const data = await res.json();
  if (data.error) throw new Error(`Meta API error: ${JSON.stringify(data.error)}`);
  return data.data?.[0] || {};
}

async function main() {
  const byMonth = {};
  let totalP = 0, totalR = 0, totalSpend = 0;

  for (const { ym, start, end } of MONTHS) {
    try {
      const row = await fetchMonth(start, end);

      const actions      = row.actions      || [];
      const actionValues = row.action_values || [];
      const spend        = parseFloat(row.spend || 0);

      const purTypes = ['purchase', 'offsite_conversion.fb_pixel_purchase', 'omni_purchase'];
      const purAction = actions.find(a => purTypes.includes(a.action_type));
      const revAction = actionValues.find(a => purTypes.includes(a.action_type));

      const p = parseFloat(purAction?.value || 0);
      const r = parseFloat(revAction?.value || 0);

      byMonth[ym] = { p, r, spend };
      totalP     += p;
      totalR     += r;
      totalSpend += spend;

      console.log(`  ${ym}: ${Math.round(p).toLocaleString()} compras | ${Math.round(r).toLocaleString()} € | gasto ${Math.round(spend).toLocaleString()} €`);
    } catch (e) {
      console.error(`  ${ym} ERROR: ${e.message}`);
      byMonth[ym] = { p: 0, r: 0, spend: 0 };
    }
  }

  console.log(`\nTOTAL Meta: ${Math.round(totalP).toLocaleString()} compras | ${Math.round(totalR).toLocaleString()} € | gasto ${Math.round(totalSpend).toLocaleString()} €`);

  const out = { byMonth, totals: { p: totalP, r: totalR, spend: totalSpend } };
  require("fs").writeFileSync(require("path").join(__dirname, "meta-purchase-value.json"), JSON.stringify(out, null, 2));
  console.log(`\n✅ Guardado: meta-purchase-value.json`);
}

main().catch(e => { console.error(e); process.exit(1); });
