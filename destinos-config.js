// destinos-config.js — Configuración centralizada de destinos para todos los scripts de refresh
// Actualizar AQUÍ cuando se añada un nuevo destino — aplica automáticamente a Meta, Google y TikTok.

// Ordenados de más específico a más general para evitar matches parciales prematuros
// (ej. "somo-playa" antes de "somo", "kikopark-playa" antes de "kikopark")
const DESTINOS = [
  // España — compuestos largos primero
  "ria-de-arousa-playa", "ria-de-arousa-rural",
  "praia-de-angeiras",
  "bufones-de-pria",
  "picos-de-urbion",
  "playa-de-levante", "playa-de-sueca", "playa-troenzo",
  "sierra-de-urbasa", "sierra-nevada",
  "costa-del-sol", "costa-blanca", "costa-dorada", "costa-brava",
  "los-escullos", "los-canos",
  "somo-playa", "somo-parque",
  "kikopark-playa", "kikopark-rural",
  "bayona-playa",
  "el-palmar",
  "lago-de-arcos",
  "la-franca", "la-bolera",
  "tossa-de-mar",
  "isla-cristina",
  "santillana-del-mar",
  "puerto-santa-maria",
  "delta-ebro",
  "cova-negra",
  "cabo-blanco",
  "rio-mino",
  "ria-de-vigo",
  "las-arenas",
  "fonts-dalgar",
  "el-rocio",
  // España — simples
  "valdvaqueros",
  "tarifa",
  "llanes",
  "paloma",
  "donana",
  "platjadaro",
  "somo",
  "mendigorria",
  "castrillon",
  "rianxo",
  "zumaia",
  "ruiloba",
  "cordoba",
  "cazorla",
  "benajarafe",
  "cabaneros",
  "alquezar",
  "oyambre",
  "navajas",
  "almadrava",
  "calella",
  "deva",
  "villajoyosa",
  "crevillent",
  "bayona",
  "blanes",
  "moncofar",
  "benicassim",
  "roquetas",
  "conil",
  "trafalgar",
  "grazalema",
  "marbella",
  "palamos",
  "pintens",
  "oliva",
  "esponella",
  "menorca",
  "estepona",
  "neptuno",
  "cambrils",
  "kikopark",
  // Portugal
  "sao-martinho",
  "ancora",
  "gala",
  "vagueira",
  "mira",
  "meco",
  "peniche",
  "sesimbra",
  "lisboa",
  "san-pedro-moel",
  "tavira",
  "porto",
  "lagoa",
  "pedroso",
  // Internacional
  "flumendosa",
  "o-pedrouzo",
];

// Aliases: variante normalizada → slug canónico almacenado en los JSONs
// Se comprueban ANTES que DESTINOS para que los más específicos ganen a los más cortos.
// Ej: "kikoparkrural" debe → "kikopark-rural" antes de que "kikopark" lo capture.
const DESTINO_ALIASES = {
  // Las Arenas
  "arenas":            "las-arenas",
  // Platja d'Aro — varias formas tras normalizar (apóstrofe, "de", sin separador)
  "platja-daro":       "platjadaro",
  "platja-d-aro":      "platjadaro",
  "platja-de-aro":     "platjadaro",
  // KikoPark sin guión (CamelCase en ad names)
  "kikoparkrural":     "kikopark-rural",
  "kikoparkplaya":     "kikopark-playa",
  // Fonts d'Algar — apóstrofe genera dos formas
  "fonts-d-algar":     "fonts-dalgar",
  // Destinos donde el slug usa "el-/los-" pero los ad names van sin artículo
  "rocio":             "el-rocio",
  "escullos":          "los-escullos",
  "canos":             "los-canos",
  // El Palmar — con y sin artículo, y variantes hostel
  "hostel-el-palmar":  "el-palmar",
  "hostel-palmar":     "el-palmar",
  "palmar":            "el-palmar",
  // Trafalgar — variante hostel
  "hostel-trafalgar":  "trafalgar",
  // Roquetas — con y sin "de Mar"
  "roquetas-de-mar":   "roquetas",
  // Picos de Urbión — variantes cortas
  "picos-urbion":      "picos-de-urbion",
  "picos":             "picos-de-urbion",
  // Variantes de largo por palabra "de/del"
  "delta-del-ebro":    "delta-ebro",
  "playa-de-troenzo":  "playa-troenzo",
  "urbasa":            "sierra-de-urbasa",
  // São Martinho do Porto — dos formas habituales
  "martinho-do-porto": "sao-martinho",
  "martinho":          "sao-martinho",
  // Sao Pedro de Moel — grafía portuguesa vs. slug con "san"
  "sao-pedro-de-moel": "san-pedro-moel",
  "sao-pedro":         "san-pedro-moel",
  "pedro-de-moel":     "san-pedro-moel",
  "moel":              "san-pedro-moel",
  // Valdevaqueros — typo histórico sin la "e"
  "valdevaqueros":     "valdvaqueros",
  // La Masia → Blanes
  "la-masia":          "blanes",
  // Playa Troenzo — slug sin "playa-" delante
  "troenzo":           "playa-troenzo",
  // O Pedrouzo — grafía sin artículo gallego
  "opedrouzo":         "o-pedrouzo",
  "pedrouzo":          "o-pedrouzo",
};

// Normaliza un string: elimina tildes, minúsculas, espacios→guiones, solo [a-z0-9-]
function normalize(str) {
  return (str || "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// Extrae el slug de destino desde un nombre de anuncio (Meta/TikTok)
// o nombre de adgroup. Los aliases se comprueban primero para que los patrones
// específicos (kikoparkrural) ganen a los genéricos (kikopark).
function extractDestination(name) {
  const norm = normalize(name);

  // 1. Aliases primero (más específicos — evita captura prematura por slug corto)
  for (const [alias, canonical] of Object.entries(DESTINO_ALIASES)) {
    if (norm.includes(alias)) return canonical;
  }

  // 2. Lista de destinos canónicos
  for (const dest of DESTINOS) {
    if (norm.includes(dest)) return dest;
  }

  return "sin-etiquetar";
}

module.exports = { DESTINOS, DESTINO_ALIASES, normalize, extractDestination };
