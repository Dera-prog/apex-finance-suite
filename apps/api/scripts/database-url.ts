/** Local development default; production must set DATABASE_URL. */
export const localDatabaseUrl = `postgres://postgres:postgres@127.0.0.1:${process.env.PGPORT ?? 5433}/${process.env.PGDATABASE ?? 'apex'}`;

export const scriptDatabaseUrl = (process.env.DATABASE_URL ?? '').trim() || localDatabaseUrl;
