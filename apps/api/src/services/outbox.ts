import fs from 'fs';
import path from 'path';
import { pool } from '../db/pool';
import { env } from '../config/env';
import { logger } from '../lib/logger';

interface OutboxRow {
  id: string;
  confirmation_id: string;
  payload: Record<string, unknown>;
  attempts: number;
}

const MAX_ATTEMPTS = 5;

export async function drainOutbox(): Promise<{ drained: number; failed: number }> {
  const client = await pool.connect();
  let drained = 0;
  let failed = 0;

  try {
    // Tomar hasta 50 filas pendientes con SKIP LOCKED para no bloquear otras workers
    const result = await client.query<OutboxRow>(
      `SELECT id, confirmation_id, payload, attempts
      FROM notification_outbox
        WHERE status = 'pendiente'
          ORDER BY created_at
            LIMIT 50
            FOR UPDATE SKIP LOCKED`
    );

    for (const row of result.rows) {
      try {
        await writeNotification(row.payload);

        await client.query(
          `UPDATE notification_outbox
              SET status = 'enviado', sent_at = NOW()
            WHERE id = $1`,
          [row.id]
        );
        drained++;
      } catch (err) {
        const newAttempts = row.attempts + 1;
        const newStatus = newAttempts >= MAX_ATTEMPTS ? 'muerto' : 'pendiente';
        const errMsg = err instanceof Error ? err.message : String(err);

        await client.query(
          `UPDATE notification_outbox
              SET attempts = $1, last_error = $2, status = $3
            WHERE id = $4`,
          [newAttempts, errMsg, newStatus, row.id]
        );
        failed++;
        logger.error('outbox write failed', { id: row.id, attempt: newAttempts, error: errMsg });
      }
    }
  } finally {
    client.release();
  }

  return { drained, failed };
}

function writeNotification(payload: Record<string, unknown>): void {
  const logDir = path.resolve(env.LOG_DIR);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  const logPath = path.join(logDir, 'sales-notifications.log');
  const line = JSON.stringify({ ...payload, logged_at: new Date().toISOString() }) + '\n';
  fs.appendFileSync(logPath, line, 'utf8');
}
