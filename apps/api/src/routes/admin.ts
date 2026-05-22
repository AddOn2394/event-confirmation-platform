import { Router } from 'express';
import { requireAdmin } from '../lib/middleware';
import { drainOutbox } from '../services/outbox';
import { issueMagicLink } from '../services/auth';
import { pool } from '../db/pool';
import { env } from '../config/env';
import { asyncHandler, fail } from '../lib/http';

const router = Router();

router.use(requireAdmin);

router.post('/outbox/drain', asyncHandler(async (_req, res) => {
  const result = await drainOutbox();
  res.json(result);
}));

router.get('/outbox', asyncHandler(async (req, res) => {
  const status = req.query['status'] as string | undefined;
  const validStatuses = ['pendiente', 'enviado', 'muerto'];

  const whereClause =
    status && validStatuses.includes(status) ? `WHERE status = $1` : '';
  const params = status && validStatuses.includes(status) ? [status] : [];

  const result = await pool.query(
    `SELECT id, confirmation_id, status, attempts, last_error, created_at, sent_at
       FROM notification_outbox
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT 100`,
    params
  );
  res.json(result.rows);
}));

router.post('/generate-token', asyncHandler(async (req, res) => {
  const { email } = req.body as { email?: string };
  if (!email) {
    fail(res, 400, 'email_required');
    return;
  }

  const result = await pool.query<{ id: string; first_name: string; last_name: string }>(
    `SELECT id, first_name, last_name FROM client WHERE email = $1`,
    [email]
  );

  if (!result.rowCount || result.rowCount === 0) {
    fail(res, 404, 'client_not_found');
    return;
  }

  const client = result.rows[0];
  const token = issueMagicLink(client.id, email, env.EVENT_ID);
  const magic_link = `${env.INVITATION_BASE_URL}/confirm?token=${token}`;

  res.json({ magic_link, token, client: { id: client.id, email, name: `${client.first_name} ${client.last_name}` } });
}));

export default router;
