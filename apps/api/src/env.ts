/** Connection settings are read once per process: Vercel reuses a warm instance between requests. */
export const DATABASE_URL = (process.env.DATABASE_URL ?? '').trim();
export const LEDGER_OWNER = (process.env.LEDGER_OWNER ?? 'demo').trim();
export const LEDGER_ENABLED = DATABASE_URL.length > 0;
