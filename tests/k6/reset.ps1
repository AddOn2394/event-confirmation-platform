# reset.ps1 — Equivalente PowerShell de reset.sh para usuarios Windows sin Git Bash.
# Requiere: psql.exe en el PATH (instalado con PostgreSQL o via Chocolatey: choco install postgresql).
#
# Uso:
#   $env:DATABASE_URL = "postgres://user:pass@host:5432/dbname"
#   $env:EVENT_ID     = "<uuid>"
#   .\tests\k6\reset.ps1

param()

if (-not $env:DATABASE_URL) { throw "DATABASE_URL es requerida" }
if (-not $env:EVENT_ID)     { throw "EVENT_ID es requerida" }

$sql = @"
BEGIN;
TRUNCATE notification_outbox RESTART IDENTITY CASCADE;
TRUNCATE confirmation_item   RESTART IDENTITY CASCADE;
TRUNCATE confirmation        RESTART IDENTITY CASCADE;
UPDATE event SET confirmed_count = 0 WHERE id = '$($env:EVENT_ID)';
COMMIT;
"@

Write-Host "Reseteando confirmaciones para EVENT_ID=$($env:EVENT_ID)..."
$sql | psql $env:DATABASE_URL
Write-Host "Listo. confirmed_count resetado a 0."
