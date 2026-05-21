# Test de capacidad k6

Verifica que el sistema respeta exactamente el cupo del evento bajo carga
concurrente. Con 60 VUs simultáneos (50 whitelist + 10 stress) sobre un
evento de capacidad 50, espera **50 × 201 Created** y **10 × 410 Gone**.

## Prerequisitos

- [k6](https://grafana.com/docs/k6/latest/set-up/install-k6/) instalado
  (`choco install k6`, `brew install k6`, o binario de GitHub).
- PostgreSQL client (`psql`) en el PATH para los scripts de reset.
- API corriendo local (`npm run dev -w apps/api`) o apuntando a Railway.
- Env vars configuradas (ver sección Variables).

## Variables de entorno requeridas

| Variable       | Descripción                            |
|----------------|----------------------------------------|
| `DATABASE_URL` | Conexión PostgreSQL del seed           |
| `JWT_SECRET`   | Mismo secreto que usa la API           |
| `EVENT_ID`     | UUID del evento (sale del `npm run seed`) |
| `BASE_URL`     | URL base de la API (default: `http://localhost:3000`) |

## Flujo completo

### 1. Generar tokens (una sola vez por seed)

```bash
# Desde la raíz del monorepo
npm run k6:tokens -w apps/api
# → escribe tests/k6/tokens.json con 60 entradas
```

### 2. Resetear estado de la BD

**Git Bash / Linux / macOS:**
```bash
export DATABASE_URL="postgres://..."
export EVENT_ID="<uuid>"
bash tests/k6/reset.sh
```

**PowerShell (Windows):**
```powershell
$env:DATABASE_URL = "postgres://..."
$env:EVENT_ID     = "<uuid>"
.\tests\k6\reset.ps1
```

### 3. Correr el test

```bash
k6 run \
  -e BASE_URL=http://localhost:3000 \
  -e EVENT_ID=<uuid> \
  tests/k6/capacity.js
```

### 4. Reconciliación post-test

Verificar en psql que los contadores son consistentes:

```sql
SELECT confirmed_count FROM event WHERE id = '<uuid>';
-- Debe ser 50

SELECT COUNT(*) FROM confirmation;
-- Debe ser 50
```

### 5. Repetir 3 veces

Para validar reproducibilidad, ejecutar pasos 2–4 tres veces seguidas.
El resultado debe ser idéntico en cada ejecución.

## Resultado esperado

```
=== Capacity Test — Resultados ===
  201 Confirmados : 50  (esperado: 50)
  410 Cupo lleno  : 10  (esperado: 10)
  Resultado       : PASS ✓
```
