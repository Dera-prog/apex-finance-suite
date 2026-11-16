import pg from 'pg';
import { DATABASE_URL, LEDGER_ENABLED } from './env.js';

const { Pool } = pg;

let pool: pg.Pool | null = null;

export function db(): pg.Pool | null {
  if (!LEDGER_ENABLED) return null;
  pool ??= new Pool({
    connectionString: DATABASE_URL,
    max: Number(process.env.PG_POOL_MAX ?? 4),
    connectionTimeoutMillis: 3000,
    idleTimeoutMillis: 10_000,
  });
  return pool;
}
