#!/usr/bin/env bash
# reset.sh — Limpia confirmaciones y reinicia el contador de cupo.
# Requiere: DATABASE_URL en el entorno.
# Windows: ejecutar desde Git Bash o WSL.
#
# Uso:
#   export DATABASE_URL="postgres://..."
#   export EVENT_ID="<uuid>"
#   bash tests/k6/reset.sh

set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL es requerida}"
: "${EVENT_ID:?EVENT_ID es requerida}"

echo "Reseteando confirmaciones para EVENT_ID=${EVENT_ID}..."

psql "$DATABASE_URL" <<-SQL
  BEGIN;
  TRUNCATE notification_outbox RESTART IDENTITY CASCADE;
  TRUNCATE confirmation_item   RESTART IDENTITY CASCADE;
  TRUNCATE confirmation        RESTART IDENTITY CASCADE;
  UPDATE event SET confirmed_count = 0 WHERE id = '${EVENT_ID}';
  COMMIT;
SQL

echo "Listo. confirmed_count resetado a 0."
