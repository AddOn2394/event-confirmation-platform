import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { logger } from '../lib/logger';

export interface MagicLinkPayload {
  client_id: string;
  email: string;
  event_id: string;
  iat: number;
  exp: number;
}

export function issueMagicLink(clientId: string, email: string, eventId: string): string {
  return jwt.sign(
    { client_id: clientId, email, event_id: eventId },
    env.JWT_SECRET,
    { expiresIn: '7d', algorithm: 'HS256' }
  );
}

export function verifyMagicLink(token: string): MagicLinkPayload | null {
  try {
    return jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] }) as MagicLinkPayload;
  } catch (err) {
    logger.warn('jwt_verify_failed', err instanceof Error ? err.message : String(err));
    return null;
  }
}
