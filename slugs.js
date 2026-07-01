'use strict';
// slugs.js — Extracción de slug de destino a partir del nombre de anuncio/adset/grupo

// Reglas ordenadas por especificidad (más específico primero)
const RULES = [
  ["somo parque",          "somo-parque"],
  ["somo-parque",          "somo-parque"],
  ["kikopark rural",       "kikopark-rural"],
  ["kikopark-rural",       "kikopark-rural"],
  ["kikopark playa",       "kikopark-playa"],
  ["kikopark-playa",       "kikopark-playa"],
  ["costa brava",          "costa-brava"],
  ["costa-brava",          "costa-brava"],
  ["costa blanca",         "costa-blanca"],
  ["costa-blanca",         "costa-blanca"],
  ["la franca",            "la-franca"],
  ["la-franca",            "la-franca"],
  ["sierra nevada",        "sierra-nevada"],
  ["sierra-nevada",        "sierra-nevada"],
  ["sierra urbasa",        "sierra-de-urbasa"],
  ["sierra-urbasa",        "sierra-de-urbasa"],
  ["playa de levante",     "playa-de-levante"],
  ["playa-de-levante",     "playa-de-levante"],
  ["playa levante",        "playa-de-levante"],
  ["playa troenzo",        "playa-troenzo"],
  ["playa-troenzo",        "playa-troenzo"],
  ["los escullos",         "los-escullos"],
  ["los-escullos",         "los-escullos"],
  ["isla cristina",        "isla-cristina"],
  ["isla-cristina",        "isla-cristina"],
  ["lago de arcos",        "lago-de-arcos"],
  ["lago-de-arcos",        "lago-de-arcos"],
  ["lago arcos",           "lago-de-arcos"],
  ["santillana del mar",   "santillana-del-mar"],
  ["santillana-del-mar",   "santillana-del-mar"],
  ["fonts d algar",        "fonts-dalgar"],
  ["fonts dalgar",         "fonts-dalgar"],
  ["fonts algar",          "fonts-dalgar"],
  ["font algar",           "fonts-dalgar"],
  ["delta del ebro",       "delta-ebro"],
  ["delta-del-ebro",       "delta-ebro"],
  ["delta ebro",           "delta-ebro"],
  ["delta-ebro",           "delta-ebro"],
  ["ria de vigo",          "ria-de-vigo"],
  ["ria-de-vigo",          "ria-de-vigo"],
  ["platja de aro",        "platja-de-aro"],
  ["platja-de-aro",        "platja-de-aro"],
  ["platja d aro",         "platja-de-aro"],
  ["platjadaro",           "platja-de-aro"],
  ["bayona playa",         "bayona-playa"],
  ["bayona-playa",         "bayona-playa"],
  ["el palmar",            "el-palmar"],
  ["el-palmar",            "el-palmar"],
  ["las arenas",           "las-arenas"],
  ["las-arenas",           "las-arenas"],
  ["el rocio",             "el-rocio"],
  ["el-rocio",             "el-rocio"],
  ["o pedrouzo",           "o-pedrouzo"],
  ["o-pedrouzo",           "o-pedrouzo"],
  ["sao martinho",         "martinho-do-porto"],
  ["s martinho",           "martinho-do-porto"],
  ["martinho do porto",    "martinho-do-porto"],
  ["martinho-do-porto",    "martinho-do-porto"],
  ["puerto santa maria",   "puerto-santa-maria"],
  ["puerto-santa-maria",   "puerto-santa-maria"],
  ["puerto santa",         "puerto-santa-maria"],
  ["puerto sta",           "puerto-santa-maria"],
  ["pto santa",            "puerto-santa-maria"],
  ["a guarda",             "a-guarda"],
  ["a-guarda",             "a-guarda"],
  // Single keywords
  ["arenas",               "las-arenas"],
  ["palmar",               "el-palmar"],
  ["conil",                "conil"],
  ["canos",                "conil"],
  ["tarifa",               "tarifa"],
  ["trafalgar",            "trafalgar"],
  ["calella",              "calella"],
  ["tossa",                "tossa-de-mar"],
  ["menorca",              "menorca"],
  ["somo",                 "somo-playa"],
  ["alquezar",             "alquezar"],
  ["neptuno",              "neptuno"],
  ["santillana",           "santillana-del-mar"],
  ["fonts",                "fonts-dalgar"],
  ["algar",                "fonts-dalgar"],
  ["navajas",              "navajas"],
  ["blanes",               "blanes"],
  ["palamos",              "palamos"],
  ["donana",               "donana"],
  ["benicassim",           "benicassim"],
  ["mendigorria",          "mendigorria"],
  ["llanes",               "llanes"],
  ["urbasa",               "sierra-de-urbasa"],
  ["levante",              "playa-de-levante"],
  ["escullos",             "los-escullos"],
  ["rocio",                "el-rocio"],
  ["cambrils",             "cambrils"],
  ["crevillent",           "crevillent"],
  ["roquetas",             "roquetas"],
  ["nevada",               "sierra-nevada"],
  ["tavira",               "tavira"],
  ["zumaia",               "zumaia"],
  ["platja",               "platja-de-aro"],
  ["estepona",             "estepona"],
  ["kikopark",             "kikopark-playa"],
  ["lagoa",                "lagoa"],
  ["oyambre",              "oyambre"],
  ["ruiloba",              "ruiloba"],
  ["troenzo",              "playa-troenzo"],
  ["bayona",               "bayona-playa"],
  ["cabaneros",            "cabañeros"],
  ["cordoba",              "cordoba"],
  ["paloma",               "paloma"],
  ["pedrouzo",             "o-pedrouzo"],
  ["pedroso",              "pedroso"],
  ["rianxo",               "rianxo"],
  ["grazalema",            "grazalema"],
  ["almadrava",            "almadrava"],
  ["martinho",             "martinho-do-porto"],
  ["porto",                "martinho-do-porto"],
  ["flumendosa",           "flumendosa"],
  ["lisboa",               "lisboa"],
  ["guarda",               "a-guarda"],
  ["vigo",                 "ria-de-vigo"],
  ["deva",                 "deva"],
  ["isla",                 "isla-cristina"],
  ["franca",               "la-franca"],
  ["ebro",                 "delta-ebro"],
  ["coruna",               "a-coruna"],
  ["corun",                "a-coruna"],
];

// Palabras clave que indican campaña genérica en Google
const GOOGLE_GENERIC = [
  "pmax", "performance max", "province", "provincial", "provincia",
  "verano", "lkl", "generi", "general", "spain", "espana", "españa",
  "cadiz", "cantabria", "andalucia", "catalun", "valenci",
  "murcia", "galicia", "asturias", "euskadi", "navarra", "aragon", "madrid",
  "grupo de anuncios 1", "grupo de anuncios 2", "grupo de anuncios 3",
  "brand", "branded", "remarketing generi",
];

function norm(s) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[_\-\/\'\"’]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchRules(n) {
  for (var i = 0; i < RULES.length; i++) {
    if (n.indexOf(RULES[i][0]) !== -1) return RULES[i][1];
  }
  return null;
}

function extractSlug(name, platform) {
  if (!name || name.trim() === "") return "sin-etiquetar";
  var n = norm(name);

  if (platform === "google") {
    for (var i = 0; i < GOOGLE_GENERIC.length; i++) {
      if (n.indexOf(GOOGLE_GENERIC[i]) !== -1) return "sin-etiquetar";
    }
    // Google format: Search_Tipo_SLUG o similar → extraer último segmento
    var parts = name.split("_");
    if (parts.length >= 3) {
      var lastSeg = norm(parts[parts.length - 1]);
      var slugFromSeg = matchRules(lastSeg);
      if (slugFromSeg) return slugFromSeg;
    }
  }

  return matchRules(n) || "sin-etiquetar";
}

// Mapa slug → nombre de display
const DEST_NAMES = {
  "sin-etiquetar":      "Sin etiquetar",
  "las-arenas":         "Las Arenas",
  "el-palmar":          "El Palmar",
  "conil":              "Conil / Los Caños",
  "tarifa":             "Tarifa",
  "trafalgar":          "Trafalgar",
  "isla-cristina":      "Isla Cristina",
  "calella":            "Calella",
  "costa-brava":        "Costa Brava",
  "tossa-de-mar":       "Tossa de Mar",
  "menorca":            "Menorca",
  "somo-playa":         "Somo Playa",
  "somo-parque":        "Somo Parque",
  "ria-de-vigo":        "Ría de Vigo",
  "alquezar":           "Alquézar",
  "cova-negra":         "Cova Negra",
  "neptuno":            "Neptuno",
  "lago-de-arcos":      "Lago de Arcos",
  "santillana-del-mar": "Santillana del Mar",
  "fonts-dalgar":       "Fonts d'Algar",
  "navajas":            "Navajas",
  "delta-ebro":         "Delta del Ebro",
  "blanes":             "Blanes",
  "palamos":            "Palamós",
  "donana":             "Doñana",
  "benicassim":         "Benicàssim",
  "mendigorria":        "Mendigorria",
  "llanes":             "Llanes",
  "sierra-de-urbasa":   "Sierra de Urbasa",
  "playa-de-levante":   "Playa de Levante",
  "los-escullos":       "Los Escullos",
  "costa-blanca":       "Costa Blanca",
  "el-rocio":           "El Rocío",
  "cambrils":           "Cambrils",
  "crevillent":         "Crevillent",
  "deva":               "Deva",
  "roquetas":           "Roquetas",
  "sierra-nevada":      "Sierra Nevada",
  "tavira":             "Tavira",
  "zumaia":             "Zumaia",
  "platja-de-aro":      "Platja d'Aro",
  "estepona":           "Estepona",
  "kikopark-playa":     "Kikopark Playa",
  "kikopark-rural":     "Kikopark Rural",
  "lagoa":              "Lagoa",
  "la-franca":          "La Franca",
  "oyambre":            "Oyambre",
  "ruiloba":            "Ruiloba",
  "playa-troenzo":      "Playa Troenzo",
  "bayona-playa":       "Bayona Playa",
  "cabañeros":          "Cabañeros",
  "cordoba":            "Córdoba",
  "puerto-santa-maria": "Puerto Sta. María",
  "paloma":             "Paloma",
  "o-pedrouzo":         "O Pedrouzo",
  "pedroso":            "Pedroso",
  "rianxo":             "Rianxo",
  "grazalema":          "Grazalema",
  "almadrava":          "Almadrava",
  "martinho-do-porto":  "Martinho do Porto",
  "flumendosa":         "Flumendosa",
  "lisboa":             "Lisboa",
  "a-guarda":           "A Guarda",
  "a-coruna":           "A Coruña",
};

function destName(slug) {
  return DEST_NAMES[slug] || slug.replace(/-/g, " ").replace(/\b\w/g, function(c){ return c.toUpperCase(); });
}

module.exports = { extractSlug, destName, DEST_NAMES, norm };
