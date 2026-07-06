#!/usr/bin/env node
// refresh.js — Actualiza todos los datos del dashboard
// Uso:
//   node refresh.js                  → procesa ayer
//   node refresh.js --date=2026-07-02
// Cron diario a las 8:00: 0 8 * * * cd "/Users/victorarias/Documents/Ads inversión" && node refresh.js >> refresh.log 2>&1

const { execSync } = require("child_process");
const path = require("path");

const args    = process.argv.slice(2);
const dateArg = (args.find(a => a.startsWith("--date=")) || "").split("=")[1];

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

const dateStr = dateArg || daysAgo(1);
const DIR = path.dirname(__filename);

console.log("🔄 Actualizando dashboard Kampaoh — " + new Date().toLocaleString("es-ES"));

// Ejecuta un script con --from y --to (no sale si falla, solo avisa)
function run(script, from, to) {
  const fromStr = from || dateStr;
  const toStr   = to   || dateStr;
  console.log("\n▶ " + script + " --from=" + fromStr + " --to=" + toStr);
  try {
    execSync(
      `"/usr/local/bin/node" "${path.join(DIR, script)}" --from=${fromStr} --to=${toStr}`,
      { stdio: "inherit", cwd: DIR }
    );
  } catch (e) {
    console.error("❌ Error en " + script + " (continúa): " + e.message);
  }
}

// Ejecuta un script sin argumentos de fecha
function runNoArgs(script, extra) {
  const extraStr = extra ? " " + extra : "";
  console.log("\n▶ " + script + extraStr);
  try {
    execSync(`"/usr/local/bin/node" "${path.join(DIR, script)}"` + (extra ? " " + extra : ""), { stdio: "inherit", cwd: DIR });
  } catch (e) {
    console.error("❌ Error en " + script + " (continúa): " + e.message);
  }
}

// ── Campañas (incremental: solo ayer) ───────────────────────────────────────
run("meta-refresh.js");
run("google-ads-refresh.js");
run("tiktok-refresh.js");
run("ga4-refresh.js");

// ── GA4 Funnel (últimos 90 días, soporta retraso de 2 días) ─────────────────
runNoArgs("funnel-refresh.js");

// ── GSC (últimos 90 días) ────────────────────────────────────────────────────
runNoArgs("gsc-refresh.js");

// ── Búsqueda BE filtrada (incrementa últimos 3 días) ────────────────────────
run("busqueda-be-refresh.js", daysAgo(2), daysAgo(0));

// ── Búsqueda BE completa / todo tráfico (últimos 14 días desde cero) ─────────
runNoArgs("busqueda-be-refresh.js", "--all");

console.log("\n✅ Dashboard actualizado — " + new Date().toLocaleString("es-ES"));
