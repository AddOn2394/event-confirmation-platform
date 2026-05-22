# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development

```bash
# Start local Postgres (required before running the API)
docker compose up -d

# Run API in dev mode (hot-reload via tsx watch)
npm run dev -w apps/api

# Run web frontend in dev mode (Vite, localhost:5173)
npm run dev -w apps/web
```

### Database

```bash
# Apply migrations
npm run migrate -w apps/api

# Seed the database (1 event, 50 clients, ~30 items, 4 slots)
npm run seed -w apps/api
```

### Build

```bash
# Build everything (web then API)
npm run build

# Build individual apps
npm run build -w apps/web
npm run build -w apps/api
```

### Tests

```bash
# Unit tests (Vitest — runs src/**/*.test.ts in apps/api)
npm test -w apps/api

# Capacity/concurrency test (k6 — requires k6 installed)
# 1. Generate JWT tokens for 60 clients:
npm run k6:tokens -w apps/api
# 2. Reset DB state (PowerShell):
$env:DATABASE_URL="postgres://..."; $env:EVENT_ID="<uuid>"; .\tests\k6\reset.ps1
# 3. Run the test:
k6 run -e BASE_URL=http://localhost:3000 -e EVENT_ID=<uuid> tests/k6/capacity.js
```

### Admin / Scripts

```bash
# Send invitation emails (or write to logs/invitations.log as fallback)
npm run invitations:send -w apps/api

# Generate a magic link for a specific email (via admin endpoint)
curl -X POST http://localhost:3000/api/admin/generate-token \
  -H "X-Admin-Token: <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com"}'

# Force outbox drain (admin endpoint)
curl -X POST http://localhost:3000/api/admin/outbox/drain \
  -H "X-Admin-Token: <ADMIN_TOKEN>"
```

### Type Checking

```bash
npm run typecheck -w apps/api
tsc --noEmit -p apps/web/tsconfig.json
```

## Architecture

This is a Node.js monorepo (`npm workspaces`) with three packages:

| Package | Role |
|---|---|
| `apps/api` | Express 5 backend + static file server |
| `apps/web` | React 19 + Vite SPA (confirmation flow UI) |
| `packages/shared` | Zod schemas and pure discount logic shared by both |

### Single-origin deployment

The Express API serves the Vite-built SPA as static files. There is **no separate frontend server and no CORS**. In production (Railway), one container handles everything. Non-`/api` routes fall back to `public/index.html` for SPA routing.

### Confirmation flow

1. User opens a **magic link** (`/confirm?token=JWT`) — JWT contains `{client_id, email, event_id}`, HS256-signed, 7-day expiry.
2. Frontend calls `GET /api/event/:token/confirmation` to pre-load client + event data.
3. User selects items and a time slot; discount is computed **client-side in real time** via `computeDiscount` from `@ecp/shared`.
4. On submit, `POST /api/confirm` runs a transaction that:
   - Atomically increments `event.confirmed_count` with a CAS UPDATE (see below)
   - Inserts a `confirmation` row with a `UNIQUE(event_id, email)` constraint for idempotency
   - Inserts `confirmation_item` rows with a **price snapshot** (price immutable after confirmation)
   - Inserts a `notification_outbox` row in `status='pendiente'`
5. After COMMIT, `setImmediate(drainOutbox)` writes a JSON line to `logs/sales-notifications.log`.

### Concurrency / seat reservation (CAS pattern)

The critical path for preventing overbooking is a single atomic SQL statement:

```sql
UPDATE event
   SET confirmed_count = confirmed_count + 1
 WHERE id = $1 AND confirmed_count < capacity
RETURNING confirmed_count, capacity;
```

If `RETURNING` returns no rows, the event is full → 410. This is the **only** place `confirmed_count` is incremented. `reserveSeat()` in `apps/api/src/services/confirmation.ts` wraps this and runs inside the same transaction as the `confirmation` INSERT, so seat + confirmation are atomic.

### Outbox pattern (notifications)

`notification_outbox` rows are inserted in the same transaction as confirmations. The drain (`apps/api/src/services/outbox.ts`) uses `FOR UPDATE SKIP LOCKED` to be concurrency-safe. Statuses: `pendiente` → `enviado` (or `muerto` after 5 failed attempts). The sink is currently a log file; swapping to SQS/email only requires changing `writeNotification()`.

### Discount rules (`@ecp/shared` — `computeDiscount`)

Item types are `'servicio'` and `'producto'` (Spanish, lowercase). Both services and products are discounted independently:

- **Services**: ≥2 items AND subtotal > 1500 → 5%; ≥2 items (any subtotal) → 3%
- **Products**: ≥5 items → 5%; ≥3 items → 3%

The exact same `computeDiscount` function runs on the frontend (live preview) and on the backend (stored as `discount_services`/`discount_products` in `confirmation`).

### Security

- **JWT_SECRET** and **ADMIN_TOKEN** must be ≥32 chars. The process exits on startup if either is missing or too short (`apps/api/src/config/env.ts`).
- Admin endpoints (`/api/admin/*`) return 404 (not 401) when the `X-Admin-Token` header doesn't match, to avoid revealing their existence.
- Magic links are reusable; idempotency is enforced by the `UNIQUE(event_id, email)` DB constraint, not by token invalidation.

## Environment Variables

Copy `.env.example` to `.env` before running locally. Key variables:

| Variable | Notes |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Min 32 chars — signs magic link JWTs |
| `ADMIN_TOKEN` | Min 32 chars — protects `/api/admin/*` |
| `EVENT_ID` | UUID of the single event (output of `npm run seed`) |
| `EVENT_CAPACITY` | Integer, default 50 |
| `RESEND_API_KEY` | Optional — if absent, invitations are logged to `logs/invitations.log` |
| `LOG_DIR` | Directory for outbox and invitation logs (default: `logs`) |

## Shared Package Resolution

`packages/shared` is consumed as `@ecp/shared` via npm workspaces. Its `main` points to `./src/index.ts` so the API uses the TypeScript source directly (no build step needed for the shared package during development). The web app does the same via Vite's workspace resolution.
