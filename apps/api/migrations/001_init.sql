-- 001_init.sql — Schema completo de la Plataforma de Confirmación
-- Ejecutado por el migration runner (src/db/migrate.ts), idempotente via tabla migrations.

-- ── Extensiones ──────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Tipos enumerados ─────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE item_type AS ENUM ('servicio', 'producto');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE document_type AS ENUM ('DPI', 'Pasaporte', 'NIT', 'Otro');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE outbox_status AS ENUM ('pendiente', 'enviado', 'muerto');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Tabla: event ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS event (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  capacity        INTEGER NOT NULL CHECK (capacity > 0),
  confirmed_count INTEGER NOT NULL DEFAULT 0
                    CHECK (confirmed_count >= 0)
                    CHECK (confirmed_count <= capacity),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Tabla: event_slot ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS event_slot (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   UUID NOT NULL REFERENCES event(id) ON DELETE CASCADE,
  label      TEXT NOT NULL,
  starts_at  TIMESTAMPTZ NOT NULL,
  ends_at    TIMESTAMPTZ NOT NULL,
  CHECK (ends_at > starts_at)
);

-- ── Tabla: client ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS client (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           TEXT NOT NULL UNIQUE,
  first_name      TEXT NOT NULL,
  last_name       TEXT NOT NULL,
  phone           TEXT,
  document_type   document_type,
  document_number TEXT
);

-- ── Tabla: item ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS item (
  id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name  TEXT NOT NULL,
  type  item_type NOT NULL,
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0)
);

-- ── Tabla: confirmation ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS confirmation (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id           UUID NOT NULL REFERENCES event(id),
  client_id          UUID NOT NULL REFERENCES client(id),
  slot_id            UUID NOT NULL REFERENCES event_slot(id),
  email              TEXT NOT NULL,
  discount_services  NUMERIC(5,4) NOT NULL DEFAULT 0 CHECK (discount_services >= 0 AND discount_services <= 1),
  discount_products  NUMERIC(5,4) NOT NULL DEFAULT 0 CHECK (discount_products >= 0 AND discount_products <= 1),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, email)
);

-- ── Tabla: confirmation_item ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS confirmation_item (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  confirmation_id      UUID NOT NULL REFERENCES confirmation(id) ON DELETE CASCADE,
  item_id              UUID NOT NULL REFERENCES item(id),
  price_at_confirmation NUMERIC(10,2) NOT NULL CHECK (price_at_confirmation >= 0)
);

-- ── Tabla: notification_outbox ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notification_outbox (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  confirmation_id UUID NOT NULL REFERENCES confirmation(id),
  payload         JSONB NOT NULL,
  status          outbox_status NOT NULL DEFAULT 'pendiente',
  attempts        INTEGER NOT NULL DEFAULT 0,
  last_error      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at         TIMESTAMPTZ
);

-- ── Índices ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_confirmation_event_email  ON confirmation(event_id, email);
CREATE INDEX IF NOT EXISTS idx_outbox_status             ON notification_outbox(status);
CREATE INDEX IF NOT EXISTS idx_item_type                 ON item(type);
CREATE INDEX IF NOT EXISTS idx_client_email              ON client(email);
