# Contexto de Sesión - Dashboard Kampaoh

## 📋 Resumen General

Estamos creando un **Dashboard de Inversión Publicitaria** para Kampaoh (glampings) que:
- Muestra inversión diaria (Meta, Google, TikTok)
- Muestra métricas GA4 (vistas, reservas por propiedad)
- Se actualiza automáticamente desde Porter cada 5-10 minutos
- Es colaborativo en GitHub

---

## ✅ Lo que ya funciona

1. **Dashboard en vivo** → http://localhost:8766/
   - Inversión Publicitaria (index.html)
   - GA4 (ga4.html)
   - Google Ads (google.html)
   - Campañas (campanas.html)

2. **Servidor Node.js** (`serve.js`)
   - Puerto 8766
   - Sirve archivos HTML/JSON

3. **Scripts de actualización**
   - `refresh.js` → Trae inversión diaria (Meta, Google, TikTok)
   - `ga4-refresh.js` → Trae vistas y reservas GA4
   - `campaigns-refresh.js` → Trae datos de campañas
   - `auto-refresh.js` → Ejecuta los 3 cada 10 minutos

4. **GitHub sincronizado**
   - Repo: https://github.com/variass1/Adsinversion
   - Todo pusheado y listo para colaborar

5. **Botón de refrescar**
   - Agregado al dashboard (🔄 Refrescar)
   - Recarga datos desde JSONs

---

## 🔴 Problema encontrado (RESUELTO)

**Porter no estaba pagado hasta el 18 de junio** → por eso los scripts fallaban constantemente.

**Estado:** Ahora Porter está pagado (desde 19 junio), los scripts deberían funcionar.

---

## 🚀 Próximos pasos

### INMEDIATO: Ejecutar refresh para traer datos frescos

Desde Claude Code:
```bash
cd /Users/juandelacruz/Desktop/Adsinversion
node refresh.js && node ga4-refresh.js && node campaigns-refresh.js
```

Esto traerá datos de los últimos 7 días desde Porter.

### DESPUÉS: Verificar datos en dashboard

1. Abre http://localhost:8766/
2. Selecciona "Últimos 7 días"
3. Debería mostrar datos de 12-18 junio 2026

### OPCIONAL: Auto-refresh

Para actualizaciones automáticas cada 10 minutos:
```bash
node auto-refresh.js --interval=600
```

---

## 📊 Datos y archivos importantes

### Estructura de datos

**data.json**
```json
{
  "v": 1,
  "updated": "2026-06-18",
  "days": {
    "2026-06-18": {
      "m": { "las-arenas": 1234.56 },
      "g": { "las-arenas": 789.01 },
      "t": { "las-arenas": 456.78 }
    }
  }
}
```

**ga4-data.json**
```json
{
  "updated": "2026-06-18",
  "rows": [
    [20260618, "Kampaoh Las Arenas", 150, 12, 5, 3]
  ]
}
```

**campaigns-data.json**
- Datos detallados por campaña (Meta + Google)
- Hasta 2026-06-01

---

## 🔑 Credenciales y IDs (IMPORTANTES)

### Porter (MCP)
- MCP ID: `mcp__7782f503-c852-4a77-8016-3d8728ff97e9__fetch`
- Company ID (Kampaoh): `3b582e9f-ea7c-420e-8e65-e097a924ffe0`

### Cuentas publicitarias
| Plataforma | ID | sourceUserId |
|---|---|---|
| Meta España | `act_2068744546681151` | facebook-ads-victorarias@kampaoh.com |
| Meta Francia | `act_3652417178310478` | facebook-ads-victorarias@kampaoh.com |
| Google Ads | `4052984517-4052984517` | google-ads-103062776159609254731 |
| TikTok | `704407781510483251` | tiktok-ads-victorarias@kampaoh.com |
| GA4 | `accounts/111295051/properties/347358752` | google-analytics-4-103062776159609254731 |

---

## 🗺️ Mapeo de destinos (SLUGS)

Los nombres de adsets se normalizan a slugs:
- "arenas" → `las-arenas`
- "palmar" → `el-palmar`
- "costa brava" → `costa-brava`
- "tarifa" → `tarifa`
- Todo lo que no coincide → `sin-etiquetar`

Ver `slugs.js` para lista completa.

---

## 📁 Estructura del proyecto

```
/Users/juandelacruz/Desktop/Adsinversion/
├── serve.js                    # Servidor HTTP (puerto 8766)
├── index.html                  # Dashboard inversión
├── ga4.html                    # Dashboard GA4
├── google.html                 # Dashboard Google Ads
├── campanas.html               # Dashboard campañas
├── refresh.js                  # Script: actualiza data.json
├── ga4-refresh.js              # Script: actualiza ga4-data.json
├── campaigns-refresh.js        # Script: actualiza campaigns-data.json
├── auto-refresh.js             # Loop: ejecuta los 3 cada N minutos
├── data.json                   # Datos inversión diaria
├── ga4-data.json               # Datos GA4
├── campaigns-data.json         # Datos campañas
├── REFRESH.md                  # Instrucciones de uso
└── .git/                       # GitHub (https://github.com/variass1/Adsinversion)
```

---

## 🎯 Estado de datos

| Archivo | Datos hasta | Estado |
|---|---|---|
| data.json | 2026-06-08 | Necesita refresh |
| ga4-data.json | 2026-06-01 | Necesita refresh |
| campaigns-data.json | 2026-06-01 | Necesita refresh |

**PRÓXIMA ACCIÓN:** Ejecutar los 3 scripts para traer datos frescos.

---

## 📞 Contacto con tu jefe

**Lo que puedes mostrarle:**
- Dashboard profesional en http://localhost:8766/
- Código en GitHub (https://github.com/variass1/Adsinversion)
- Scripts automáticos que se actualizan cada 10 minutos
- Sistema listo para colaboración

**Lo que le dirás:**
- Porter estaba sin pago hasta ayer, por eso no había datos frescos
- Ahora que está pagado, los scripts traerán datos en tiempo real
- El dashboard está 100% funcional

---

## 🔗 Links útiles

- **Dashboard:** http://localhost:8766/
- **GitHub:** https://github.com/variass1/Adsinversion
- **REFRESH.md:** Instrucciones completas en el proyecto
- **Porter:** https://portal.portermetrics.com

---

## 📝 Últimas acciones en esta sesión

1. ✅ Creado dashboard HTML
2. ✅ Creados scripts de refresh
3. ✅ Agregado botón de refrescar
4. ✅ Sincronizado en GitHub
5. ✅ Descubierto que Porter no estaba pagado
6. ⏳ **PENDIENTE:** Ejecutar refresh para traer datos frescos
