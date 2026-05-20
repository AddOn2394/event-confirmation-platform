import type { Request, Response, NextFunction } from 'express';
import { verifyMagicLink } from '../services/auth';
import { env } from '../config/env';

export function requireMagicLink(req: Request, res: Response, next: NextFunction): void {
  const token =
    (req.query['token'] as string | undefined) ??
    (req.body as Record<string, unknown>)?.token as string | undefined;

  if (!token) {
    res.status(401).json({ error: 'invalid_token' });
    return;
  }

  const payload = verifyMagicLink(token);
  if (!payload) {
    res.status(401).json({ error: 'invalid_token' });
    return;
  }

  req.auth = payload;
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const provided = req.headers['x-admin-token'];
  // 404 intencionado: no revelar la existencia del endpoint
  if (!provided || provided !== env.ADMIN_TOKEN) {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  next();
}
