def get_slug($name):
  ($name | ascii_downcase) as $n |
  if ($n | test("somo parque")) then "somo-parque"
  elif ($n | test("somo")) then "somo-playa"
  elif ($n | test("kikopark rural")) then "kikopark-rural"
  elif ($n | test("kikopark")) then "kikopark-playa"
  elif ($n | test("costa.brava")) then "costa-brava"
  elif ($n | test("costa.blanca")) then "costa-blanca"
  elif ($n | test("la franca|franca")) then "la-franca"
  elif ($n | test("sierra nevada|nevada")) then "sierra-nevada"
  elif ($n | test("sierra urbasa|urbasa")) then "sierra-de-urbasa"
  elif ($n | test("playa de levante|playa levante")) then "playa-de-levante"
  elif ($n | test("playa troenzo|troenzo")) then "playa-troenzo"
  elif ($n | test("los escullos|escullos")) then "los-escullos"
  elif ($n | test("isla cristina|isla.cristina")) then "isla-cristina"
  elif ($n | test("lago de arcos|lago.de.arcos|lago arcos")) then "lago-de-arcos"
  elif ($n | test("santillana del mar|santillana")) then "santillana-del-mar"
  elif ($n | test("fonts d.algar|fonts algar|fonts-dalgar")) then "fonts-dalgar"
  elif ($n | test("delta del ebro|delta ebro|ebro")) then "delta-ebro"
  elif ($n | test("ria de vigo|ría de vigo|ria-de-vigo")) then "ria-de-vigo"
  elif ($n | test("platja de aro|platja d.aro|platjadaro|platja")) then "platja-de-aro"
  elif ($n | test("bayona")) then "bayona-playa"
  elif ($n | test("el palmar|el-palmar")) then "el-palmar"
  elif ($n | test("las arenas|las-arenas")) then "las-arenas"
  elif ($n | test("el rocio|el-rocio|rocio")) then "el-rocio"
  elif ($n | test("o pedrouzo|pedrouzo")) then "o-pedrouzo"
  elif ($n | test("sao martinho|martinho|porto")) then "martinho-do-porto"
  elif ($n | test("puerto santa maria|puerto santa|puerto sta")) then "puerto-santa-maria"
  elif ($n | test("isla")) then "isla-cristina"
  elif ($n | test("conil|canos|caños")) then "conil"
  elif ($n | test("tarifa")) then "tarifa"
  elif ($n | test("trafalgar")) then "trafalgar"
  elif ($n | test("calella")) then "calella"
  elif ($n | test("tossa")) then "tossa-de-mar"
  elif ($n | test("menorca")) then "menorca"
  elif ($n | test("alquezar|alquézar")) then "alquezar"
  elif ($n | test("neptuno")) then "neptuno"
  elif ($n | test("navajas")) then "navajas"
  elif ($n | test("blanes")) then "blanes"
  elif ($n | test("palamos|palamós")) then "palamos"
  elif ($n | test("donana|do.ana")) then "donana"
  elif ($n | test("benicassim")) then "benicassim"
  elif ($n | test("mendigorria")) then "mendigorria"
  elif ($n | test("llanes")) then "llanes"
  elif ($n | test("cambrils")) then "cambrils"
  elif ($n | test("crevillent")) then "crevillent"
  elif ($n | test("roquetas")) then "roquetas"
  elif ($n | test("tavira")) then "tavira"
  elif ($n | test("zumaia")) then "zumaia"
  elif ($n | test("estepona")) then "estepona"
  elif ($n | test("lagoa")) then "lagoa"
  elif ($n | test("oyambre")) then "oyambre"
  elif ($n | test("ruiloba")) then "ruiloba"
  elif ($n | test("cabaneros|caba.eros")) then "cabañeros"
  elif ($n | test("cordoba|córdoba")) then "cordoba"
  elif ($n | test("paloma")) then "paloma"
  elif ($n | test("pedroso")) then "pedroso"
  elif ($n | test("rianxo")) then "rianxo"
  elif ($n | test("grazalema")) then "grazalema"
  elif ($n | test("almadrava")) then "almadrava"
  elif ($n | test("flumendosa")) then "flumendosa"
  elif ($n | test("lisboa")) then "lisboa"
  elif ($n | test("guarda")) then "a-guarda"
  elif ($n | test("deva")) then "deva"
  elif ($n | test("cova negra|cova-negra")) then "cova-negra"
  else "sin-etiquetar"
  end;

[.rows[] | {date: .[1], slug: get_slug(.[0]), spend: (.[2] | tonumber)}]
| group_by(.date + "|" + .slug)
| map({
    date: .[0].date,
    slug: .[0].slug,
    total: (map(.spend) | add | . * 100 | round | . / 100)
  })
| group_by(.date)
| map({
    date: .[0].date,
    slugs: (
      map(select(.total > 0 and .slug != "sin-etiquetar"))
      | map({key: .slug, value: .total})
      | from_entries
    )
  })
| map(select(.slugs | length > 0))
| map({key: .date, value: .slugs}) | from_entries
