import { Pool } from 'pg';
import crypto from 'crypto';

// Genera un UUID v4 determinístico a partir de un string (para seeds reproducibles)
function seedUuid(input: string): string {
  const hash = crypto.createHash('sha256').update(input).digest('hex');
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    '4' + hash.slice(13, 16),
    ((parseInt(hash[16], 16) & 0x3) | 0x8).toString(16) + hash.slice(17, 20),
    hash.slice(20, 32),
  ].join('-');
}

async function seed() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL env var is required');
    process.exit(1);
  }

  const capacity = parseInt(process.env.EVENT_CAPACITY ?? '50', 10);
  const pool = new Pool({ connectionString });
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // ── Evento ──────────────────────────────────────────────────────────────
    const eventId = seedUuid('feria-de-promociones-2026');
    await client.query(
      `INSERT INTO event (id, name, capacity)
       VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING`,
      [eventId, 'Feria de Promociones 2026', capacity]
    );
    console.log(`Event ID: ${eventId}`);

    // ── Slots (4 horarios) ───────────────────────────────────────────────────
    const slots = [
      { label: 'Mañana — Jueves 18 Jun', starts: '2026-06-18T08:00:00-06', ends: '2026-06-18T12:00:00-06' },
      { label: 'Tarde — Jueves 18 Jun', starts: '2026-06-18T13:00:00-06', ends: '2026-06-18T17:00:00-06' },
      { label: 'Mañana — Viernes 19 Jun', starts: '2026-06-19T08:00:00-06', ends: '2026-06-19T12:00:00-06' },
      { label: 'Tarde — Viernes 19 Jun', starts: '2026-06-19T13:00:00-06', ends: '2026-06-19T17:00:00-06' },
    ];

    for (const slot of slots) {
      const slotId = seedUuid(`slot-${slot.label}`);
      await client.query(
        `INSERT INTO event_slot (id, event_id, label, starts_at, ends_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT DO NOTHING`,
        [slotId, eventId, slot.label, slot.starts, slot.ends]
      );
    }

    // ── Items: 15 servicios + 17 productos ───────────────────────────────────
    // Precios diseñados para ejercitar todas las reglas de descuento:
    // - 2 servicios con subtotal > Q1500 → 5%
    // - 2 servicios con subtotal <= Q1500 → 3%
    // - 5 productos → 5%
    // - 3-4 productos → 3%
    const items: Array<{ name: string; type: 'servicio' | 'producto'; price: number }> = [
      // Servicios con precio alto (2 de estos > Q1500 juntos)
      { name: 'Consultoría de Imagen Corporativa', type: 'servicio', price: 850.0 },
      { name: 'Diseño de Identidad Visual', type: 'servicio', price: 950.0 },
      { name: 'Auditoría de Marca', type: 'servicio', price: 780.0 },
      { name: 'Estrategia de Marketing Digital', type: 'servicio', price: 1200.0 },
      { name: 'Fotografía Profesional de Producto', type: 'servicio', price: 600.0 },
      // Servicios con precio bajo (2 de estos <= Q1500 subtotal → 3%)
      { name: 'Capacitación en Ventas', type: 'servicio', price: 450.0 },
      { name: 'Asesoría en Redes Sociales', type: 'servicio', price: 350.0 },
      { name: 'Diseño de Material Impreso', type: 'servicio', price: 300.0 },
      { name: 'Desarrollo de Página Web Básica', type: 'servicio', price: 500.0 },
      { name: 'Mantenimiento de Equipos de Cómputo', type: 'servicio', price: 250.0 },
      { name: 'Servicio de Limpieza Profunda', type: 'servicio', price: 200.0 },
      { name: 'Instalación de Cámaras de Seguridad', type: 'servicio', price: 700.0 },
      { name: 'Soporte Técnico Mensual', type: 'servicio', price: 400.0 },
      { name: 'Redacción de Contenido SEO', type: 'servicio', price: 320.0 },
      { name: 'Consultoría Legal Empresarial', type: 'servicio', price: 1100.0 },
      // Productos
      { name: 'Kit de Papelería Corporativa', type: 'producto', price: 125.0 },
      { name: 'Agenda Ejecutiva 2026', type: 'producto', price: 85.0 },
      { name: 'Bolígrafos Personalizados (caja 50)', type: 'producto', price: 45.0 },
      { name: 'Tote Bag Corporativa', type: 'producto', price: 60.0 },
      { name: 'Cuaderno Institucional A5', type: 'producto', price: 35.0 },
      { name: 'Lapiceros de Lujo (set 3)', type: 'producto', price: 95.0 },
      { name: 'Tarjetero de Cuero', type: 'producto', price: 110.0 },
      { name: 'USB Corporativo 32GB', type: 'producto', price: 75.0 },
      { name: 'Portafolio Ejecutivo', type: 'producto', price: 180.0 },
      { name: 'Mouse Inalámbrico Personalizado', type: 'producto', price: 150.0 },
      { name: 'Funda para Laptop con Logo', type: 'producto', price: 120.0 },
      { name: 'Termo de Acero Inoxidable', type: 'producto', price: 90.0 },
      { name: 'Set de Marcadores Premium', type: 'producto', price: 55.0 },
      { name: 'Almohadilla de Escritorio', type: 'producto', price: 40.0 },
      { name: 'Organizador de Escritorio', type: 'producto', price: 70.0 },
      { name: 'Planta de Escritorio (suculenta)', type: 'producto', price: 30.0 },
      { name: 'Marco Corporativo para Diplomas', type: 'producto', price: 85.0 },
    ];

    for (const it of items) {
      const itemId = seedUuid(`item-${it.name}`);
      await client.query(
        `INSERT INTO item (id, name, type, price)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT DO NOTHING`,
        [itemId, it.name, it.type, it.price]
      );
    }

    // ── Clientes: 50 en whitelist ─────────────────────────────────────────────
    const clients = [
      // Clientes nombrados
      { email: 'marco.duarte@example.com', first_name: 'Marco', last_name: 'Duarte' },
      { email: 'jose.rosales@example.com', first_name: 'José Alejandro', last_name: 'Rosales Lemus' },
      // 48 mocks generados
      ...Array.from({ length: 48 }, (_, i) => ({
        email: `cliente${String(i + 1).padStart(2, '0')}@example.com`,
        first_name: `Cliente`,
        last_name: `Mock ${String(i + 1).padStart(2, '0')}`,
      })),
    ];

    for (const c of clients) {
      const clientId = seedUuid(`client-${c.email}`);
      await client.query(
        `INSERT INTO client (id, email, first_name, last_name)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (email) DO NOTHING`,
        [clientId, c.email, c.first_name, c.last_name]
      );
    }

    await client.query('COMMIT');

    // Verificaciones
    const counts = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM client)       AS clients,
        (SELECT COUNT(*) FROM item)         AS items,
        (SELECT COUNT(*) FROM event)        AS events,
        (SELECT COUNT(*) FROM event_slot)   AS slots
    `);
    console.log('Seed complete:', counts.rows[0]);
    console.log(`Set EVENT_ID=${eventId} in your .env`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
