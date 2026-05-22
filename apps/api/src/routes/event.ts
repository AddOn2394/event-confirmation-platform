import { Router } from 'express';
import { pool } from '../db/pool';
import { requireMagicLink } from '../lib/middleware';
import { loadConfirmationDetail } from '../services/confirmation';
import { logger } from '../lib/logger';

const router = Router();

// Public: event catalog (items + slots) for rendering the form
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const eventResult = await pool.query<{
      id: string; name: string; capacity: number; confirmed_count: number;
    }>(
      `SELECT id, name, capacity, confirmed_count FROM event WHERE id = $1`,
      [id]
    );

    if (!eventResult.rowCount || eventResult.rowCount === 0) {
      res.status(404).json({ error: 'event_not_found' });
      return;
    }

    const [slotsResult, itemsResult] = await Promise.all([
      pool.query(`SELECT id, label, starts_at, ends_at FROM event_slot WHERE event_id = $1 ORDER BY starts_at`, [id]),
      pool.query(`SELECT id, name, type, price FROM item ORDER BY type, name`),
    ]);

    res.json({ event: eventResult.rows[0], slots: slotsResult.rows, items: itemsResult.rows });
  } catch (err) {
    logger.error('GET /api/event/:id error', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

// Protected: pre-loaded client data for the confirmation form
router.get('/:token/confirmation', requireMagicLink, async (req, res) => {
  const auth = req.auth!;

  try {
    const clientResult = await pool.query(
      `SELECT id, email, first_name, last_name, phone, document_type, document_number
         FROM client WHERE id = $1`,
      [auth.client_id]
    );

    if (!clientResult.rowCount || clientResult.rowCount === 0) {
      res.status(401).json({ error: 'invalid_token' });
      return;
    }

    const existingResult = await pool.query<{ id: string }>(
      `SELECT id FROM confirmation WHERE event_id = $1 AND email = $2`,
      [auth.event_id, auth.email]
    );

    const [eventResult, slotsResult, itemsResult] = await Promise.all([
      pool.query(`SELECT id, name, capacity, confirmed_count FROM event WHERE id = $1`, [auth.event_id]),
      pool.query(`SELECT id, label, starts_at, ends_at FROM event_slot WHERE event_id = $1 ORDER BY starts_at`, [auth.event_id]),
      pool.query(`SELECT id, name, type, price FROM item ORDER BY type, name`),
    ]);

    let existingConfirmation = null;
    if (existingResult.rowCount && existingResult.rowCount > 0) {
      const client = await pool.connect();
      try {
        existingConfirmation = await loadConfirmationDetail(client, existingResult.rows[0].id);
      } finally {
        client.release();
      }
    }

    res.json({
      client: clientResult.rows[0],
      event: eventResult.rows[0] ?? null,
      slots: slotsResult.rows,
      items: itemsResult.rows,
      existing_confirmation: existingConfirmation,
    });
  } catch (err) {
    logger.error('GET /api/event/:token/confirmation error', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

export default router;
