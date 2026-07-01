# 🔄 Actualización Automática de Datos desde Porter

Este proyecto tiene scripts que actualizan automáticamente los datos desde Porter cada 5-10 minutos.

## Scripts disponibles

### `refresh.js` — Inversión Publicitaria (Meta, Google, TikTok)
Actualiza `data.json` con gasto diario por plataforma y destino.

```bash
# Actualizar ayer
node refresh.js

# Actualizar fecha específica
node refresh.js --date=2026-05-20
```

### `ga4-refresh.js` — Datos GA4 (vistas y reservas)
Actualiza `ga4-data.json` con vistas, carrito, checkout, compras por propiedad.

```bash
# Últimos 7 días
node ga4-refresh.js

# Fecha específica
node ga4-refresh.js --date=2026-05-20
```

### `campaigns-refresh.js` — Datos de Campañas
Actualiza `campaigns-data.json` con detalles de campañas Meta y Google.

```bash
# Ayer
node campaigns-refresh.js

# Fecha específica
node campaigns-refresh.js --date=2026-05-20
```

### `auto-refresh.js` — Actualización Automática (RECOMENDADO)
Ejecuta todos los scripts en loop cada 5-10 minutos.

```bash
# Cada 10 minutos (600 segundos - por defecto)
node auto-refresh.js

# Cada 5 minutos (300 segundos)
node auto-refresh.js --interval=300

# Cada 15 minutos
node auto-refresh.js --interval=900
```

---

## 🚀 Cómo configurar actualización automática

### Opción 1: Ejecutar en background (Terminal)

```bash
# Terminal 1 - Servidor del dashboard
node serve.js

# Terminal 2 - Auto-refresh (en loop infinito)
node auto-refresh.js
```

Así el dashboard siempre tiene datos frescos.

### Opción 2: Programar con cron (Linux/Mac)

Edita tu crontab:
```bash
crontab -e
```

Añade (actualiza cada 10 minutos):
```
*/10 * * * * cd /Users/juandelacruz/Desktop/Adsinversion && node refresh.js >> refresh.log 2>&1
*/10 * * * * cd /Users/juandelacruz/Desktop/Adsinversion && node ga4-refresh.js >> ga4-refresh.log 2>&1
*/10 * * * * cd /Users/juandelacruz/Desktop/Adsinversion && node campaigns-refresh.js >> campaigns-refresh.log 2>&1
```

O ejecuta todo junto:
```
*/10 * * * * cd /Users/juandelacruz/Desktop/Adsinversion && node auto-refresh.js --interval=600 >> auto-refresh.log 2>&1
```

### Opción 3: Usar pm2 (recomendado para producción)

Instala pm2:
```bash
npm install -g pm2
```

Inicia los procesos:
```bash
pm2 start serve.js --name "dashboard"
pm2 start "node auto-refresh.js" --name "auto-refresh"
pm2 save
pm2 startup
```

Ver status:
```bash
pm2 status
pm2 logs
```

---

## ⚙️ Cómo funciona

1. **refresh.js** consulta Porter vía MCP para Meta, Google, TikTok
2. **ga4-refresh.js** consulta Porter para Google Analytics 4
3. **campaigns-refresh.js** consulta Porter para datos de campañas
4. Los datos se guardan en:
   - `data.json` — inversión diaria
   - `ga4-data.json` — vistas y reservas
   - `campaigns-data.json` — datos de campañas
5. El dashboard carga estos archivos y muestra datos **frescos automáticamente**

---

## 📋 Requisitos

- Node.js instalado
- Claude CLI disponible (`claude` en terminal)
- MCP de Porter configurado en Claude Code
- Acceso a cuenta Porter de Kampaoh

---

## 🐛 Troubleshooting

**El script no actualiza:**
```bash
# Verifica que Claude CLI funciona
claude -v

# Prueba un refresh manual
node refresh.js

# Mira los logs
tail -f refresh.log
```

**Error de permisos:**
```bash
# Dale permisos de ejecución
chmod +x refresh.js ga4-refresh.js campaigns-refresh.js auto-refresh.js
```

**MCP no disponible:**
- Abre Claude Code en este directorio
- Verifica que el MCP de Porter está conectado
- Luego ejecuta los scripts

---

## 📊 Dashboard

- **Inversión:** http://localhost:8766/
- **GA4:** http://localhost:8766/ga4.html
- **Google Ads:** http://localhost:8766/google.html
- **Campañas:** http://localhost:8766/campanas.html

Los datos se actualizan automáticamente cada 5-10 minutos. ✨
