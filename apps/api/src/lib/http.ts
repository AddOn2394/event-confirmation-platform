import type { Request, Response, NextFunction } from 'express';
import { logger } from './logger';

export function fail(res: Response, status: number, code: string, extras?: Record<string, unknown>): void {
  res.status(status).json({ error: code, ...extras });
}

// Wraps an async route handler and forwards thrown errors to next()
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

// Global error middleware — register last in Express
export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  logger.error('unhandled error', err);
  if (!res.headersSent) {
    fail(res, 500, 'internal_error');
  }
}
