# DECISIONS.md

---

## Resumen ejecutivo

| # | Decisión | Veredicto |
|---|---|---|
| 1 | Postgres + driver `pg` directo, sin ORM | Aceptado por presupuesto y simplicidad |
| 2 | Reglas de descuento en código, no en BD | Aceptado por composición y testabilidad |
| 3 | Magic link JWT reutilizable + idempotencia en BD | Aceptado por alineación con UX y robustez |
| 4 | **Contador atómico CAS para cupo concurrente** | Aceptado tras evaluar 4 alternativas |
| 5 | **Outbox pattern para notificación a ventas** | Aceptado por migrabilidad a prod |

---

## Decisión #1 — Persistencia: Postgres + `pg` directo, sin ORM

### Problema

Necesito persistir 6 tablas relacionales con constraints fuertes (UNIQUE, CHECK, foreign keys) y una sentencia SQL precisa para garantizar la atomicidad del cupo.

### Opciones consideradas

**A. Prisma ORM**
- Pro: migraciones declarativas, tipos generados, ecosistema.
- Contra: peleas con tipos generados cuando el query es no-trivial (raw SQL para `UPDATE ... RETURNING` rompe la abstracción).

**B. Knex / Kysely (query builder)**
- Pro: SQL transparente, tipos opcionales.
- Contra: agrega abstracción para un proyecto con pocos queries y requiere mantener tipos sincronizados con schema.

**C. `pg` driver directo + funciones helper propias**
- Pro: SQL puro, control total, atomicidad explícita.
- Contra: tipos manuales y migraciones requieren runner propio.

### Elegido: C

Para el alcance un ORM es suficientemente sobrado. se requiere SQL preciso que es más limpio sin abstracción de por medio. Tipos manuales son aceptables a esta escala; pero en un proyecto de mayor envergadura quizas optaría por la opción A o C.

### Trade-offs aceptados

- Migraciones son archivos `.sql` numerados aplicados por un runner propio. Sin rollback automático esta decisón se tomó debido al tiempo limite de entrega del proyecto.

---

## Decisión #2 — Reglas de descuento en código, no en una base de datos relacional

### Problema

Las reglas de descuento son compuestas: dependen del tipo de item (servicio/producto), de la cantidad seleccionada, y del subtotal de la selección y dado que las reglas pueden cambiar con el tiempo es mejor tenrlo en un documento editable.

### Opciones consideradas

**A. Tabla `discount_rule(condition_json, percentage)` evaluada en tiempo de consulta**
- Pro: Cambios sin re-deploy.
- Contra: Representar la condición "≥ 2 servicios con suma > 1500 → 5%" en JSON es frágil la lógica fragmentada entre BD y código hacen necesario parsear los I/O, y además se hace imposible hacer una ronda de testing puro.

**B. Función pura en TypeScript con tests exhaustivos**
- Pro: Hace posible cubrible al 100% con tests unitarios, lo convierte versionable con git cualquier cambio queda registrado y con posibilidad de ser auditado
- Contra: Cambios requieren deploy.

### Elegido: B

Las reglas del enunciado son 4 con interacciones no triviales (umbral monetario, acumulación servicios + productos). La función `computeDiscount(items)` vive en `packages/shared/domain/discounts.ts` y se importa desde el backend y el frontend.
Tests cubren los 15 casos críticos, incluyendo los bordes (subtotal exactamente Q1500, transición 4→5 productos).

### Trade-offs aceptados

- Cambiar una regla requiere PR + deploy. Aceptable para reglas que cambian trimestralmente, no para reglas que cambian por cliente.
- En un escenario donde el negocio quisiera A/B testing de reglas o configuración por evento, migraría a un híbrido: motor en código + parámetros en BD (umbrales, porcentajes), manteniendo la lógica de composición en código.

---

## Decisión #3 — Sesión: magic link JWT reutilizable + idempotencia en BD

### Problema

El enunciado pide "mecanismo de manejo de sesión" para clientes que llegan vía correo masivo. La sesión debe permitir confirmar una vez, ser resistente a re-clicks, y no requerir registro/login del cliente.

### Opciones consideradas

**A. Magic link con token single-use, blacklist server-side**
- Pro: cada link funciona una vez.
- Contra: necesita tabla `used_tokens`, query extra por request, además si el cliente re-clickea (envío duplicado de email, accidente), ve "token usado".

**B. JWT firmado, reutilizable, idempotencia garantizada por constraint en BD**
- Pro: stateless en verificación.
- Pro: re-clicks llevan al mismo cliente al estado correcto (form, success, already-confirmed) según su estado en BD, el uso de `UNIQUE(event_id, email)` impide duplicados sin importar cuántas veces se envíe el POST.
- Contra: si el JWT_SECRET se filtra, todos los tokens vivos son comprometidos, pero esto se mitiga al colocar un tiempo de expiración de 7 días.

### Elegido: B

JWT HS256 con payload `{client_id, email, event_id, iat, exp}` con expiración de 7 días. Token
reutilizable. La idempotencia (no duplicar confirmaciones) se garantiza con `UNIQUE(event_id, email)` y manejo de conflicto en el endpoint: el segundo POST devuelve 200 con la confirmación existente, no 409. La UX es: "click → ya
confirmaste" en lugar de "click → error de token usado".

### Trade-offs aceptados

- Si un cliente forwardea su email, otra persona puede confirmar en su nombre.
  Riesgo aceptado para este alcance; en producto real, agregaría verificación adicional (código OTP secundario para casos sensibles).
- `JWT_SECRET` rotation no implementada. En prod, agregaría `kid` (key id) en el header y soporte para múltiples claves activas durante el período de rotación.

---

## Decisión #4 — Cupo concurrente: contador atómico con CAS

### Problema (Situación 1 del enunciado)

El formulario se distribuye por correo masivo. Muchos clientes confirman en simultáneo en los primeros minutos. El cupo del evento es fijo (`EVENT_CAPACITY=50`). Bajo concurrencia, **no debe excederse el cupo, ni
rechazarse confirmaciones cuando aún hay lugar.**

### Opciones consideradas

**A. `SELECT ... FOR UPDATE` sobre `event` + INSERT en `confirmation`**
- Pro: simple y obvio, garantía fuerte (row lock).
- Contra: serializa todas las confirmaciones del evento. Bajo escenario 10x (500
  requests concurrentes), throughput degradado, además si la transacción tiene el lock y falla, bloquea el resto.

**B. Contador atómico con CAS (compare-and-swap)**
```sql
UPDATE event
   SET confirmed_count = confirmed_count + 1
 WHERE id = $1 AND confirmed_count < capacity
RETURNING confirmed_count, capacity;
```
- Pro: una sola sentencia atómica, sin lock explícito (Postgres maneja row-level).
- Pro: throughput superior. Cada UPDATE es una operación de microsegundos.
- Pro: contador observable directamente sin agregaciones.
- Pro: CHECK constraint `confirmed_count <= capacity` actúa como red de seguridad
  ante un bug futuro.
- Contra: la lógica de "cupo agotado" se infiere por `rowCount === 0`, requiere manejo explícito en el código.

### Elegido: B

`reserveSeat(eventId, tx)` ejecuta el UPDATE atómico dentro de la misma transacción que el INSERT en `confirmation`. 
Si `RETURNING` no devuelve fila, significa cupo agotado: ROLLBACK y respuesta 410 Gone al cliente. Si devuelve
fila, el INSERT en `confirmation` ocurre con la certeza de que el cupo se reservó.
CHECK constraint `confirmed_count <= capacity` permanece como invariante a nivel de schema.

### Verificación

`tests/k6/capacity.js` ejecuta 60 requests concurrentes (60 VUs en ramp-up rápido,
cada uno con un JWT distinto para un cliente distinto). Asserts:
- Exactamente 50 respuestas 201.
- Exactamente 10 respuestas 410.
- Reconciliación final: `SELECT confirmed_count FROM event` == `SELECT COUNT(*) FROM confirmation` == 50.

Re-ejecutado 3 veces, mismo resultado consistente. Sin esto, la elección sería
una afirmación; con esto, es un hecho.

**Ambiente de producción:** Railway — https://api-production-e1ce.up.railway.app
**EVENT_ID:** cb2d09e3-e1f1-43a0-9091-06ff8e416d4d

### Análisis de escenario 10x (500 requests concurrentes contra cupo 50)

Con opción C, el comportamiento esperado es:
- Las primeras ~50 confirmaciones ganan en orden FIFO (no estrictamente, depende
  del scheduling de Postgres).
- Las restantes ~450 reciben 410 en latencia mínima (un solo UPDATE rechazado).
- Pool de conexiones de Postgres es el cuello de botella si se superan ~20-50
  conexiones simultáneas. Mitigado con PgBouncer en prod o aumentando `max_connections`.
- Throughput esperado: > 1000 req/s en hardware modesto.

Si la carga sostenida fuera mayor a lo que Postgres puede manejar, agregaría una
capa de Redis con `DECR` atómico como "rate limiter de cupo" antes de tocar la
BD. Pero para 50 confirmaciones contra 500 intentos, Postgres alcanza
holgadamente.

### Trade-offs aceptados

- El cupo es global del evento, no por slot. Si el negocio quisiera limitar
  asistentes por horario, el cambio se localiza en `reserveSeat`: el contador se
  movería de `event` a `event_slot`, manteniendo la misma sentencia CAS. Cambio
  de ~15 líneas + nueva columna.
- Sin contador de "lugares restantes" en tiempo real para mostrar al cliente
  antes del submit. Aceptable: el enunciado no lo pide y agregaría complejidad
  (websocket o polling). El cliente solo sabe el resultado cuando hace POST.

---

## Decisión #5 — Notificación a ventas: outbox pattern

### Problema (Situación 2 del enunciado)

Una vez confirmada la asistencia, el equipo de ventas debe recibir el detalle
para preparar el portafolio personalizado. El enunciado restringe el uso de
servicios externos pagos y pregunta explícitamente: ¿qué pasa si la notificación
falla? ¿qué pasa si el cliente modifica su selección?

### Opciones consideradas

**A. Log síncrono dentro de la transacción**
- Pro: garantía total. Si la confirmación se persiste, el log existe.
- Contra: acopla disponibilidad del log (filesystem) a la confirmación. Disco
  lleno = cliente pierde lugar por algo externo a su acción.
- Contra: no migra a producción real (no se hacen POST sincrónicos a SQS dentro
  de tx de BD).

**B. Outbox pattern (tabla `notification_outbox` + drain asíncrono)**
- Pro: confirmación y registro de notificación son atómicos (mismo COMMIT).
- Pro: el drain es resilient: reintentos, dead-letter, observable.
- Pro: migración a prod es swap del sink (filesystem → SQS/SNS/Kafka), el flujo
  de confirmación no cambia.
- Pro: el endpoint admin `GET /api/admin/outbox` permite inspección manual durante
  la demo.
- Contra: ~1.5h de implementación, más complejidad que un simple log.

**C. Fire-and-forget post-commit**
- Pro: 15 min de implementación.
- Contra: notificaciones perdidas silenciosamente si el log falla.
- Contra: respuesta floja a la pregunta del enunciado.

### Elegido: B

En la misma transacción del INSERT confirmation se inserta una fila en
`notification_outbox` con `status='pending'` y `payload` JSONB con los datos que
ventas necesita. Tras el COMMIT, `setImmediate(drainOutbox)` lee pendientes y
escribe a `logs/sales-notifications.log` (JSON line por evento), marca `status='sent'`.
Si falla: `attempts++`, `last_error`, retry. Si attempts > 5: `status='dead'`.

Al startup, el proceso ejecuta un drain inicial para recuperar pendientes que
hubieran quedado de una caída anterior.

Endpoint admin `POST /api/admin/outbox/drain` permite forzar el drain durante la
demo.

### Qué pasa si la notificación falla

- La confirmación está persistida (cliente ya está confirmado, su lugar está
  reservado).
- La fila en outbox queda `pending` con `last_error` poblado.
- Reintentos automáticos en cada drain (al siguiente confirmation o startup).
- Tras 5 intentos: `dead`, requiere intervención manual (visible vía endpoint
  admin).
- El equipo de ventas puede consultar `GET /api/admin/outbox?status=pending` en
  cualquier momento.

### Qué pasa si el cliente modifica su selección

**No se permite.** La confirmación es inmutable post-creación: no hay endpoint
UPDATE, no hay UI de edición. Si el cliente necesita cambiar algo, el footer
muestra el contacto a ventas (`CONTACT_EMAIL`, `CONTACT_PHONE`), que coordinan
manualmente.

Esta decisión simplifica el modelo (sin manejo de versiones, sin re-emisión de
notificaciones). Trade-off aceptado: flexibilidad sacrificada por simplicidad.
En prod real, permitiría edición hasta T-24h del evento, con re-emisión de
notificación (mismo outbox, payload con `version++`, idempotencia por
`(confirmation_id, version)` en el consumer de ventas).

### Migración a producción real

| Componente actual | Migración a prod |
|---|---|
| `notification_outbox` table | **Se mantiene idéntica** |
| INSERT outbox en tx | **Se mantiene** |
| Drain con `setImmediate` | Worker dedicado (proceso separado) con polling de outbox |
| Sink: `logs/*.log` | SQS / SNS / Kafka / RabbitMQ |
| `attempts` + `dead` | **Se mantiene**, plus DLQ del broker |
| Endpoint admin manual | Métricas en Datadog/Grafana, alertas en `dead > 0` |
| Confirmación inmutable | Edición permitida hasta T-24h con eventos versionados |

**Lo crítico:** la lógica de inserción en outbox dentro de la tx **no cambia**.
Es el patrón que hace que la migración sea barata.

### Trade-offs aceptados

- Drain en el mismo proceso del servidor web. Bajo carga sostenida, conviene
  worker dedicado. Documentado.
- `setImmediate` no garantiza orden global de envío bajo carga concurrente.
  Aceptable: el orden importa para el consumer de ventas, no para el productor.
- Sin retry exponencial sofisticado: cada drain reintenta los pendientes
  inmediatamente. Suficiente para falla transitoria; insuficiente para falla
  prolongada del sink (mitigado por `status='dead'`).

---

## Limitaciones conocidas y siguientes pasos

Honestidad técnica: lo que esta solución no escala y qué cambiaría.

### Si el cupo pasara de 50 a 5,000 con 50,000 intentos en 1 minuto

- **Cuello de botella primario:** pool de conexiones a Postgres. Solución:
  PgBouncer en transaction pooling mode + max_connections aumentado.
- **Cuello de botella secundario:** el contador en una sola fila (`event`) sufre
  contención de row lock implícito. Solución:
  - Pre-sharding del contador: dividir el cupo en N "buckets" (`event_capacity_shard(event_id, shard_id, capacity, count)`), cliente cae aleatoriamente en uno, agotamiento se chequea con `SUM` periódico cacheado.
  - O migración a Redis con `DECR` atómico como primera barrera (rate-limit de cupo), Postgres solo persiste lo aprobado.

### Si la base de clientes pasara de 50 a 100,000

- **Whitelist en BD:** sigue funcionando, índice en `email` resuelve búsqueda.
- **Envío de invitaciones:** Resend free tier (100/día) insuficiente. Migrar a
  SES / SendGrid / Mailgun con bulk send (batches de 1000).
- **Magic links:** generación de 100K JWTs es trivial; el problema es el envío.
- **Búsqueda de items:** filter cliente con 200 items va bien; con 10K, migrar a
  search server-side (Postgres tsvector full-text o índice GIN, paginación).

### Si los items pasaran de 30 a 10,000

- **Listado:** paginación server-side obligatoria.
- **Búsqueda:** Postgres `tsvector` con índice GIN para full-text.
- **Snapshot de precio:** `confirmation_item.price_at_confirmation` ya cubre
  cambios futuros de precio; no requiere cambios.

### Si la notificación a ventas fuera externa real

- **Outbox** se mantiene idéntica.
- **Worker** dedicado (Node + BullMQ + Redis, o Lambda con SQS trigger).
- **Idempotencia** en el consumer: cada mensaje incluye `outbox_id` único.
- **Dead-letter queue** del broker complementa el `status='dead'` del outbox.

### Frontend en escala

- **CDN:** servir el build de Vite desde Cloudflare/Vercel, separado del
  backend. El monorepo lo soporta sin refactor (build se sube a CDN, backend
  solo expone API).
- **CORS:** habilitar y restringir a dominio del frontend.

### Observabilidad ausente

Esta versión **no incluye**:
- Métricas (Prometheus / Datadog).
- Tracing distribuido (OpenTelemetry).
- Alertas.
- Logs estructurados centralizados.

Para producción, añadiría:
- Logs JSON estructurados a stdout (Railway/Datadog los ingieren).
- Healthcheck más detallado: `/api/health` reporta estado de DB, último drain
  exitoso, count de `dead` en outbox.
- Métrica de `confirmed_count / capacity` para dashboard de ventas.

### Tests automatizados ausentes

- **Integration tests:** descartados por presupuesto. Cubierto manualmente con
  checklist `tests/manual-qa.md` (10 escenarios documentados).
- **E2E (Cypress/Playwright):** descartados por presupuesto. Cubierto
  manualmente.
- **Tests de carga sostenida (k6 sostenido 10 min):** ejecutados solo el spike
  test de concurrencia.

Para un proyecto en producción, agregaría suite de integration tests
automatizados como mínimo, antes de E2E.

### Seguridad

- **`ADMIN_TOKEN` es shared secret estático.** Aceptable para una demo;
  insuficiente para prod. En prod: OAuth/SSO interno, roles, audit log.
- **No rate limiting** en endpoints públicos. Un atacante puede agotar el cupo
  con tokens forwarded. Mitigación parcial: el token está atado a un email
  específico, no se puede confirmar para otro cliente. Pero un atacante con un
  token válido podría spammear el endpoint hasta que el outbox drain se atrase.
  Solución para prod: rate limiting por IP + por JWT.
- **CSRF:** no aplica (no hay sesión cookie, JWT en body).
- **XSS:** React escapa por defecto, sin `dangerouslySetInnerHTML`.
- **SQL injection:** todas las queries son parametrizadas con `pg`.

