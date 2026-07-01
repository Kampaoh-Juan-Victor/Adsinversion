def get_slug($c; $a):
  ($a | ascii_downcase | ltrimstr("search_no-marca_") | ltrimstr("search_")) as $raw |
  if ($c | ascii_downcase | test("lpks_no_marca")) then
    if ($raw | test("alquezar")) then "alquezar"
    elif ($raw | test("bayona")) then "bayona-playa"
    elif ($raw | test("benicassim")) then "benicassim"
    elif ($raw | test("calella")) then "calella"
    elif ($raw | test("cordoba")) then "cordoba"
    elif ($raw | test("costa-blanca")) then "costa-blanca"
    elif ($raw | test("costa-brava")) then "costa-brava"
    elif ($raw | test("cova-negra")) then "cova-negra"
    elif ($raw | test("delta-ebro")) then "delta-ebro"
    elif ($raw | test("^deva$")) then "deva"
    elif ($raw | test("donana")) then "donana"
    elif ($raw | test("fonts-dalgar")) then "fonts-dalgar"
    elif ($raw | test("grazalema")) then "grazalema"
    elif ($raw | test("isla-cristina")) then "isla-cristina"
    elif ($raw | test("kikopark-playa")) then "kikopark-playa"
    elif ($raw | test("lago-de-arcos")) then "lago-de-arcos"
    elif ($raw | test("las-arenas")) then "las-arenas"
    elif ($raw | test("llanes")) then "llanes"
    elif ($raw | test("los-escullos")) then "los-escullos"
    elif ($raw | test("almadrava")) then "almadrava"
    elif ($raw | test("mendigorria")) then "mendigorria"
    elif ($raw | test("navajas")) then "navajas"
    elif ($raw | test("palamos")) then "palamos"
    elif ($raw | test("palmar")) then "el-palmar"
    elif ($raw | test("paloma")) then "paloma"
    elif ($raw | test("pedroso")) then "pedroso"
    elif ($raw | test("playa-de-levante")) then "playa-de-levante"
    elif ($raw | test("playa-troenzo")) then "playa-troenzo"
    elif ($raw | test("ria-de-vigo")) then "ria-de-vigo"
    elif ($raw | test("santillana-del-mar")) then "santillana-del-mar"
    elif ($raw | test("sierra-de-urbasa")) then "sierra-de-urbasa"
    elif ($raw | test("sierra-nevada")) then "sierra-nevada"
    elif ($raw | test("somo-playa")) then "somo-playa"
    elif ($raw | test("tarifa")) then "tarifa"
    elif ($raw | test("tossa-de-mar")) then "tossa-de-mar"
    elif ($raw | test("trafalgar")) then "trafalgar"
    elif ($raw | test("zumaia")) then "zumaia"
    elif ($raw | test("rocio")) then "el-rocio"
    else "sin-etiquetar"
    end
  else "sin-etiquetar"
  end;

[.rows[] | {date: .[0], slug: get_slug(.[2]; .[1]), cost: (.[3] | tonumber)}]
| group_by(.date + "|" + .slug)
| map({
    date: .[0].date,
    slug: .[0].slug,
    total: (map(.cost) | add | . * 100 | round | . / 100)
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
| from_entries? // map({key: .date, value: .slugs}) | from_entries
