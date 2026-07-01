#!/usr/bin/env node
// Servidor HTTP estático mínimo para desarrollo local
const http = require("http");
const fs   = require("fs");
const path = require("path");

const PORT = 8766;
const ROOT = __dirname;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js":   "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".svg":  "image/svg+xml",
  ".ico":  "image/x-icon",
};

http.createServer((req, res) => {
  let urlPath = req.url.split("?")[0];
  if (urlPath === "/") urlPath = "/index.html";
  const file = path.join(ROOT, urlPath);

  fs.readFile(file, (err, data) => {
    if (err && !path.extname(file)) {
      fs.readFile(file + ".html", (err2, data2) => {
        if (err2) { res.writeHead(404); res.end("Not found: " + urlPath); return; }
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(data2);
      });
      return;
    }
    if (err) {
      res.writeHead(404);
      res.end("Not found: " + urlPath);
      return;
    }
    const ext  = path.extname(file).toLowerCase();
    const mime = MIME[ext] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": mime });
    res.end(data);
  });
}).listen(PORT, "127.0.0.1", () => {
  console.log("✅ Servidor en http://localhost:" + PORT + "/");
});
