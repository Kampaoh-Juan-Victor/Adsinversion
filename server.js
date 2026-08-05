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

  // ── /api/resolve-campaign?id=XXX — resuelve ID numérico a nombre ──────────
  if (url.pathname === "/api/resolve-campaign") {
    const campId = qs.get("id");
    if (!campId) { res.writeHead(400); res.end(JSON.stringify({ error: "id requerido" })); return; }
    res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
    (async function() {
      try {
        // 1. Buscar en cache local primero
        let existing = {};
        const DATA_PATH = path.join(DIR, "atribucion-data.json");
        if (fs.existsSync(DATA_PATH)) {
          try { existing = JSON.parse(fs.readFileSync(DATA_PATH, "utf8")); } catch(e) {}
        }
        const lookup = existing.campaign_lookup || {};
        if (lookup[campId]) { res.end(JSON.stringify({ id: campId, name: lookup[campId], source: "cache" })); return; }

        // 2. Consultar GA4
        const { BetaAnalyticsDataClient } = require("@google-analytics/data");
        const ga4 = new BetaAnalyticsDataClient({ keyFilename: path.join(DIR, "ga4-credentials.json") });
        const [r0] = await ga4.runReport({
          property: "properties/347358752",
          dimensions: [{ name: "sessionCampaignId" }, { name: "sessionCampaignName" }],
          metrics: [{ name: "sessions" }],
          dimensionFilter: { filter: { fieldName: "sessionCampaignId", stringFilter: { matchType: "EXACT", value: campId } } },
          dateRanges: [{ startDate: "2024-01-01", endDate: "today" }],
          limit: 5,
        });
        let name = null;
        for (const row of r0.rows || []) {
          const n = row.dimensionValues[1].value;
          if (n && !/^\d+$/.test(n) && n !== "(not set)") { name = n; break; }
        }
        if (name) {
          // Guardar en cache
          lookup[campId] = name;
          existing.campaign_lookup = lookup;
          if (fs.existsSync(DATA_PATH)) fs.writeFileSync(DATA_PATH, JSON.stringify(existing), "utf8");
        }
        res.end(JSON.stringify({ id: campId, name: name || campId, source: name ? "ga4" : "not_found" }));
      } catch(e) {
        res.end(JSON.stringify({ id: campId, name: campId, error: e.message }));
      }
    })();
    return;
  }

  // ── /api/realtime — GA4 Realtime: compras últimos 30 min ──────────────────
  if (url.pathname === "/api/realtime") {
    res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
    (async function() {
      try {
        const { BetaAnalyticsDataClient } = require("@google-analytics/data");
        const ga4 = new BetaAnalyticsDataClient({ keyFilename: path.join(DIR, "ga4-credentials.json") });
        // Realtime API no soporta firstUser* con eventName para esta propiedad.
        // Hacemos dos queries: purchases por minuto + usuarios activos por página.
        const [[rPurchases], [rUsers]] = await Promise.all([
          ga4.runRealtimeReport({
            property: "properties/347358752",
            dimensions: [{ name: "eventName" }, { name: "minutesAgo" }],
            metrics: [{ name: "eventCount" }],
            limit: 200,
          }),
          ga4.runRealtimeReport({
            property: "properties/347358752",
            dimensions: [{ name: "unifiedScreenName" }],
            metrics: [{ name: "activeUsers" }],
            limit: 10,
          }),
        ]);

        let totalPurchases = 0;
        const byMinute = {};
        (rPurchases.rows || [])
          .filter(function(row) { return row.dimensionValues[0].value === "purchase"; })
          .forEach(function(row) {
            const min = parseInt(row.dimensionValues[1].value) || 0;
            const cnt = parseInt(row.metricValues[0].value) || 0;
            byMinute[min] = (byMinute[min] || 0) + cnt;
            totalPurchases += cnt;
          });

        const activeByPage = (rUsers.rows || []).map(function(row) {
          return { page: row.dimensionValues[0].value, users: parseInt(row.metricValues[0].value) || 0 };
        });

        const rows = Object.entries(byMinute).map(function(e) {
          return { source: "(realtime)", medium: "(realtime)", campaign: "", minutes: parseInt(e[0]), count: parseInt(e[1]) };
        });
        res.end(JSON.stringify({ rows, totalPurchases, activeByPage }));
      } catch(e) {
        res.end(JSON.stringify({ rows: [], error: e.message }));
      }
    })();
    return;
  }

  // ── /api/bq-feed — Compras de hoy vía BigQuery export (intraday) ────────────
  if (url.pathname === "/api/bq-feed") {
    res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
    (async function() {
      try {
        const { BigQuery } = require("@google-cloud/bigquery");
        const bq = new BigQuery({
          keyFilename: path.join(DIR, "ga4-credentials.json"),
          projectId: "kampaoh-analytics",
        });

        // Fecha de hoy en zona horaria Madrid (UTC+2 verano)
        const now = new Date();
        const madridOffset = 2 * 60;
        const madridNow = new Date(now.getTime() + madridOffset * 60000);
        const today = madridNow.toISOString().slice(0, 10).replace(/-/g, "");

        // Primero intentamos intraday (actualización cada ~1h), luego daily
        const dataset = "analytics_347358752";
        const tables = [
          `\`kampaoh-analytics.${dataset}.events_intraday_${today}\``,
          `\`kampaoh-analytics.${dataset}.events_${today}\``,
        ];

        let rows = null;
        let tableUsed = null;
        for (const tbl of tables) {
          // collected_traffic_source solo está disponible en session_start, no en purchase.
          // Hay que hacer JOIN por user_pseudo_id + ga_session_id para obtener la fuente real.
          const query = `
            WITH session_srcs AS (
              SELECT
                user_pseudo_id,
                (SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'ga_session_id') AS session_id,
                COALESCE(
                  NULLIF(collected_traffic_source.manual_source, ''),
                  IF(collected_traffic_source.gclid IS NOT NULL AND collected_traffic_source.gclid != '', 'google', NULL)
                ) AS source,
                COALESCE(
                  NULLIF(collected_traffic_source.manual_medium, ''),
                  IF(collected_traffic_source.gclid IS NOT NULL AND collected_traffic_source.gclid != '', 'cpc', NULL)
                ) AS medium,
                NULLIF(collected_traffic_source.manual_campaign_name, '') AS campaign,
                NULLIF(collected_traffic_source.manual_campaign_id, '') AS campaign_id
              FROM ${tbl}
              WHERE event_name = 'session_start'
            )
            SELECT
              TIMESTAMP_MICROS(e.event_timestamp) AS ts,
              e.user_pseudo_id,
              e.geo.city AS city,
              e.geo.country AS country,
              e.device.category AS device,
              COALESCE(s.source, '(direct)') AS source,
              COALESCE(s.medium, '(none)') AS medium,
              COALESCE(s.campaign, '(not set)') AS campaign,
              COALESCE(s.campaign_id, '') AS campaign_id,
              (SELECT value.string_value FROM UNNEST(e.event_params) WHERE key = 'transaction_id' LIMIT 1) AS transaction_id,
              (SELECT COALESCE(value.double_value, value.int_value) FROM UNNEST(e.event_params) WHERE key = 'value' LIMIT 1) AS revenue,
              (SELECT value.string_value FROM UNNEST(e.event_params) WHERE key = 'currency' LIMIT 1) AS currency,
              (SELECT i.item_name FROM UNNEST(e.items) AS i LIMIT 1) AS item_name
            FROM ${tbl} e
            LEFT JOIN session_srcs s
              ON e.user_pseudo_id = s.user_pseudo_id
              AND (SELECT value.int_value FROM UNNEST(e.event_params) WHERE key = 'ga_session_id') = s.session_id
            WHERE e.event_name = 'purchase'
            ORDER BY e.event_timestamp DESC
            LIMIT 100
          `;
          try {
            const [result] = await bq.query({ query, location: "EU" });
            rows = result;
            tableUsed = tbl;
            break;
          } catch(e) {
            if (e.message && (e.message.includes("Not found") || e.message.includes("notFound"))) continue;
            throw e;
          }
        }

        if (!rows) {
          res.end(JSON.stringify({ rows: [], bq_ready: false, message: "Tabla intraday aún no creada. El primer dato llegará en ~1h tras activar la exportación." }));
          return;
        }

        const out = rows.map(function(r) {
          return {
            ts: r.ts ? r.ts.value : null,
            transaction_id: r.transaction_id || null,
            source: r.source || "(direct)",
            medium: r.medium || "(none)",
            campaign: r.campaign || "",
            campaign_id: r.campaign_id || "",
            revenue: r.revenue || 0,
            currency: r.currency || "EUR",
            item_name: r.item_name || "",
            city: r.city || "",
            country: r.country || "",
            device: r.device || "",
          };
        });
        res.end(JSON.stringify({ rows: out, bq_ready: true, table: tableUsed, count: out.length }));
      } catch(e) {
        res.end(JSON.stringify({ rows: [], bq_ready: false, error: e.message }));
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
