#!/usr/bin/env node
// server.js — Servidor local del dashboard Kampaoh
// Uso: node server.js
// Luego abre: http://localhost:3456

const http = require("http");
const fs   = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { GoogleAuth } = require("google-auth-library");

const PORT     = parseInt(process.env.PORT) || 3456;
const DIR      = __dirname;
const SITE_URL = "https://es.kampaoh.com/";

const gscAuth = new GoogleAuth({
  keyFile: path.join(DIR, "ga4-credentials.json"),
  scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
});

async function gscFetch(token, body) {
  const url = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE_URL)}/searchAnalytics/query`;
  const r = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return r.json();
}

const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json" };

http.createServer(function(req, res) {
  const url  = new URL(req.url, "http://localhost:" + PORT);
  const qs   = url.searchParams;

  // ── /api/gsc — Consulta GSC con fechas personalizadas ──
  if (url.pathname === "/api/gsc") {
    const from = qs.get("from");
    const to   = qs.get("to");
    if (!from || !to) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Params 'from' y 'to' requeridos (YYYY-MM-DD)" }));
      return;
    }
    res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
    (async function() {
      try {
        const client = await gscAuth.getClient();
        const { token } = await client.getAccessToken();
        const ORDER_CLICKS = [{ fieldName: "clicks", sortOrder: "DESCENDING" }];
        const ORDER_DATE   = [{ fieldName: "date",   sortOrder: "ASCENDING"  }];
        const [qRes, pRes, dRes] = await Promise.all([
          gscFetch(token, { startDate: from, endDate: to, dimensions: ["query"], rowLimit: 1000, orderBy: ORDER_CLICKS }),
          gscFetch(token, { startDate: from, endDate: to, dimensions: ["page"],  rowLimit: 1000, orderBy: ORDER_CLICKS }),
          gscFetch(token, { startDate: from, endDate: to, dimensions: ["date"],  rowLimit: 5000, orderBy: ORDER_DATE  }),
        ]);
        if (qRes.error) throw new Error(qRes.error.message);
        const queries = (qRes.rows || []).map(function(r) {
          return { query: r.keys[0], clicks: r.clicks, impressions: r.impressions, ctr: parseFloat((r.ctr*100).toFixed(1)), position: parseFloat(r.position.toFixed(1)) };
        });
        const pages = (pRes.rows || []).map(function(r) {
          return { page: r.keys[0].replace("https://es.kampaoh.com", ""), clicks: r.clicks, impressions: r.impressions, ctr: parseFloat((r.ctr*100).toFixed(1)), position: parseFloat(r.position.toFixed(1)) };
        });
        const byDate = (dRes.rows || []).map(function(r) {
          return { date: r.keys[0], clicks: r.clicks, impressions: r.impressions };
        });
        const totalImprQ = queries.reduce(function(s, r) { return s + r.impressions; }, 0);
        const position   = totalImprQ ? parseFloat((queries.reduce(function(s,r){ return s+r.position*r.impressions;},0)/totalImprQ).toFixed(1)) : 0;
        const clicks     = byDate.reduce(function(s,r){ return s+r.clicks; }, 0);
        const impr       = byDate.reduce(function(s,r){ return s+r.impressions; }, 0);
        res.end(JSON.stringify({ queries, pages, byDate, summary: { clicks, impressions: impr, ctr: impr?parseFloat((clicks/impr*100).toFixed(1)):0, position } }));
      } catch(e) {
        res.end(JSON.stringify({ error: e.message }));
      }
    })();
    return;
  }

  // ── /refresh — ejecuta refresh.js y hace streaming del log via SSE ──
  if (url.pathname === "/refresh") {
    res.writeHead(200, {
      "Content-Type":  "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection":    "keep-alive",
      "Access-Control-Allow-Origin": "*"
    });

    const send = function(obj) { res.write("data: " + JSON.stringify(obj) + "\n\n"); };
    send({ status: "starting" });

    const args = ["auto-refresh.js"];
    const from = qs.get("from");
    // auto-refresh.js fetches yesterday by default; --date overrides
    if (from) args.push("--date=" + from);

    require("dotenv").config({ path: DIR + "/.env" });
    const child = spawn("node", args, { cwd: DIR, env: { ...process.env } });

    child.stdout.on("data", function(d) { send({ log: d.toString() }); });
    child.stderr.on("data", function(d) { send({ log: d.toString() }); });
    child.on("close", function(code) {
      send({ status: code === 0 ? "done" : "error" });
      res.end();
    });
    req.on("close", function() { child.kill(); });
    return;
  }

  // ── /api/gsc-keyword — posición diaria de keyword+página específica ──
  if (url.pathname === "/api/gsc-keyword") {
    const from  = qs.get("from");
    const to    = qs.get("to");
    const page  = qs.get("page");
    const query = qs.get("query");
    if (!from || !to || !page || !query) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Params requeridos: from, to, page, query" }));
      return;
    }
    res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
    (async function() {
      try {
        const client = await gscAuth.getClient();
        const { token } = await client.getAccessToken();
        const data = await gscFetch(token, {
          startDate: from,
          endDate:   to,
          dimensions: ["date"],
          dimensionFilterGroups: [{
            filters: [
              { dimension: "page",  operator: "equals", expression: page  },
              { dimension: "query", operator: "equals", expression: query },
            ]
          }],
          orderBy:  [{ fieldName: "date", sortOrder: "ASCENDING" }],
          rowLimit: 1000,
        });
        if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
        const rows = (data.rows || []).map(function(r) {
          return {
            date:        r.keys[0],
            clicks:      r.clicks,
            impressions: r.impressions,
            ctr:         parseFloat((r.ctr * 100).toFixed(1)),
            position:    parseFloat(r.position.toFixed(1)),
          };
        });
        res.end(JSON.stringify({ rows }));
      } catch(e) {
        res.end(JSON.stringify({ error: e.message }));
      }
    })();
    return;
  }

  // ── Servir archivos estáticos ──
  let filePath = path.join(DIR, url.pathname === "/" ? "index.html" : url.pathname);
  fs.stat(filePath, function(err, stat) {
    if (err && !path.extname(filePath)) {
      // Try with .html extension (e.g. /ga4 → ga4.html)
      fs.stat(filePath + ".html", function(err2, stat2) {
        if (err2) { res.writeHead(404); res.end("Not found"); return; }
        res.writeHead(200, { "Content-Type": "text/html" });
        fs.createReadStream(filePath + ".html").pipe(res);
      });
      return;
    }
    if (err) { res.writeHead(404); res.end("Not found"); return; }
    res.writeHead(200, { "Content-Type": MIME[path.extname(filePath)] || "text/plain" });
    fs.createReadStream(filePath).pipe(res);
  });

}).listen(PORT, "127.0.0.1", function() {
  console.log("Dashboard disponible en http://localhost:" + PORT);
  console.log("Deja esta ventana abierta mientras uses el dashboard.");
  console.log("Ctrl+C para parar el servidor.");

  // Abrir el navegador automáticamente
  const { exec } = require("child_process");
  exec('open "http://localhost:' + PORT + '"');
});
