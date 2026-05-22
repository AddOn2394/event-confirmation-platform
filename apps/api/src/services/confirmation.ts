import type { PoolClient } from 'pg';
import { withTx } from '../db/pool';
import { computeDiscount } from '@ecp/shared';
import type { Item } from '@ecp/shared';
import type { ConfirmationBody } from '@ecp/shared';
import type { MagicLinkPayload } from './auth';

export interface ConfirmationItem {
  item_id: string;
  name: string;
  type: 'servicio' | 'producto';
  price_at_confirmation: number;
}

export interface ConfirmationDetail {
  id: string;
  created_at: string;
  slot: { id: string; label: string; starts_at: string; ends_at: string } | null;
  items: ConfirmationItem[];
  discount_services: number;
  discount_products: number;
  final_total: number;
}

// Kept for backward-compat with confirm route that uses was_existing flag
export interface ConfirmationResult extends ConfirmationDetail {
  was_existing: boolean;
}

function computeFinalTotal(items: ConfirmationItem[], discountServices: number, discountProducts: number): number {
  const servicesTotal = items
    .filter((i) => i.type === 'servicio')
    .reduce((sum, i) => sum + i.price_at_confirmation, 0);
  const productsTotal = items
    .filter((i) => i.type === 'producto')
    .reduce((sum, i) => sum + i.price_at_confirmation, 0);
  return servicesTotal * (1 - discountServices) + productsTotal * (1 - discountProducts);
}

export async function loadConfirmationDetail(
  executor: PoolClient,
  confirmationId: string
): Promise<ConfirmationDetail> {
  const [confRow, slotRow, itemRows] = await Promise.all([
    executor.query<{
      id: string;
      created_at: string;
      discount_services: number;
      discount_products: number;
      slot_id: string;
    }>(
      `SELECT id, created_at, discount_services, discount_products, slot_id
         FROM confirmation WHERE id = $1`,
      [confirmationId]
    ),
    executor.query<{ id: string; label: string; starts_at: string; ends_at: string }>(
      `SELECT es.id, es.label, es.starts_at, es.ends_at
         FROM confirmation c
         JOIN event_slot es ON es.id = c.slot_id
        WHERE c.id = $1`,
      [confirmationId]
    ),
    executor.query<{
      item_id: string;
      name: string;
      type: 'servicio' | 'producto';
      price_at_confirmation: number;
    }>(
      `SELECT ci.item_id, i.name, i.type, ci.price_at_confirmation
         FROM confirmation_item ci
         JOIN item i ON i.id = ci.item_id
        WHERE ci.confirmation_id = $1`,
      [confirmationId]
    ),
  ]);

  const conf = confRow.rows[0];
  const discountServices = conf.discount_services;
  const discountProducts = conf.discount_products;
  const items = itemRows.rows as ConfirmationItem[];

  return {
    id: conf.id,
    created_at: conf.created_at,
    slot: slotRow.rows[0] ?? null,
    items,
    discount_services: discountServices,
    discount_products: discountProducts,
    final_total: computeFinalTotal(items, discountServices, discountProducts),
  };
}

interface ReserveSeatOk {
  ok: true;
  count: number;
  capacity: number;
}

interface ReserveSeatFull {
  ok: false;
}

type ReserveSeatResult = ReserveSeatOk | ReserveSeatFull;

export async function reserveSeat(eventId: string, tx: PoolClient): Promise<ReserveSeatResult> {
  const result = await tx.query<{ confirmed_count: number; capacity: number }>(
    `UPDATE event
        SET confirmed_count = confirmed_count + 1
      WHERE id = $1
        AND confirmed_count < capacity
      RETURNING confirmed_count, capacity`,
    [eventId]
  );

  if (!result.rowCount || result.rowCount === 0) {
    return { ok: false };
  }

  return { ok: true, count: result.rows[0].confirmed_count, capacity: result.rows[0].capacity };
}

export type CreateConfirmationResult =
  | { kind: 'created'; confirmation: ConfirmationDetail }
  | { kind: 'existed'; confirmation: ConfirmationDetail }
  | { kind: 'full' };

export async function createConfirmation(
  body: ConfirmationBody,
  auth: MagicLinkPayload
): Promise<CreateConfirmationResult> {
  return withTx(async (tx) => {
    // Check idempotency: confirmation already exists for this event + email
    const existing = await tx.query<{ id: string }>(
      `SELECT id FROM confirmation WHERE event_id = $1 AND email = $2`,
      [auth.event_id, auth.email]
    );

    if (existing.rowCount && existing.rowCount > 0) {
      const detail = await loadConfirmationDetail(tx, existing.rows[0].id);
      return { kind: 'existed', confirmation: detail };
    }

    // Atomic seat reservation (CAS pattern)
    const seat = await reserveSeat(auth.event_id, tx);
    if (!seat.ok) {
      return { kind: 'full' };
    }

    // Load catalog items for price snapshot
    const catalogResult = await tx.query<{ id: string; name: string; type: string; price: number }>(
      `SELECT id, name, type, price FROM item WHERE id = ANY($1::uuid[])`,
      [body.item_ids]
    );

    const catalogItems: Item[] = catalogResult.rows.map((r) => ({
      id: r.id,
      name: r.name,
      type: r.type as Item['type'],
      price: r.price,
    }));

    const { serviciosPct, productosPct } = computeDiscount(catalogItems);

    // Update optional client fields if provided
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

    // Insert confirmation row
    const confResult = await tx.query<{ id: string; created_at: string }>(
      `INSERT INTO confirmation (event_id, client_id, slot_id, email, discount_services, discount_products)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, created_at`,
      [auth.event_id, auth.client_id, body.slot_id, auth.email, serviciosPct, productosPct]
    );
    const confirmation = confResult.rows[0];

    // Insert confirmation_item rows (price snapshot at time of confirmation)
    const insertedItems: ConfirmationItem[] = [];
    for (const item of catalogItems) {
      await tx.query(
        `INSERT INTO confirmation_item (confirmation_id, item_id, price_at_confirmation)
         VALUES ($1, $2, $3)`,
        [confirmation.id, item.id, item.price]
      );
      insertedItems.push({
        item_id: item.id,
        name: item.name,
        type: item.type as ConfirmationItem['type'],
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
      `INSERT INTO notification_outbox (confirmation_id, payload) VALUES ($1, $2)`,
      [confirmation.id, JSON.stringify(payload)]
    );

    const detail = await loadConfirmationDetail(tx, confirmation.id);
    return { kind: 'created', confirmation: detail };
  });
}
