import { Router } from 'express';
import { requireMagicLink } from '../lib/middleware';
import { ConfirmationBodySchema } from '@ecp/shared';
import { createConfirmation } from '../services/confirmation';
import { drainOutbox } from '../services/outbox';
import { logger } from '../lib/logger';

const router = Router();

router.post('/', requireMagicLink, async (req, res) => {
  const parsed = ConfirmationBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'validation_error', issues: parsed.error.issues });
    return;
  }

  try {
    const { status, data } = await createConfirmation(parsed.data, req.auth!);

    if (status === 410) {
      res.status(410).json({ error: 'event_full' });
      return;
    }

    res.status(status).json(data);

    // Drain asíncrono tras el COMMIT — no bloquea la respuesta
    if (status === 201) {
      setImmediate(() => drainOutbox().catch((e) => logger.error('outbox drain error', e)));
    }
  } catch (err) {
    logger.error('POST /api/confirm error', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

export default router;
