import type { PoolClient } from 'pg';
import { withTx } from '../db/pool';
import { computeDiscount } from '@ecp/shared';
import type { Item } from '@ecp/shared';
import type { ConfirmationBody } from '@ecp/shared';
import type { MagicLinkPayload } from './auth';

interface ReserveSeatOk {
  ok: true;
  count: number;
  capacity: number;
}

interface ReserveSeatFull {
  ok: false;
  reason: 'full';
}

type ReserveSeatResult = ReserveSeatOk | ReserveSeatFull;

export async function reserveSeat(
  eventId: string,
  tx: PoolClient
): Promise<ReserveSeatResult> {
  const result = await tx.query<{ confirmed_count: number; capacity: number }>(
    `UPDATE event
        SET confirmed_count = confirmed_count + 1
      WHERE id = $1
        AND confirmed_count < capacity
      RETURNING confirmed_count, capacity`,
    [eventId]
  );

  if (!result.rowCount || result.rowCount === 0) {
    return { ok: false, reason: 'full' };
  }

  return {
    ok: true,
    count: result.rows[0].confirmed_count,
    capacity: result.rows[0].capacity,
  };
}

export interface ConfirmationResult {
  id: string;
  created_at: string;
  was_existing: boolean;
  discount_services: number;
  discount_products: number;
  final_total: number;
  items: Array<{ item_id: string; name: string; type: string; price_at_confirmation: number }>;
}

export async function createConfirmation(
  body: ConfirmationBody,
  auth: MagicLinkPayload
): Promise<{ status: 201 | 200 | 410; data: ConfirmationResult }> {
  return withTx(async (tx) => {
    // Verificar si ya existe confirmación (idempotencia)
    const existing = await tx.query<{
      id: string;
      created_at: string;
      discount_services: string;
      discount_products: string;
    }>(
      `SELECT id, created_at, discount_services, discount_products
         FROM confirmation
        WHERE event_id = $1 AND email = $2`,
      [auth.event_id, auth.email]
    );

    if (existing.rowCount && existing.rowCount > 0) {
      const row = existing.rows[0];
      const confItems = await tx.query<{
        item_id: string;
        name: string;
        type: string;
        price_at_confirmation: string;
      }>(
        `SELECT ci.item_id, i.name, i.type, ci.price_at_confirmation
           FROM confirmation_item ci
           JOIN item i ON i.id = ci.item_id
          WHERE ci.confirmation_id = $1`,
        [row.id]
      );

      const discSvc = parseFloat(row.discount_services);
      const discPrd = parseFloat(row.discount_products);
      const items = confItems.rows.map((r) => ({
        item_id: r.item_id,
        name: r.name,
        type: r.type,
        price_at_confirmation: parseFloat(r.price_at_confirmation),
      }));
      const finalTotal =
        items
          .filter((i) => i.type === 'servicio')
          .reduce((s, i) => s + i.price_at_confirmation, 0) *
          (1 - discSvc) +
        items
          .filter((i) => i.type === 'producto')
          .reduce((s, i) => s + i.price_at_confirmation, 0) *
          (1 - discPrd);

      return {
        status: 200,
        data: {
          id: row.id,
          created_at: row.created_at,
          was_existing: true,
          discount_services: discSvc,
          discount_products: discPrd,
          final_total: finalTotal,
          items,
        },
      };
    }

    // Reservar cupo (CAS atómico)
    const seat = await reserveSeat(auth.event_id, tx);
    if (!seat.ok) {
      return {
        status: 410,
        data: {
          id: '',
          created_at: '',
          was_existing: false,
          discount_services: 0,
          discount_products: 0,
          final_total: 0,
          items: [],
        },
      };
    }

    // Cargar items del catálogo para snapshot de precio
    const catalogResult = await tx.query<{
      id: string;
      name: string;
      type: string;
      price: string;
    }>(
      `SELECT id, name, type, price FROM item WHERE id = ANY($1::uuid[])`,
      [body.item_ids]
    );

    const catalogItems: Item[] = catalogResult.rows.map((r) => ({
      id: r.id,
      name: r.name,
      type: r.type as Item['type'],
      price: parseFloat(r.price),
    }));

    const { serviciosPct, productosPct } = computeDiscount(catalogItems);

    // Actualizar datos opcionales del cliente si se proporcionaron
    if (body.phone || body.document_type || body.document_number) {
      await tx.query(
        `UPDATE client
            SET phone = COALESCE($1, phone),
                document_type = COALESCE($2::document_type, document_type),
                document_number = COALESCE($3, document_number)
          WHERE id = $4`,
        [body.phone ?? null, body.document_type ?? null, body.document_number ?? null, auth.client_id]
      );
    }

    // INSERT confirmation
    const confResult = await tx.query<{ id: string; created_at: string }>(
      `INSERT INTO confirmation (event_id, client_id, slot_id, email, discount_services, discount_products)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, created_at`,
      [auth.event_id, auth.client_id, body.slot_id, auth.email, serviciosPct, productosPct]
    );
    const confirmation = confResult.rows[0];

    // INSERT confirmation_item (snapshot de precio en el momento)
    const insertedItems: ConfirmationResult['items'] = [];
    for (const item of catalogItems) {
      await tx.query(
        `INSERT INTO confirmation_item (confirmation_id, item_id, price_at_confirmation)
         VALUES ($1, $2, $3)`,
        [confirmation.id, item.id, item.price]
      );
      insertedItems.push({
        item_id: item.id,
        name: item.name,
        type: item.type,
        price_at_confirmation: item.price,
      });
    }

    // Insert outbox row in same transaction — atomicity guaranteed
    const clientData = await tx.query<{ first_name: string; last_name: string }>(
      `SELECT first_name, last_name FROM client WHERE id = $1`,
      [auth.client_id]
    );

    const payload = {
      confirmation_id: confirmation.id,
      email: auth.email,
      client_name: clientData.rows[0]
        ? `${clientData.rows[0].first_name} ${clientData.rows[0].last_name}`
        : auth.email,
      slot_id: body.slot_id,
      items: insertedItems,
      discount_services: serviciosPct,
      discount_products: productosPct,
    };

    await tx.query(
      `INSERT INTO notification_outbox (confirmation_id, payload)
       VALUES ($1, $2)`,
      [confirmation.id, JSON.stringify(payload)]
    );

    const finalTotal =
      catalogItems
        .filter((i) => i.type === 'servicio')
        .reduce((s, i) => s + i.price, 0) *
        (1 - serviciosPct) +
      catalogItems
        .filter((i) => i.type === 'producto')
        .reduce((s, i) => s + i.price, 0) *
        (1 - productosPct);

    return {
      status: 201,
      data: {
        id: confirmation.id,
        created_at: confirmation.created_at,
        was_existing: false,
        discount_services: serviciosPct,
        discount_products: productosPct,
        final_total: finalTotal,
        items: insertedItems,
      },
    };
  });
}
