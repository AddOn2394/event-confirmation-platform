import { Pool } from 'pg';
import { issueMagicLink } from '../src/services/auth';
import { sendInvitation } from '../src/services/email';
import { env } from '../src/config/env';

interface ClientRow {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
}

async function main() {
  const pool = new Pool({ connectionString: env.DATABASE_URL });

  try {
    const { rows } = await pool.query<ClientRow>(
      `SELECT id, email, first_name, last_name
         FROM client
        WHERE email NOT LIKE 'k6-stress-%'
        ORDER BY email`
    );

    console.log(`Enviando invitaciones a ${rows.length} clientes...`);
    let sent = 0;
    let failed = 0;

    for (const client of rows) {
      try {
        const token = issueMagicLink(client.id, client.email, env.EVENT_ID);
        const magicLink = `${env.INVITATION_BASE_URL}/confirm?token=${token}`;
        await sendInvitation(client, magicLink);
        sent++;
      } catch (err) {
        console.error(`Error enviando a ${client.email}:`, err);
        failed++;
      }
    }

    console.log(`Completado: ${sent} enviadas, ${failed} fallidas.`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('send-invitations failed:', err);
  process.exit(1);
});
