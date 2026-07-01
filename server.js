#!/usr/bin/env node
// server.js — Servidor local del dashboard Kampaoh
// Uso: node server.js
// Luego abre: http://localhost:3456

const http = require("http");
const fs   = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const PORT = 3456;
const DIR  = __dirname;

const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json" };

http.createServer(function(req, res) {
  const url  = new URL(req.url, "http://localhost:" + PORT);
  const qs   = url.searchParams;

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

  // ── Servir archivos estáticos ──
  let filePath = path.join(DIR, url.pathname === "/" ? "index.html" : url.pathname);
  fs.readFile(filePath, function(err, data) {
    if (err && !path.extname(filePath)) {
      // Try with .html extension (e.g. /ga4 → ga4.html)
      fs.readFile(filePath + ".html", function(err2, data2) {
        if (err2) { res.writeHead(404); res.end("Not found"); return; }
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(data2);
      });
      return;
    }
    if (err) { res.writeHead(404); res.end("Not found"); return; }
    res.writeHead(200, { "Content-Type": MIME[path.extname(filePath)] || "text/plain" });
    res.end(data);
  });

}).listen(PORT, "127.0.0.1", function() {
  console.log("Dashboard disponible en http://localhost:" + PORT);
  console.log("Deja esta ventana abierta mientras uses el dashboard.");
  console.log("Ctrl+C para parar el servidor.");

  // Abrir el navegador automáticamente
  const { exec } = require("child_process");
  exec('open "http://localhost:' + PORT + '"');
});
