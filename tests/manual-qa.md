# Manual QA — Feria de Promociones 2026

Prerequisitos: `docker compose up -d`, `npm run dev -w apps/api`, `npm run dev -w apps/web`, base de datos seeded (`npm run seed -w apps/api`).

---

## E-01 — Token inválido

**Pasos**
1. Navegar a `/confirm?token=esto-no-es-un-jwt`.

**Resultado esperado**
- Redirige a `/confirm/invalid`.
- Título del tab: "Enlace no válido · Feria de Promociones 2026".
- Card muestra "Enlace no válido o expirado".
- Botones "Enviar correo" y "Llamar" abren cliente de correo / teléfono del SO.

---

## E-02 — Token expirado o con firma incorrecta

**Pasos**
1. Tomar un JWT válido del seed y modificar un carácter del payload.
2. Navegar a `/confirm?token=<jwt-modificado>`.

**Resultado esperado**
- API devuelve 401.
- Redirige a `/confirm/invalid`.

---

## E-03 — Flujo feliz completo

**Pasos**
1. Generar token con `curl -X POST http://localhost:3000/api/admin/generate-token ...`.
2. Navegar a `/confirm?token=<token>`.
3. Verificar que nombre, apellido y correo aparezcan pre-cargados (solo lectura).
4. Seleccionar 2 servicios con subtotal ≤ Q1,500.
5. Seleccionar 3 productos.
6. Verificar:
   - Card "Descuento Servicios" muestra **3%**.
   - Card "Descuento Productos" muestra **3%**.
   - Tabla de resumen lista los 5 items seleccionados con sus precios.
   - Total estimado = (subtotal servicios × 0.97) + (subtotal productos × 0.97).
7. Seleccionar un horario.
8. Hacer clic en "Confirmar asistencia".

**Resultado esperado**
- Redirige a `/confirm/success?token=<token>`.
- Título: "¡Confirmación exitosa! · Feria de Promociones 2026".
- Muestra detalle: nombre, correo, horario seleccionado, tabla de items con precios snapshot, descuentos aplicados y total final.

---

## E-04 — Confirmación idempotente (re-apertura del link)

**Pasos**
1. Usar el mismo token del E-03.
2. Navegar de nuevo a `/confirm?token=<token>`.

**Resultado esperado**
- API devuelve `existing_confirmation` truthy.
- Redirige a `/confirm/already?token=<token>`.
- Título: "Ya confirmaste tu asistencia · Feria de Promociones 2026".
- Muestra el mismo detalle de confirmación (mismo horario, items y total que en E-03).
- CTA "Enviar correo" y "Llamar" visibles al final.

---

## E-05 — Descuento servicios al 5% (subtotal > Q1,500)

**Pasos**
1. Abrir un token nuevo (cliente sin confirmación).
2. Seleccionar 2 servicios cuyo subtotal supere Q1,500.

**Resultado esperado**
- Card "Descuento Servicios" muestra **5%** con etiqueta "2+ servicios y subtotal > Q1,500".
- Total estimado = subtotal × 0.95.

---

## E-06 — Descuento productos al 5% (5+ productos)

**Pasos**
1. Abrir un token nuevo.
2. Seleccionar exactamente 5 productos.

**Resultado esperado**
- Card "Descuento Productos" muestra **5%** con etiqueta "5+ productos".

---

## E-07 — Sin items seleccionados

**Pasos**
1. Abrir un token válido.
2. No seleccionar ningún item.

**Resultado esperado**
- El bloque de resumen muestra "Selecciona servicios o productos para ver el resumen."
- Botón "Confirmar asistencia" está deshabilitado.
- Al intentar enviar el form con submit por JS (DevTools): no se envía ningún request.

---

## E-08 — Cupo agotado

**Pasos**
1. Usando la herramienta k6 o directamente SQL, llenar el evento hasta `confirmed_count = capacity`.
2. Intentar confirmar con un token nuevo.

**Resultado esperado**
- API devuelve 410.
- Redirige a `/confirm/full`.
- Título: "Cupo agotado · Feria de Promociones 2026".
- Botones de contacto visibles.

---

## E-09 — Búsqueda en catálogo con item seleccionado

**Pasos**
1. Abrir un token válido.
2. Seleccionar un servicio (p.ej. "Consultoría").
3. Escribir en el input de búsqueda un término que no coincida con ese servicio (p.ej. "xyz").

**Resultado esperado**
- El servicio "Consultoría" sigue visible y marcado.
- Los demás servicios que no coincidan con "xyz" desaparecen.
- Limpiar el campo de búsqueda: todos los servicios vuelven, "Consultoría" sigue marcado.

---

## E-10 — Mobile responsive

**Pasos**
1. Abrir DevTools → viewport 390 × 844 (iPhone 14).
2. Navegar por `/confirm?token=<token>`.
3. Revisar: columnas del form, cards de descuento, tabla de resumen y botón submit.
4. Repetir en `/confirm/success`, `/confirm/already`, `/confirm/full`, `/confirm/invalid`.

**Resultado esperado**
- El grid de dos columnas colapsa a una columna.
- Las dos cards de descuento (Servicios / Productos) se apilan verticalmente.
- Todos los textos legibles, sin overflow horizontal.
- Botones del CTA se apilan verticalmente con `flex-col`.
- Botón "Confirmar asistencia" ocupa el ancho completo o es fácilmente tappable.
