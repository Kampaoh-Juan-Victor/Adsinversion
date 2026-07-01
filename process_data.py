import json
import re
from collections import defaultdict

# ---- SLUG RULES ----
def extract_slug(name):
    """Extract destination slug from ad/adset/adgroup name using SLUG_RULES."""
    if not name:
        return "sin-etiquetar"
    n = name.lower()

    # Order matters: more specific first
    if "somo parque" in n:
        return "somo-parque"
    if "somo" in n:
        return "somo-playa"
    if "kikopark rural" in n:
        return "kikopark-rural"
    if "kikopark playa" in n or ("kikopark" in n and "rural" not in n):
        return "kikopark-playa"
    if "costa brava" in n:
        return "costa-brava"
    if "costa blanca" in n:
        return "costa-blanca"
    if "la franca" in n or "franca" in n:
        return "la-franca"
    if "sierra nevada" in n or "nevada" in n:
        return "sierra-nevada"
    if "sierra urbasa" in n or "urbasa" in n:
        return "sierra-de-urbasa"
    if "playa de levante" in n or "playa levante" in n or ("levante" in n and "playa" not in n.replace("levante","")):
        return "playa-de-levante"
    if "playa troenzo" in n or "troenzo" in n:
        return "playa-troenzo"
    if "los escullos" in n or "escullos" in n:
        return "los-escullos"
    if "isla cristina" in n or "isla" in n:
        return "isla-cristina"
    if "lago de arcos" in n or "lago arcos" in n:
        return "lago-de-arcos"
    if "santillana del mar" in n or "santillana" in n:
        return "santillana-del-mar"
    if "fonts d'algar" in n or "fonts algar" in n or "algar" in n:
        return "fonts-dalgar"
    if "delta del ebro" in n or "delta ebro" in n or "ebro" in n:
        return "delta-ebro"
    if "ria de vigo" in n or "ría de vigo" in n or "vigo" in n:
        return "ria-de-vigo"
    if "platja de aro" in n or "platja d'aro" in n or "platjadaro" in n or "platja" in n:
        return "platja-de-aro"
    if "bayona playa" in n or "bayona" in n:
        return "bayona-playa"
    if "el palmar" in n or "palmar" in n:
        return "el-palmar"
    if "las arenas" in n or "arenas" in n:
        return "las-arenas"
    if "el rocio" in n or "el roc\u00edo" in n or "rocio" in n:
        return "el-rocio"
    if "o pedrouzo" in n or "pedrouzo" in n:
        return "o-pedrouzo"
    if "sao martinho" in n or "martinho" in n or "porto" in n:
        return "martinho-do-porto"
    if "puerto santa maria" in n or "puerto santa" in n or "puerto sta" in n:
        return "puerto-santa-maria"
    if "conil" in n or "canos" in n or "ca\u00f1os" in n or "caños" in n:
        return "conil"
    if "tarifa" in n:
        return "tarifa"
    if "trafalgar" in n:
        return "trafalgar"
    if "calella" in n:
        return "calella"
    if "tossa" in n:
        return "tossa-de-mar"
    if "menorca" in n:
        return "menorca"
    if "alquezar" in n or "alqu\u00e9zar" in n:
        return "alquezar"
    if "neptuno" in n:
        return "neptuno"
    if "navajas" in n:
        return "navajas"
    if "blanes" in n:
        return "blanes"
    if "palamos" in n or "palam\u00f3s" in n:
        return "palamos"
    if "donana" in n or "do\u00f1ana" in n or "doñana" in n:
        return "donana"
    if "benicassim" in n or "benic\u00e0ssim" in n:
        return "benicassim"
    if "mendigorria" in n or "mendigorr\u00eda" in n:
        return "mendigorria"
    if "llanes" in n:
        return "llanes"
    if "cambrils" in n:
        return "cambrils"
    if "crevillent" in n:
        return "crevillent"
    if "roquetas" in n:
        return "roquetas"
    if "tavira" in n:
        return "tavira"
    if "zumaia" in n:
        return "zumaia"
    if "estepona" in n:
        return "estepona"
    if "lagoa" in n:
        return "lagoa"
    if "oyambre" in n:
        return "oyambre"
    if "ruiloba" in n:
        return "ruiloba"
    if "cabaneros" in n or "caba\u00f1eros" in n or "cabañeros" in n:
        return "cabañeros"
    if "cordoba" in n or "c\u00f3rdoba" in n or "córdoba" in n:
        return "cordoba"
    if "paloma" in n:
        return "paloma"
    if "pedroso" in n:
        return "pedroso"
    if "rianxo" in n:
        return "rianxo"
    if "grazalema" in n:
        return "grazalema"
    if "almadrava" in n:
        return "almadrava"
    if "flumendosa" in n:
        return "flumendosa"
    if "lisboa" in n:
        return "lisboa"
    if "guarda" in n:
        return "a-guarda"
    if "deva" in n:
        return "deva"
    if "cova negra" in n:
        return "cova-negra"
    return "sin-etiquetar"


def extract_slug_google_search(campaign_name, adgroup_name):
    """
    For Google Search campaigns (format ES_Conversiones_Search_Tipo_SLUG or similar),
    extract slug from the last segment of campaign or adgroup name.
    Generic campaigns -> sin-etiquetar.
    """
    c = campaign_name.lower() if campaign_name else ""
    a = adgroup_name.lower() if adgroup_name else ""

    # Generic/non-destination campaigns -> sin-etiquetar
    generic_patterns = [
        "marca", "no-marca", "no_marca", "campings", "competencia",
        "ccaa", "provincia", "verano", "espa", "lkl", "genéric",
        "generic", "san valentin", "san_valentin", "search_generico",
        "search_generica", "gen_dem", "display", "video", "youtube",
        "demand", "remarketing", "search_campings", "search_competencia",
        "search_provincia", "fr_search"
    ]
    for pat in generic_patterns:
        if pat in c:
            return "sin-etiquetar"

    # Try to get slug from campaign name last segment
    # Format: PREFIX_Search_TIPO_SLUG or PREFIX_Search_SLUG
    parts = campaign_name.split("_") if campaign_name else []
    # Look for destination slug in last parts
    if len(parts) >= 2:
        candidate = "_".join(parts[-2:]).lower()
        slug = extract_slug(candidate)
        if slug != "sin-etiquetar":
            return slug
        candidate = parts[-1].lower()
        slug = extract_slug(candidate)
        if slug != "sin-etiquetar":
            return slug

    # Try from adgroup name
    slug = extract_slug(a)
    return slug


def extract_slug_google_non_pmax(campaign_name, adgroup_name):
    """Handle Google non-PMAX rows."""
    c = campaign_name.lower() if campaign_name else ""
    a = adgroup_name.lower() if adgroup_name else ""

    # Check if it's a Search campaign with destination
    if "search" in c:
        return extract_slug_google_search(campaign_name, adgroup_name)

    # Gen Demand, Display, Video, YouTube generic -> sin-etiquetar
    generic_keywords = [
        "gen_dem", "gen-dem", "display", "video", "youtube", "demand",
        "remarketing", "genéric", "generic", "san valentin", "fr_search",
        "search_generico", "search_generica", "search_campings",
        "search_competencia", "search_provincia"
    ]
    for pat in generic_keywords:
        if pat in c:
            return "sin-etiquetar"

    # Try adgroup name
    slug = extract_slug(a)
    if slug != "sin-etiquetar":
        return slug

    # Try campaign name
    slug = extract_slug(c)
    return slug


def pmax_slug_from_asset_group(asset_group_name):
    """PMAX_SLUG_RULES: extract slug from asset_group_name."""
    if not asset_group_name:
        return "sin-etiquetar"
    n = asset_group_name.lower()
    # Normalize accents for matching
    n_norm = n.replace("á","a").replace("é","e").replace("í","i").replace("ó","o").replace("ú","u").replace("ñ","n").replace("ü","u").replace("à","a").replace("è","e").replace("ò","o")

    if "palmar" in n_norm:
        return "el-palmar"
    if "donana" in n_norm or "doñana" in n:
        return "donana"
    if "los-canos" in n_norm or "canos" in n_norm or "conil" in n_norm:
        return "conil"
    if "platjadaro" in n_norm or "platja-de-aro" in n_norm or "platja d'aro" in n or "platja de aro" in n:
        return "platja-de-aro"
    if "ria-de-vigo" in n_norm or "ría-de-vigo" in n or "ria de vigo" in n_norm:
        return "ria-de-vigo"
    # French PMAX: Kampaoh + location name -> map to sin-etiquetar (France)
    if "kampaoh" in n_norm:
        # French locations
        french = ["cote sauvage", "ile de re", "la rochelle", "mezos", "mézos",
                  "talmont", "urrugne"]
        for f in french:
            if f in n_norm:
                return "sin-etiquetar"
        # Otherwise try general slug
        name_without_kampaoh = n_norm.replace("kampaoh","").strip()
        return extract_slug(name_without_kampaoh)
    # "Grupo de recursos Tarifa"
    if "tarifa" in n_norm:
        return "tarifa"
    # Apply general SLUG_RULES on the asset_group_name (already slug-like for ES)
    slug = extract_slug(n_norm)
    return slug


def fmt_date(d):
    """Convert 20250201 -> 2025-02-01"""
    d = str(d)
    return f"{d[:4]}-{d[4:6]}-{d[6:8]}"


# ---- LOAD META DATA ----
print("Loading Meta data...")
with open('/Users/victorarias/.claude/projects/-Users-victorarias-Documents-Ads-inversi-n/ac9619cf-ef02-4821-b661-71df0ef651d4/tool-results/mcp-claude_ai_Portermetrics-query_data-1779617822140.txt', 'r') as f:
    meta_json = json.load(f)

meta_cols = meta_json['columns']
meta_rows = meta_json['rows']
print(f"Meta: {len(meta_rows)} rows, columns: {meta_cols}")

# Aggregate Meta by (date, slug)
meta_agg = defaultdict(float)
for row in meta_rows:
    row_dict = dict(zip(meta_cols, row))
    date = fmt_date(row_dict['date'])
    adset = row_dict.get('adset_name', '')
    spend = float(row_dict.get('amount_spent', 0) or 0)
    slug = extract_slug(adset)
    meta_agg[(date, slug)] += spend

print(f"Meta aggregated into {len(meta_agg)} (date, slug) pairs")
# Sample
for k, v in list(meta_agg.items())[:5]:
    print(f"  {k}: {v:.2f}")


# ---- TIKTOK DATA (already in memory) ----
print("\nProcessing TikTok data...")
tiktok_rows = [
    ["20250221", "general", "0.03"],
    ["20250221", "las-arenas 19/02/2024", "0.17"],
    ["20250221", "las-arenas 25/07/24", "20.13"],
    ["20250222", "las-arenas 25/07/24", "19.87"],
    ["20250223", "las-arenas 25/07/24", "20.08"],
    ["20250224", "las-arenas 25/07/24", "20.05"],
    ["20250225", "las-arenas 25/07/24", "20.07"],
    ["20250226", "las-arenas 25/07/24", "20.07"],
    ["20250227", "las-arenas 25/07/24", "20.09"],
    ["20250228", "las-arenas 25/07/24", "19.91"],
]
tiktok_agg = defaultdict(float)
for row in tiktok_rows:
    date = fmt_date(row[0])
    adgroup = row[1]
    spend = float(row[2])
    slug = extract_slug(adgroup)
    if slug == "sin-etiquetar" and adgroup == "general":
        slug = "sin-etiquetar"
    tiktok_agg[(date, slug)] += spend

print(f"TikTok aggregated into {len(tiktok_agg)} (date, slug) pairs")
for k, v in tiktok_agg.items():
    print(f"  {k}: {v:.2f}")


# ---- LOAD GOOGLE NON-PMAX DATA ----
print("\nLoading Google non-PMAX data...")
with open('/Users/victorarias/.claude/projects/-Users-victorarias-Documents-Ads-inversi-n/ac9619cf-ef02-4821-b661-71df0ef651d4/tool-results/mcp-claude_ai_Portermetrics-query_data-1779617842121.txt', 'r') as f:
    g_json = json.load(f)

g_cols = g_json['columns']
g_rows = g_json['rows']
print(f"Google non-PMAX: {len(g_rows)} rows, columns: {g_cols}")

google_agg = defaultdict(float)
for row in g_rows:
    row_dict = dict(zip(g_cols, row))
    date = fmt_date(row_dict['date'])
    campaign = row_dict.get('google_ads_campaign_name', '')
    adgroup = row_dict.get('google_ads_ad_group_name', '')
    cost_micros = float(row_dict.get('google_ads_cost_micros', 0) or 0)
    cost_eur = cost_micros / 1_000_000
    slug = extract_slug_google_non_pmax(campaign, adgroup)
    google_agg[(date, slug)] += cost_eur

print(f"Google non-PMAX aggregated into {len(google_agg)} (date, slug) pairs")
# Sample
for k, v in list(google_agg.items())[:5]:
    print(f"  {k}: {v:.2f}")


# ---- GOOGLE PMAX DATA (already in memory) ----
print("\nProcessing Google PMAX data...")
pmax_rows_raw = [["20250201","Kampaoh Côte Sauvage","FR_PMAX_FRANCIA_Feed_Hotel","4.633088"],["20250201","Kampaoh Ile de Ré","FR_PMAX_FRANCIA_Feed_Hotel","2.665597"],["20250201","Kampaoh La Rochelle","FR_PMAX_FRANCIA_Feed_Hotel","10.799408"],["20250201","Kampaoh Mézos","FR_PMAX_FRANCIA_Feed_Hotel","7.913179"],["20250201","Kampaoh Talmont-Saint-Hilaire","FR_PMAX_FRANCIA_Feed_Hotel","4.870188"],["20250201","Kampaoh Urrugne","FR_PMAX_FRANCIA_Feed_Hotel","2.261045"],["20250202","Kampaoh Côte Sauvage","FR_PMAX_FRANCIA_Feed_Hotel","3.985396"],["20250202","Kampaoh Ile de Ré","FR_PMAX_FRANCIA_Feed_Hotel","1.798603"],["20250202","Kampaoh La Rochelle","FR_PMAX_FRANCIA_Feed_Hotel","9.363951"],["20250202","Kampaoh Mézos","FR_PMAX_FRANCIA_Feed_Hotel","5.1225"],["20250202","Kampaoh Talmont-Saint-Hilaire","FR_PMAX_FRANCIA_Feed_Hotel","3.727525"],["20250202","Kampaoh Urrugne","FR_PMAX_FRANCIA_Feed_Hotel","6.607235"],["20250203","Kampaoh Côte Sauvage","FR_PMAX_FRANCIA_Feed_Hotel","2.66172"],["20250203","Kampaoh Ile de Ré","FR_PMAX_FRANCIA_Feed_Hotel","3.465285"],["20250203","Kampaoh La Rochelle","FR_PMAX_FRANCIA_Feed_Hotel","7.123205"],["20250203","Kampaoh Mézos","FR_PMAX_FRANCIA_Feed_Hotel","7.360912"],["20250203","Kampaoh Talmont-Saint-Hilaire","FR_PMAX_FRANCIA_Feed_Hotel","1.815792"],["20250203","Kampaoh Urrugne","FR_PMAX_FRANCIA_Feed_Hotel","5.764915"],["20250204","Kampaoh Côte Sauvage","FR_PMAX_FRANCIA_Feed_Hotel","3.572047"],["20250204","Kampaoh Ile de Ré","FR_PMAX_FRANCIA_Feed_Hotel","1.793175"],["20250204","Kampaoh La Rochelle","FR_PMAX_FRANCIA_Feed_Hotel","13.200105"],["20250204","Kampaoh Mézos","FR_PMAX_FRANCIA_Feed_Hotel","9.176555"],["20250204","Kampaoh Talmont-Saint-Hilaire","FR_PMAX_FRANCIA_Feed_Hotel","2.247749"],["20250204","Kampaoh Urrugne","FR_PMAX_FRANCIA_Feed_Hotel","14.13657"],["20250205","Kampaoh Côte Sauvage","FR_PMAX_FRANCIA_Feed_Hotel","3.280732"],["20250205","Kampaoh Ile de Ré","FR_PMAX_FRANCIA_Feed_Hotel","6.122819"],["20250205","Kampaoh La Rochelle","FR_PMAX_FRANCIA_Feed_Hotel","4.180374"],["20250205","Kampaoh Mézos","FR_PMAX_FRANCIA_Feed_Hotel","9.1056"],["20250205","Kampaoh Talmont-Saint-Hilaire","FR_PMAX_FRANCIA_Feed_Hotel","1.493267"],["20250205","Kampaoh Urrugne","FR_PMAX_FRANCIA_Feed_Hotel","11.740304"],["20250206","Kampaoh Côte Sauvage","FR_PMAX_FRANCIA_Feed_Hotel","1.625317"],["20250206","Kampaoh Ile de Ré","FR_PMAX_FRANCIA_Feed_Hotel","6.234681"],["20250206","Kampaoh La Rochelle","FR_PMAX_FRANCIA_Feed_Hotel","1.100014"],["20250206","Kampaoh Mézos","FR_PMAX_FRANCIA_Feed_Hotel","6.842407"],["20250206","Kampaoh Talmont-Saint-Hilaire","FR_PMAX_FRANCIA_Feed_Hotel","2.29481"],["20250206","Kampaoh Urrugne","FR_PMAX_FRANCIA_Feed_Hotel","17.023163"],["20250207","Kampaoh Côte Sauvage","FR_PMAX_FRANCIA_Feed_Hotel","0.786221"],["20250207","Kampaoh Ile de Ré","FR_PMAX_FRANCIA_Feed_Hotel","1.811632"],["20250207","Kampaoh La Rochelle","FR_PMAX_FRANCIA_Feed_Hotel","1.098116"],["20250207","Kampaoh Mézos","FR_PMAX_FRANCIA_Feed_Hotel","0.735785"],["20250207","Kampaoh Talmont-Saint-Hilaire","FR_PMAX_FRANCIA_Feed_Hotel","2.736579"],["20250207","Kampaoh Urrugne","FR_PMAX_FRANCIA_Feed_Hotel","0.975765"],["20250208","Kampaoh Côte Sauvage","FR_PMAX_FRANCIA_Feed_Hotel","9.029043"],["20250208","Kampaoh Ile de Ré","FR_PMAX_FRANCIA_Feed_Hotel","15.001274"],["20250208","Kampaoh La Rochelle","FR_PMAX_FRANCIA_Feed_Hotel","3.207305"],["20250208","Kampaoh Mézos","FR_PMAX_FRANCIA_Feed_Hotel","9.019245"],["20250208","Kampaoh Talmont-Saint-Hilaire","FR_PMAX_FRANCIA_Feed_Hotel","5.315715"],["20250208","Kampaoh Urrugne","FR_PMAX_FRANCIA_Feed_Hotel","6.614862"],["20250209","Kampaoh Côte Sauvage","FR_PMAX_FRANCIA_Feed_Hotel","5.344862"],["20250209","Kampaoh Ile de Ré","FR_PMAX_FRANCIA_Feed_Hotel","7.743821"],["20250209","Kampaoh La Rochelle","FR_PMAX_FRANCIA_Feed_Hotel","2.43031"],["20250209","Kampaoh Mézos","FR_PMAX_FRANCIA_Feed_Hotel","5.726973"],["20250209","Kampaoh Talmont-Saint-Hilaire","FR_PMAX_FRANCIA_Feed_Hotel","5.385676"],["20250209","Kampaoh Urrugne","FR_PMAX_FRANCIA_Feed_Hotel","9.648167"],["20250210","Kampaoh Côte Sauvage","FR_PMAX_FRANCIA_Feed_Hotel","1.227226"],["20250210","Kampaoh Ile de Ré","FR_PMAX_FRANCIA_Feed_Hotel","2.961884"],["20250210","Kampaoh La Rochelle","FR_PMAX_FRANCIA_Feed_Hotel","4.206281"],["20250210","Kampaoh Mézos","FR_PMAX_FRANCIA_Feed_Hotel","6.538039"],["20250210","Kampaoh Talmont-Saint-Hilaire","FR_PMAX_FRANCIA_Feed_Hotel","2.466209"],["20250210","Kampaoh Urrugne","FR_PMAX_FRANCIA_Feed_Hotel","7.706577"],["20250211","Kampaoh Côte Sauvage","FR_PMAX_FRANCIA_Feed_Hotel","3.189383"],["20250211","Kampaoh Ile de Ré","FR_PMAX_FRANCIA_Feed_Hotel","13.410165"],["20250211","Kampaoh La Rochelle","FR_PMAX_FRANCIA_Feed_Hotel","3.390286"],["20250211","Kampaoh Mézos","FR_PMAX_FRANCIA_Feed_Hotel","9.323923"],["20250211","Kampaoh Talmont-Saint-Hilaire","FR_PMAX_FRANCIA_Feed_Hotel","5.79818"],["20250211","Kampaoh Urrugne","FR_PMAX_FRANCIA_Feed_Hotel","7.191746"],["20250212","Kampaoh Côte Sauvage","FR_PMAX_FRANCIA_Feed_Hotel","0.956732"],["20250212","Kampaoh Ile de Ré","FR_PMAX_FRANCIA_Feed_Hotel","7.050735"],["20250212","Kampaoh La Rochelle","FR_PMAX_FRANCIA_Feed_Hotel","3.761583"],["20250212","Kampaoh Mézos","FR_PMAX_FRANCIA_Feed_Hotel","10.473506"],["20250212","Kampaoh Talmont-Saint-Hilaire","FR_PMAX_FRANCIA_Feed_Hotel","4.329891"],["20250212","Kampaoh Urrugne","FR_PMAX_FRANCIA_Feed_Hotel","6.723939"],["20250213","Kampaoh Côte Sauvage","FR_PMAX_FRANCIA_Feed_Hotel","3.127022"],["20250213","Kampaoh Ile de Ré","FR_PMAX_FRANCIA_Feed_Hotel","4.45778"],["20250213","Kampaoh La Rochelle","FR_PMAX_FRANCIA_Feed_Hotel","4.051948"],["20250213","Kampaoh Mézos","FR_PMAX_FRANCIA_Feed_Hotel","3.167594"],["20250213","Kampaoh Talmont-Saint-Hilaire","FR_PMAX_FRANCIA_Feed_Hotel","5.419533"],["20250213","Kampaoh Urrugne","FR_PMAX_FRANCIA_Feed_Hotel","3.395131"],["20250214","Kampaoh Côte Sauvage","FR_PMAX_FRANCIA_Feed_Hotel","1.579757"],["20250214","Kampaoh Ile de Ré","FR_PMAX_FRANCIA_Feed_Hotel","10.348429"],["20250214","Kampaoh La Rochelle","FR_PMAX_FRANCIA_Feed_Hotel","7.024038"],["20250214","Kampaoh Mézos","FR_PMAX_FRANCIA_Feed_Hotel","6.73901"],["20250214","Kampaoh Talmont-Saint-Hilaire","FR_PMAX_FRANCIA_Feed_Hotel","4.349877"],["20250214","Kampaoh Urrugne","FR_PMAX_FRANCIA_Feed_Hotel","5.384013"],["20250215","Kampaoh Côte Sauvage","FR_PMAX_FRANCIA_Feed_Hotel","1.592311"],["20250215","Kampaoh Ile de Ré","FR_PMAX_FRANCIA_Feed_Hotel","11.569757"],["20250215","Kampaoh La Rochelle","FR_PMAX_FRANCIA_Feed_Hotel","8.22656"],["20250215","Kampaoh Mézos","FR_PMAX_FRANCIA_Feed_Hotel","8.38271"],["20250215","Kampaoh Talmont-Saint-Hilaire","FR_PMAX_FRANCIA_Feed_Hotel","4.712691"],["20250215","Kampaoh Urrugne","FR_PMAX_FRANCIA_Feed_Hotel","10.861095"],["20250216","Kampaoh Côte Sauvage","FR_PMAX_FRANCIA_Feed_Hotel","1.49655"],["20250216","Kampaoh Ile de Ré","FR_PMAX_FRANCIA_Feed_Hotel","9.029105"],["20250216","Kampaoh La Rochelle","FR_PMAX_FRANCIA_Feed_Hotel","2.022907"],["20250216","Kampaoh Mézos","FR_PMAX_FRANCIA_Feed_Hotel","6.767976"],["20250216","Kampaoh Talmont-Saint-Hilaire","FR_PMAX_FRANCIA_Feed_Hotel","8.1177"],["20250216","Kampaoh Urrugne","FR_PMAX_FRANCIA_Feed_Hotel","9.880987"],["20250217","Kampaoh Côte Sauvage","FR_PMAX_FRANCIA_Feed_Hotel","1.932522"],["20250217","Kampaoh Ile de Ré","FR_PMAX_FRANCIA_Feed_Hotel","5.318639"],["20250217","Kampaoh La Rochelle","FR_PMAX_FRANCIA_Feed_Hotel","6.274431"],["20250217","Kampaoh Mézos","FR_PMAX_FRANCIA_Feed_Hotel","4.002521"],["20250217","Kampaoh Talmont-Saint-Hilaire","FR_PMAX_FRANCIA_Feed_Hotel","1.376407"],["20250217","Kampaoh Urrugne","FR_PMAX_FRANCIA_Feed_Hotel","12.195664"],["20250218","Kampaoh Côte Sauvage","FR_PMAX_FRANCIA_Feed_Hotel","1.669081"],["20250218","Kampaoh Ile de Ré","FR_PMAX_FRANCIA_Feed_Hotel","11.177062"],["20250218","Kampaoh La Rochelle","FR_PMAX_FRANCIA_Feed_Hotel","1.066962"],["20250218","Kampaoh Mézos","FR_PMAX_FRANCIA_Feed_Hotel","6.82109"],["20250218","Kampaoh Talmont-Saint-Hilaire","FR_PMAX_FRANCIA_Feed_Hotel","8.923529"],["20250218","Kampaoh Urrugne","FR_PMAX_FRANCIA_Feed_Hotel","7.99307"],["20250219","Kampaoh Côte Sauvage","FR_PMAX_FRANCIA_Feed_Hotel","0.978222"],["20250219","Kampaoh Ile de Ré","FR_PMAX_FRANCIA_Feed_Hotel","7.815257"],["20250219","Kampaoh La Rochelle","FR_PMAX_FRANCIA_Feed_Hotel","4.708055"],["20250219","Kampaoh Mézos","FR_PMAX_FRANCIA_Feed_Hotel","4.275146"],["20250219","Kampaoh Talmont-Saint-Hilaire","FR_PMAX_FRANCIA_Feed_Hotel","1.885776"],["20250219","Kampaoh Urrugne","FR_PMAX_FRANCIA_Feed_Hotel","5.929626"],["20250220","Kampaoh Côte Sauvage","FR_PMAX_FRANCIA_Feed_Hotel","4.076035"],["20250220","Kampaoh Ile de Ré","FR_PMAX_FRANCIA_Feed_Hotel","7.738193"],["20250220","Kampaoh La Rochelle","FR_PMAX_FRANCIA_Feed_Hotel","6.234839"],["20250220","Kampaoh Mézos","FR_PMAX_FRANCIA_Feed_Hotel","5.697896"],["20250220","Kampaoh Talmont-Saint-Hilaire","FR_PMAX_FRANCIA_Feed_Hotel","1.697317"],["20250220","Kampaoh Urrugne","FR_PMAX_FRANCIA_Feed_Hotel","9.837755"],["20250221","Kampaoh Côte Sauvage","FR_PMAX_FRANCIA_Feed_Hotel","1.812011"],["20250221","Kampaoh Ile de Ré","FR_PMAX_FRANCIA_Feed_Hotel","9.978324"],["20250221","Kampaoh La Rochelle","FR_PMAX_FRANCIA_Feed_Hotel","6.115077"],["20250221","Kampaoh Mézos","FR_PMAX_FRANCIA_Feed_Hotel","4.8439"],["20250221","Kampaoh Talmont-Saint-Hilaire","FR_PMAX_FRANCIA_Feed_Hotel","2.805363"],["20250221","Kampaoh Urrugne","FR_PMAX_FRANCIA_Feed_Hotel","10.650792"],["20250222","Kampaoh Côte Sauvage","FR_PMAX_FRANCIA_Feed_Hotel","2.029289"],["20250222","Kampaoh Ile de Ré","FR_PMAX_FRANCIA_Feed_Hotel","10.036039"],["20250222","Kampaoh La Rochelle","FR_PMAX_FRANCIA_Feed_Hotel","0.775527"],["20250222","Kampaoh Mézos","FR_PMAX_FRANCIA_Feed_Hotel","2.44567"],["20250222","Kampaoh Talmont-Saint-Hilaire","FR_PMAX_FRANCIA_Feed_Hotel","0.541821"],["20250222","Kampaoh Urrugne","FR_PMAX_FRANCIA_Feed_Hotel","12.039861"],["20250223","Kampaoh Côte Sauvage","FR_PMAX_FRANCIA_Feed_Hotel","1.714153"],["20250223","Kampaoh Ile de Ré","FR_PMAX_FRANCIA_Feed_Hotel","10.61032"],["20250223","Kampaoh La Rochelle","FR_PMAX_FRANCIA_Feed_Hotel","3.873026"],["20250223","Kampaoh Mézos","FR_PMAX_FRANCIA_Feed_Hotel","1.411129"],["20250223","Kampaoh Talmont-Saint-Hilaire","FR_PMAX_FRANCIA_Feed_Hotel","3.898829"],["20250223","Kampaoh Urrugne","FR_PMAX_FRANCIA_Feed_Hotel","3.492303"],["20250224","Grupo de recursos Tarifa","ES_PMAX_apertura_Tarifa","4.739438"],["20250224","Kampaoh Côte Sauvage","FR_PMAX_FRANCIA_Feed_Hotel","2.793237"],["20250224","Kampaoh Ile de Ré","FR_PMAX_FRANCIA_Feed_Hotel","3.577888"],["20250224","Kampaoh La Rochelle","FR_PMAX_FRANCIA_Feed_Hotel","2.171345"],["20250224","Kampaoh Mézos","FR_PMAX_FRANCIA_Feed_Hotel","2.186314"],["20250224","Kampaoh Talmont-Saint-Hilaire","FR_PMAX_FRANCIA_Feed_Hotel","1.864869"],["20250224","Kampaoh Urrugne","FR_PMAX_FRANCIA_Feed_Hotel","9.587548"],["20250225","Grupo de recursos Tarifa","ES_PMAX_apertura_Tarifa","15.643152"],["20250225","Kampaoh Côte Sauvage","FR_PMAX_FRANCIA_Feed_Hotel","2.7978"],["20250225","Kampaoh Ile de Ré","FR_PMAX_FRANCIA_Feed_Hotel","4.98932"],["20250225","Kampaoh La Rochelle","FR_PMAX_FRANCIA_Feed_Hotel","2.810471"],["20250225","Kampaoh Mézos","FR_PMAX_FRANCIA_Feed_Hotel","2.047515"],["20250225","Kampaoh Talmont-Saint-Hilaire","FR_PMAX_FRANCIA_Feed_Hotel","3.486088"],["20250225","Kampaoh Urrugne","FR_PMAX_FRANCIA_Feed_Hotel","8.357691"],["20250226","Grupo de recursos Tarifa","ES_PMAX_apertura_Tarifa","4.880225"],["20250226","Kampaoh Côte Sauvage","FR_PMAX_FRANCIA_Feed_Hotel","0.484652"],["20250226","Kampaoh Ile de Ré","FR_PMAX_FRANCIA_Feed_Hotel","7.478441"],["20250226","Kampaoh La Rochelle","FR_PMAX_FRANCIA_Feed_Hotel","3.498244"],["20250226","Kampaoh Mézos","FR_PMAX_FRANCIA_Feed_Hotel","3.160997"],["20250226","Kampaoh Talmont-Saint-Hilaire","FR_PMAX_FRANCIA_Feed_Hotel","3.169091"],["20250226","Kampaoh Urrugne","FR_PMAX_FRANCIA_Feed_Hotel","7.257028"],["20250227","Grupo de recursos Tarifa","ES_PMAX_apertura_Tarifa","6.138428"],["20250227","Kampaoh Côte Sauvage","FR_PMAX_FRANCIA_Feed_Hotel","5.332781"],["20250227","Kampaoh Ile de Ré","FR_PMAX_FRANCIA_Feed_Hotel","7.621599"],["20250227","Kampaoh La Rochelle","FR_PMAX_FRANCIA_Feed_Hotel","3.293558"],["20250227","Kampaoh Mézos","FR_PMAX_FRANCIA_Feed_Hotel","2.213195"],["20250227","Kampaoh Talmont-Saint-Hilaire","FR_PMAX_FRANCIA_Feed_Hotel","2.82336"],["20250227","Kampaoh Urrugne","FR_PMAX_FRANCIA_Feed_Hotel","3.77585"],["20250228","Grupo de recursos Tarifa","ES_PMAX_apertura_Tarifa","29.220094"],["20250228","Kampaoh Côte Sauvage","FR_PMAX_FRANCIA_Feed_Hotel","0.688109"],["20250228","Kampaoh Ile de Ré","FR_PMAX_FRANCIA_Feed_Hotel","7.257225"],["20250228","Kampaoh La Rochelle","FR_PMAX_FRANCIA_Feed_Hotel","0.773"],["20250228","Kampaoh Mézos","FR_PMAX_FRANCIA_Feed_Hotel","1.344441"],["20250228","Kampaoh Talmont-Saint-Hilaire","FR_PMAX_FRANCIA_Feed_Hotel","1.96945"],["20250228","Kampaoh Urrugne","FR_PMAX_FRANCIA_Feed_Hotel","3.973263"]]

# PMAX cols: date, asset_group_name, campaign_name, cost_micros
for row in pmax_rows_raw:
    date = fmt_date(row[0])
    asset_group = row[1]
    campaign = row[2]
    cost_micros = float(row[3])
    cost_eur = cost_micros / 1_000_000
    slug = pmax_slug_from_asset_group(asset_group)
    google_agg[(date, slug)] += cost_eur

print(f"Google total (non-PMAX + PMAX) aggregated into {len(google_agg)} (date, slug) pairs")
# Sample
for k, v in list(google_agg.items())[:5]:
    print(f"  {k}: {v:.2f}")


# ---- BUILD OUTPUT STRUCTURE ----
print("\nBuilding output structure...")
result = {}

def add_to_result(platform_key, agg_dict):
    for (date, slug), spend in agg_dict.items():
        if spend <= 0:
            continue
        if date not in result:
            result[date] = {}
        if platform_key not in result[date]:
            result[date][platform_key] = {}
        result[date][platform_key][slug] = round(spend, 2)

add_to_result("m", meta_agg)
add_to_result("t", tiktok_agg)
add_to_result("g", google_agg)

# Sort by date
result_sorted = dict(sorted(result.items()))

# Write output
output_path = '/Users/victorarias/Documents/Ads inversión/data-tmp-2025-02.json'
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(result_sorted, f, ensure_ascii=False, indent=2)

print(f"\nWritten to {output_path}")
print(f"Days with data: {len(result_sorted)}")

# Print summary
for date in sorted(result_sorted.keys()):
    day = result_sorted[date]
    m_total = sum(day.get('m', {}).values())
    t_total = sum(day.get('t', {}).values())
    g_total = sum(day.get('g', {}).values())
    print(f"  {date}: M={m_total:.2f} T={t_total:.2f} G={g_total:.2f}")
