# CLAUDE.md — Kampaoh Ads Dashboard

## Quién somos

Kampaoh es una empresa de alojamientos en la naturaleza con ~70 destinos activos, principalmente en España y Portugal. El producto son glampings y campings con reserva online directa. El ticket medio es de 232 €.

El negocio tiene alta estacionalidad: temporada alta junio–septiembre, picos en Semana Santa y puentes, baja octubre–mayo.

---

## Plataformas y conexión

Conectado vía APIs oficiales directas:

- **Meta Ads** — campañas, conjuntos de anuncios, anuncios
- **Google Ads** — Search, PMax, Display, Demand Gen
- **TikTok Ads** — campañas, grupos de anuncios, anuncios
- **GA4** — eventos ecommerce (view_item, add_to_cart, checkout, purchase) por destino

---

## Estructura de campañas

Tenemos dos tipos en todas las plataformas:

### Campañas por destino
El destino se identifica por nomenclatura en el nombre:
- **Meta**: en el nombre del **anuncio** (ad name)
- **TikTok**: en el nombre del **anuncio** (ad name)
- **Google**: en el nombre del **grupo de anuncios** (ad group name)

### Campañas genéricas
Sin destino específico — orientadas a marca, catálogo general o prospección amplia.

---

## Tipos de objetivo por plataforma

### Meta
- **Conversión** — objetivo de compra/reserva
- **Alcance** — maximizar impactos únicos
- **Interacción** — engagement con el contenido
- **Tráfico** — clics a web

### TikTok
- **Conversión** — objetivo de compra/reserva
- **Alcance** — maximizar impactos únicos
- **Tráfico** — clics a web

### Google
- **Conversión** — Search, PMax orientados a reserva
- **Tráfico** — campañas orientadas a visitas
- **Alcance** — Display, YouTube orientados a impactos (Demand Gen)

---

## Destinos — nomenclatura

### España

| Slug | | Slug | | Slug |
|---|---|---|---|---|
| arenas | | cabaneros | | ria-de-vigo |
| valdvaqueros | | lago-de-arcos | | rio-mino |
| el-palmar | | alquezar | | palamos |
| tarifa | | oyambre | | picos-de-urbion |
| puerto-santa-maria | | navajas | | cabo-blanco |
| santillana-del-mar | | almadrava | | kikopark-playa |
| llanes | | calella | | kikopark-rural |
| isla-cristina | | deva | | kikopark |
| paloma | | villajoyosa | | ria-de-arousa-playa |
| donana | | crevillent | | ria-de-arousa-rural |
| costa-brava | | bayona-playa | | pintens |
| costa-dorada | | bayona | | la-bolera |
| cova-negra | | la-franca | | playa-troenzo |
| tossa-de-mar | | delta-ebro | | oliva |
| cambrils | | blanes | | el-rocio |
| platjadaro | | moncofar | | esponella |
| somo-playa | | playa-de-sueca | | menorca |
| somo-parque | | benicassim | | estepona |
| somo | | roquetas | | neptuno |
| sierra-de-urbasa | | conil | | lagoa |
| mendigorria | | bufones-de-pria | | pedroso |
| castrillon | | los-canos | | |
| rianxo | | trafalgar | | |
| zumaia | | grazalema | | |
| ruiloba | | costa-del-sol | | |
| cordoba | | costa-blanca | | |
| cazorla | | los-escullos | | |
| playa-de-levante | | sierra-nevada | | |
| benajarafe | | marbella | | |

### Portugal

ancora, gala, vagueira, mira, meco, praia-de-angeiras, peniche, sesimbra, lisboa, san-pedro-moel, tavira, porto

> Algunos destinos pueden estar inactivos en un momento dado pero se mantienen en la nomenclatura como referencia.

---

## Extracción de destino en análisis

Cuando analices datos de campañas:

1. Buscar el slug del destino en el nombre del anuncio (Meta/TikTok) o grupo de anuncios (Google)
2. Si no hay destino identificable → clasificar como `genérica`
3. Si hay destino → cruzar con tipo de objetivo para el análisis destino × objetivo

---

## Métricas clave por plataforma

| Métrica | Meta | Google Search | TikTok |
|---|---|---|---|
| CTR | 0,9–2,5% | 3–8% | 0,5–1,5% |
| CPM (€) | 5–15 € | variable | 3–10 € |
| CPC (€) | 0,30–1,50 € | 0,50–3,00 € | 0,20–0,80 € |
| Frecuencia | 1,5–3,0 | n/a | 1,5–2,5 |
| ROAS mínimo | ×2–×3 | ×3–×5 | ×1,5–×2,5 |

Con ticket medio de 232 €: ROAS ×3 implica CPA máximo ~77 €.

---

## Análisis por destino

Siempre que presentes datos de inversión, incluye desglose por destino × plataforma. Formato mínimo:

| Destino | Meta | Google | TikTok | Total | Conv. GA4 |
|---|---|---|---|---|---|
| las-arenas | — | — | — | — | — |
| ... | | | | | |

Cruza inversión con datos GA4 cuando estén disponibles (view_item, reservas, tasa de conversión).

Alertas a detectar:
- Destino con >50% del gasto total sin justificación
- Destino con alto gasto y baja conversión en GA4
- Destino activo sin ninguna campaña por destino (solo genéricas)
- Anuncios sin destino identificable en nomenclatura 🔴

---

## Notas Kampaoh

- **Funnel largo**: el usuario no reserva en la primera visita — el retargeting es crítico en todas las plataformas
- **Ventana de atribución**: 7 días clic + 1 día vista en Meta; basada en datos en Google
- **Creatividades**: vídeo en entorno natural supera ampliamente a estáticas en Meta y TikTok
- **Audiencias principales**: parejas 25–45, familias con hijos pequeños, grupos de amigos
- **Fechas clave de inversión**: feb–mar (captación verano anticipada), mar–abr (Semana Santa), mayo (urgencia últimas plazas), nov (Black Friday)
- **Excluir siempre** clientes con reserva confirmada de campañas de adquisición
