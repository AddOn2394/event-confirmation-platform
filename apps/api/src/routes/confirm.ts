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
    const result = await createConfirmation(parsed.data, req.auth!);

    if (result.kind === 'full') {
      res.status(410).json({ error: 'event_full' });
      return;
    }

    const statusCode = result.kind === 'created' ? 201 : 200;
    res.status(statusCode).json(result.confirmation);

    // Async drain after COMMIT — does not block the response
    if (result.kind === 'created') {
      setImmediate(() => drainOutbox().catch((e) => logger.error('outbox drain error', e)));
    }
  } catch (err) {
    logger.error('POST /api/confirm error', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

export default router;
