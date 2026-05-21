import fs from 'fs';
import path from 'path';
import { env } from '../config/env';
import { logger } from '../lib/logger';

export interface ClientInfo {
  email: string;
  first_name: string;
  last_name: string;
}

function buildHtml(client: ClientInfo, magicLink: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Invitación — Feria de Promociones 2026</title>
</head>
<body style="font-family:system-ui,sans-serif;background:#f9fafb;margin:0;padding:24px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,.12)">
    <h1 style="margin:0 0 8px;color:#111827;font-size:22px">Feria de Promociones 2026</h1>
    <p style="color:#6b7280;margin:0 0 24px;font-size:14px">Plataforma de Confirmación de Asistencia</p>

    <p style="color:#374151">Hola, <strong>${client.first_name} ${client.last_name}</strong>.</p>
    <p style="color:#374151">
      Tienes una invitación para la <strong>Feria de Promociones 2026</strong>.
      Confirma tu asistencia y selecciona los servicios y productos de tu interés.
    </p>

    <div style="margin:32px 0;text-align:center">
      <a href="${magicLink}"
         style="background:#2563eb;color:#fff;text-decoration:none;padding:14px 28px;
                border-radius:8px;font-weight:600;display:inline-block;font-size:15px">
        Confirmar mi asistencia
      </a>
    </div>

    <p style="color:#9ca3af;font-size:13px;margin:0">
      Este enlace es personal e intransferible y expira en 7 días.
    </p>

    <hr style="border:none;border-top:1px solid #f3f4f6;margin:24px 0">
    <p style="color:#9ca3af;font-size:12px;margin:0">
      ¿Tienes preguntas? Escríbenos a
      <a href="mailto:${env.CONTACT_EMAIL}" style="color:#6b7280">${env.CONTACT_EMAIL}</a>
      o llama al ${env.CONTACT_PHONE} (${env.CONTACT_HOURS}).
    </p>
  </div>
</body>
</html>`;
}

function appendToLog(email: string, magicLink: string): void {
  const logDir = path.resolve(env.LOG_DIR);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  const line =
    JSON.stringify({ email, magic_link: magicLink, ts: new Date().toISOString() }) + '\n';
  fs.appendFileSync(path.join(logDir, 'invitations.log'), line, 'utf8');
}

export async function sendInvitation(client: ClientInfo, magicLink: string): Promise<void> {
  if (env.RESEND_API_KEY && env.RESEND_FROM) {
    try {
      const { Resend } = await import('resend');
      const resend = new Resend(env.RESEND_API_KEY);
      await resend.emails.send({
        from: env.RESEND_FROM,
        to: client.email,
        subject: 'Tu invitación — Feria de Promociones 2026',
        html: buildHtml(client, magicLink),
      });
      logger.info('invitation sent via Resend', { email: client.email });
      return;
    } catch (err) {
      logger.error('Resend failed, falling back to log', { email: client.email, err });
    }
  }

  appendToLog(client.email, magicLink);
  logger.info('invitation logged to file', { email: client.email });
}
