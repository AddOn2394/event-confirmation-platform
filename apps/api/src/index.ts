import express from 'express';
import path from 'path';
import { env } from './config/env';
import { logger } from './lib/logger';
import { drainOutbox } from './services/outbox';
import confirmRouter from './routes/confirm';
import eventRouter from './routes/event';
import adminRouter from './routes/admin';

const app = express();

app.use(express.json());

// Estáticos del frontend (build de Vite copiado al Dockerfile)
app.use(express.static(path.join(__dirname, '../public')));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, ts: Date.now(), env: env.NODE_ENV });
});

// Exponer config pública de contacto (sin secretos)
app.get('/api/config', (_req, res) => {
  res.json({
    contact_email: env.CONTACT_EMAIL,
    contact_phone: env.CONTACT_PHONE,
    contact_hours: env.CONTACT_HOURS,
    event_id: env.EVENT_ID,
  });
});

app.use('/api/confirm', confirmRouter);
app.use('/api/event', eventRouter);
app.use('/api/admin', adminRouter);

// Fallback SPA — rutas no-API entregan index.html
app.get('{*path}', (req, res) => {
  if (req.path.startsWith('/api')) {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// ── Arranque ───────────────────────────────────────────────────────────────
app.listen(env.PORT, () => {
  logger.info(`Server running on port ${env.PORT}`);

  // Recuperar notificaciones pendientes de una posible caída anterior
  drainOutbox().catch((e) => logger.error('startup outbox drain failed', e));
});
