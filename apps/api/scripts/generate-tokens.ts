import { Pool } from 'pg';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const DATABASE_URL = process.env.DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET;
const EVENT_ID = process.env.EVENT_ID;

if (!DATABASE_URL || !JWT_SECRET || !EVENT_ID) {
  console.error('Faltan env vars requeridas: DATABASE_URL, JWT_SECRET, EVENT_ID');
  process.exit(1);
}

function issueMagicLink(clientId: string, email: string, eventId: string): string {
  return jwt.sign(
    { client_id: clientId, email, event_id: eventId },
    JWT_SECRET as string,
    { expiresIn: '7d', algorithm: 'HS256' }
  );
}

interface ClientRow {
  id: string;
  email: string;
}

async function main() {
  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    // 50 clientes del whitelist (excluye stress clients de ejecuciones previas)
    const { rows: whitelist } = await pool.query<ClientRow>(
      `SELECT id, email FROM client
        WHERE email NOT LIKE 'k6-stress-%'
        ORDER BY email
        LIMIT 50`
    );

    const tokens: Array<{ email: string; token: string }> = [];

    for (const c of whitelist) {
      tokens.push({ email: c.email, token: issueMagicLink(c.id, c.email, EVENT_ID as string) });
    }

    // 10 clientes de stress para cubrir las 10 confirmaciones que llenarán el cupo
    for (let i = 1; i <= 10; i++) {
      const email = `k6-stress-${i}@example.com`;
      const newId = crypto.randomUUID();

      await pool.query(
        `INSERT INTO client (id, email, first_name, last_name)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (email) DO NOTHING`,
        [newId, email, 'K6 Stress', String(i)]
      );

      const { rows } = await pool.query<ClientRow>(
        `SELECT id FROM client WHERE email = $1`,
        [email]
      );

      tokens.push({ email, token: issueMagicLink(rows[0].id, email, EVENT_ID as string) });
    }

    // Escribir tokens.json en tests/k6/ relativo a la raíz del monorepo
    const outputPath = path.resolve(__dirname, '../../tests/k6/tokens.json');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(tokens, null, 2));

    console.log(`Generados ${tokens.length} tokens → ${outputPath}`);
    console.log(`  Whitelist: ${whitelist.length}`);
    console.log(`  k6 stress: 10`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('generate-tokens failed:', err);
  process.exit(1);
});
