#!/usr/bin/env node
// migrate-slugs.js — Fusiona slugs duplicados en data.json (sin tocar APIs)
// Uso: node migrate-slugs.js

const fs   = require("fs");
const path = require("path");

const DATA_PATH = path.join(__dirname, "data.json");

const MERGES = {
  "palmar":           "el-palmar",
  "hostel-palmar":    "el-palmar",
  "hostel-el-palmar": "el-palmar",
  "hostel-trafalgar": "trafalgar",
  "roquetas-de-mar":  "roquetas",
  "picos":            "picos-de-urbion",
  "picos-urbion":     "picos-de-urbion",
  "canos":            "los-canos",
  "martinho-do-porto":"sao-martinho",
  "valdevaqueros":    "valdvaqueros",
  "pedrouzo":         "o-pedrouzo",
  "opedrouzo":        "o-pedrouzo",
  "sao-pedro-de-moel":"san-pedro-moel",
};

const data = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
let changed = 0;

for (const [date, day] of Object.entries(data.days || {})) {
  for (const field of Object.keys(day)) {
    const obj = day[field];
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) continue;

    for (const [oldSlug, newSlug] of Object.entries(MERGES)) {
      if (!(oldSlug in obj)) continue;
      obj[newSlug] = (obj[newSlug] || 0) + obj[oldSlug];
      delete obj[oldSlug];
      changed++;
    }
  }
}

fs.writeFileSync(DATA_PATH, JSON.stringify(data));
console.log(`✅ Migración completada — ${changed} fusiones en data.json`);
