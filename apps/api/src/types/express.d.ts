import type { MagicLinkPayload } from '../services/auth';

declare global {
  namespace Express {
    interface Request {
      auth?: MagicLinkPayload;
    }
  }
}
