import { Router } from 'express';
import { requireAdmin } from '../lib/middleware';
import { drainOutbox } from '../services/outbox';
import { issueMagicLink } from '../services/auth';
import { pool } from '../db/pool';
import { env } from '../config/env';
import { logger } from '../lib/logger';

const router = Router();

router.use(requireAdmin);

// Forzar drain del outbox manualmente
router.post('/outbox/drain', async (_req, res) => {
  try {
    const result = await drainOutbox();
    res.json(result);
  } catch (err) {
    logger.error('admin drain error', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

// Listar filas del outbox filtradas por status
router.get('/outbox', async (req, res) => {
  const status = req.query['status'] as string | undefined;
  const validStatuses = ['pendiente', 'enviado', 'muerto'];

  const whereClause =
    status && validStatuses.includes(status) ? `WHERE status = $1` : '';
  const params = status && validStatuses.includes(status) ? [status] : [];

  try {
    const result = await pool.query(
      `SELECT id, confirmation_id, status, attempts, last_error, created_at, sent_at
         FROM notification_outbox
         ${whereClause}
         ORDER BY created_at DESC
         LIMIT 100`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    logger.error('admin outbox list error', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

// Generar magic link para un cliente de la whitelist
router.post('/generate-token', async (req, res) => {
  const { email } = req.body as { email?: string };
  if (!email) {
    res.status(400).json({ error: 'email requerido' });
    return;
  }

  try {
    const result = await pool.query<{ id: string; first_name: string; last_name: string }>(
      `SELECT id, first_name, last_name FROM client WHERE email = $1`,
      [email]
    );

    if (!result.rowCount || result.rowCount === 0) {
      res.status(404).json({ error: 'cliente no encontrado en la whitelist' });
      return;
    }

    const client = result.rows[0];
    const token = issueMagicLink(client.id, email, env.EVENT_ID);
    const magic_link = `${env.INVITATION_BASE_URL}/confirm?token=${token}`;

    res.json({ magic_link, token, client: { id: client.id, email, name: `${client.first_name} ${client.last_name}` } });
  } catch (err) {
    logger.error('admin generate-token error', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

export default router;
