import { Pool, PoolClient, types } from 'pg';
import { env } from '../config/env';

// Parse NUMERIC columns as JS numbers instead of strings
types.setTypeParser(1700, parseFloat);

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on('error', (err) => {
  console.error('Unexpected pg pool error:', err);
});

/**
 * Ejecuta fn dentro de una transacción. Hace COMMIT si fn resuelve, ROLLBACK si lanza.
 * Propaga el error para que el caller lo maneje.
 */
export async function withTx<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
