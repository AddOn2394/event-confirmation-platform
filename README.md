# Event Confirmation Platform

Plataforma de confirmación de asistencia para la Feria de Promociones 2026. Permite a clientes confirmar su asistencia y seleccionar servicios/productos de interés previo al evento.

## Acceso para evaluación

**URL pública:** https://api-production-e1ce.up.railway.app

### Magic links de prueba (válidos 7 días)

| Cliente | Email | Link |
|---|---|---|
| Marco Duarte | marco.duarte@example.com | [Abrir](https://api-production-e1ce.up.railway.app/confirm?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjbGllbnRfaWQiOiIyZmY1YWVmMy0yZjMxLTQ2NjItOGQ1MC02MzdkZTQ0M2M4YzgiLCJlbWFpbCI6Im1hcmNvLmR1YXJ0ZUBleGFtcGxlLmNvbSIsImV2ZW50X2lkIjoiY2IyZDA5ZTMtZTFmMS00M2EwLTkwOTEtMDZmZjhlNDE2ZDRkIiwiaWF0IjoxNzc5NzQ0ODI0LCJleHAiOjE3ODAzNDk2MjR9.I6pox1lPuQ9wIbYXTaWJJ0YMlJtoUhvsYaJqqc9fBUo) |
| Jose Rosales | jose.rosales@example.com | [Abrir](https://api-production-e1ce.up.railway.app/confirm?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjbGllbnRfaWQiOiJhNWJjY2NlZC1iNjBlLTQ0ZTItYmU5Zi1iMmQ2Y2M3YThiYzciLCJlbWFpbCI6Impvc2Uucm9zYWxlc0BleGFtcGxlLmNvbSIsImV2ZW50X2lkIjoiY2IyZDA5ZTMtZTFmMS00M2EwLTkwOTEtMDZmZjhlNDE2ZDRkIiwiaWF0IjoxNzc5NzQ0ODI0LCJleHAiOjE3ODAzNDk2MjR9.ZjAxfkneQkBdDP_0VPUU_6URC9Ew37fmfnNm3a43ydM) |
| Cliente 01 | cliente01@example.com | [Abrir](https://api-production-e1ce.up.railway.app/confirm?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjbGllbnRfaWQiOiIxZGU5OWIzMy1lYjJkLTQxMmEtYjkzYS0yYTc0YmY4MjYwZmUiLCJlbWFpbCI6ImNsaWVudGUwMUBleGFtcGxlLmNvbSIsImV2ZW50X2lkIjoiY2IyZDA5ZTMtZTFmMS00M2EwLTkwOTEtMDZmZjhlNDE2ZDRkIiwiaWF0IjoxNzc5NzQ0ODI0LCJleHAiOjE3ODAzNDk2MjR9.Tc3KoFcv17WP8MKbWD7-aYIkWW7KXhGlWEgqE8uYIHQ) |
| Cliente 02 | cliente02@example.com | [Abrir](https://api-production-e1ce.up.railway.app/confirm?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjbGllbnRfaWQiOiIzY2Y2ZmJjNi1mMjBlLTQ2ZmItOGEzNC1iNDg3ODk2ZDhiNTQiLCJlbWFpbCI6ImNsaWVudGUwMkBleGFtcGxlLmNvbSIsImV2ZW50X2lkIjoiY2IyZDA5ZTMtZTFmMS00M2EwLTkwOTEtMDZmZjhlNDE2ZDRkIiwiaWF0IjoxNzc5NzQ0ODI1LCJleHAiOjE3ODAzNDk2MjV9.8_r0KBOzuUODBtAqHoOYaj7TYQOPpcItRQKcwQNe-pQ) |
| Cliente 03 | cliente03@example.com | [Abrir](https://api-production-e1ce.up.railway.app/confirm?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjbGllbnRfaWQiOiI3YzcxYjgxNy1jNWJkLTRlNzctYmZiOS0xY2UwYTMxY2MzYWQiLCJlbWFpbCI6ImNsaWVudGUwM0BleGFtcGxlLmNvbSIsImV2ZW50X2lkIjoiY2IyZDA5ZTMtZTFmMS00M2EwLTkwOTEtMDZmZjhlNDE2ZDRkIiwiaWF0IjoxNzc5NzQ0ODI1LCJleHAiOjE3ODAzNDk2MjV9.95K9z_uSn78jkoyCXwjP2hG66fzb3lh70Rxpf6Tx7QE) |

### Endpoints admin

El `ADMIN_TOKEN` se entrega junto con este documento.

En Windows PowerShell, `curl` es un alias de `Invoke-WebRequest`. Usa `curl.exe` o `Invoke-RestMethod`.

```bash
# Generar magic link para cualquier cliente del whitelist
curl -X POST https://api-production-e1ce.up.railway.app/api/admin/generate-token \
  -H "X-Admin-Token: <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"email":"cliente04@example.com"}'

# Ver notificaciones enviadas a ventas
curl https://api-production-e1ce.up.railway.app/api/admin/outbox?status=enviado \
  -H "X-Admin-Token: <ADMIN_TOKEN>"

# Forzar drain del outbox
curl -X POST https://api-production-e1ce.up.railway.app/api/admin/outbox/drain \
  -H "X-Admin-Token: <ADMIN_TOKEN>"
```

```powershell
# PowerShell (alternativa 1): curl.exe real
curl.exe -X POST "https://api-production-e1ce.up.railway.app/api/admin/outbox/drain" -H "X-Admin-Token: <ADMIN_TOKEN>"

# PowerShell (alternativa 2): Invoke-RestMethod
Invoke-RestMethod -Method Post -Uri "https://api-production-e1ce.up.railway.app/api/admin/outbox/drain" -Headers @{ "X-Admin-Token" = "<ADMIN_TOKEN>" }
```

## Levantar localmente

```bash
# 1. Clonar e instalar
git clone https://github.com/AddOn2394/event-confirmation-platform
cd event-confirmation-platform
npm install

# 2. Levantar Postgres local
docker compose up -d

# 3. Configurar variables
cp .env.example .env
# Editar .env con tus valores (ver .env.example)

# 4. Migrar y seed
npm run migrate -w apps/api
npm run seed -w apps/api
# Copiar el EVENT_ID del output al .env

# 5. Levantar en desarrollo
npm run dev:api   # API en localhost:3000
npm run dev:web   # Frontend en localhost:5173
```

## Arquitectura

Ver [`architecture.md`](./architecture.md) para diagramas detallados.

Monorepo npm workspaces con 3 paquetes:

- `apps/api` — Express 5 + Node 20 + TypeScript. Sirve la SPA y la API en el mismo origen sin CORS.
- `apps/web` — React 19 + Vite + Tailwind v4 + shadcn/ui.
- `packages/shared` — Schemas Zod y lógica de descuentos compartida entre backend y frontend.

El deploy en Railway es un solo contenedor Docker que sirve todo.

## Variables de entorno

Ver [`.env.example`](./.env.example) para la lista completa con descripciones.

## Tests

```bash
# Tests unitarios — 15 casos de reglas de descuento
npm test -w apps/api

# Test de concurrencia k6 (requiere k6 instalado)
npm run k6:tokens -w apps/api
k6 run -e BASE_URL=http://localhost:3000 -e EVENT_ID=<uuid> tests/k6/capacity.js
```

Ver [`tests/k6/README.md`](./tests/k6/README.md) para instrucciones completas del test de capacidad.

## Estructura del repo

├── apps/
│   ├── api/              Backend Express + migraciones + scripts
│   └── web/              Frontend React + Vite
├── packages/
│   └── shared/           Schemas Zod + lógica de descuentos
├── tests/
│   ├── k6/               Test de capacidad concurrente (60 VUs, cupo 50)
│   └── manual-qa.md      10 escenarios de QA manual
├── architecture.md       Diagramas de arquitectura y flujos
├── DECISIONS.md          Decisiones técnicas (documento obligatorio)
├── docker-compose.yml    Postgres local para desarrollo
└── .env.example          Variables de entorno requeridas

## Decisiones técnicas

Ver [`DECISIONS.md`](./DECISIONS.md) — 5 decisiones técnicas con opciones evaluadas, trade-offs aceptados, análisis de concurrencia bajo carga 10x y plan de migración a producción real.