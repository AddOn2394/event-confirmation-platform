import { Router } from 'express';
import { requireMagicLink } from '../lib/middleware';
import { ConfirmationBodySchema } from '@ecp/shared';
import { createConfirmation } from '../services/confirmation';
import { drainOutbox } from '../services/outbox';
import { logger } from '../lib/logger';
import { asyncHandler, fail } from '../lib/http';

const router = Router();

router.post('/', requireMagicLink, asyncHandler(async (req, res) => {
  const parsed = ConfirmationBodySchema.safeParse(req.body);
  if (!parsed.success) {
    fail(res, 400, 'validation_error', { issues: parsed.error.issues });
    return;
  }

  const result = await createConfirmation(parsed.data, req.auth!);

  if (result.kind === 'full') {
    fail(res, 410, 'event_full');
    return;
  }

  const statusCode = result.kind === 'created' ? 201 : 200;
  res.status(statusCode).json(result.confirmation);

  // Async drain after COMMIT — does not block the response
  if (result.kind === 'created') {
    setImmediate(() => drainOutbox().catch((e) => logger.error('outbox drain error', e)));
  }
}));

export default router;
