# Guía de despliegue en Railway — Plataforma de Confirmación

> Estas operaciones son manuales y se ejecutan una sola vez al configurar
> el ambiente de producción en Railway.

## 1. Variables de entorno

Configura las siguientes en el panel de Railway (**Settings → Variables**):

| Variable             | Descripción                                              | Ejemplo / Nota                          |
|----------------------|----------------------------------------------------------|-----------------------------------------|
| `DATABASE_URL`       | Conexión Postgres managed (Railway lo inyecta auto)      | Automático si usas Postgres de Railway  |
| `NODE_ENV`           | Modo de ejecución                                        | `production`                            |
| `PORT`               | Puerto del servidor                                      | `3000`                                  |
| `JWT_SECRET`         | Secreto HMAC para tokens (mín. 32 chars)                 | Generar: `openssl rand -hex 32`         |
| `ADMIN_TOKEN`        | Token de admin endpoints (mín. 32 chars)                 | Generar: `openssl rand -hex 32`         |
| `EVENT_CAPACITY`     | Capacidad del evento                                     | `50`                                    |
| `EVENT_ID`           | UUID del evento (sale del seed — ver paso 3)             | Copiar de la salida del seed            |
| `INVITATION_BASE_URL`| URL pública del servicio en Railway                      | `https://<slug>.up.railway.app`         |
| `CONTACT_EMAIL`      | Email visible en el footer y emails                      | `ventas@example.com`                    |
| `CONTACT_PHONE`      | Teléfono visible en footer y emails                      | `+502 1234-5678`                        |
| `CONTACT_HOURS`      | Horario de atención                                      | `Lun–Vie 8:00–17:00`                    |
| `LOG_DIR`            | Directorio de logs dentro del contenedor                 | `logs`                                  |
| `RESEND_API_KEY`     | API key de Resend *(opcional, si hay plan activo)*       | `re_xxxx...`                            |
| `RESEND_FROM`        | Email remitente autorizado en Resend                     | `noreply@tudominio.com`                 |

## 2. Migrar la base de datos

```bash
railway run npm run migrate -w apps/api
```

Verifica que las 7 tablas existen:

```bash
railway run npx psql $DATABASE_URL -c "\dt"
```

## 3. Ejecutar el seed

```bash
railway run npm run seed -w apps/api
```

La salida incluye el `EVENT_ID`. **Cópialo** y configúralo como variable de entorno
en Railway **antes de continuar**.

```
Event ID: xxxxxxxx-xxxx-4xxx-xxxx-xxxxxxxxxxxx
Set EVENT_ID=xxxxxxxx-xxxx-4xxx-xxxx-xxxxxxxxxxxx in your .env
```

## 4. Smoke test — Generar magic link de prueba

```bash
# Reemplaza $RAILWAY_URL y $ADMIN_TOKEN con tus valores reales
curl -s -X POST \
  -H "X-Admin-Token: $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"jose.rosales@example.com"}' \
  $RAILWAY_URL/api/admin/generate-token | jq .
```

Abre el `magic_link` retornado en el navegador. Debes ver el formulario de confirmación.

## 5. Confirmar asistencia vía API

```bash
# Obtener slot_id e item_id del catálogo
curl -s $RAILWAY_URL/api/event/$EVENT_ID | jq '{slot: .slots[0].id, item: .items[0].id}'

# Enviar confirmación de prueba
curl -s -X POST \
  -H "Content-Type: application/json" \
  -d "{\"slot_id\":\"<slot_id>\",\"item_ids\":[\"<item_id>\"]}" \
  "$RAILWAY_URL/api/confirm?token=<token_del_paso_4>" | jq .
```

Respuesta esperada: `HTTP 201` con `{ "id": "...", ... }`.

## 6. Checklist final

- [ ] `/api/health` devuelve `{ "ok": true }`
- [ ] Abrir magic link → ver formulario con datos del cliente
- [ ] POST `/api/confirm` → `201 Created`
- [ ] Segundo POST con mismo token → `200` (idempotente)
- [ ] POST de un usuario nuevo después de llenar el cupo → `410 Gone`
- [ ] `GET /api/admin/outbox?status=enviado` muestra la notificación
