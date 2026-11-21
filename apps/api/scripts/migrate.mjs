import { readdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const migrationsDir = resolve(dirname(fileURLToPath(import.meta.url)), '../migrations');
const vercelEnv = process.env.VERCEL_ENV;

if (vercelEnv !== undefined && vercelEnv !== 'preview') {
  console.log(`VERCEL_ENV=${vercelEnv}: only preview builds migrate automatically, skipping`);
  process.exit(0);
}

const databaseUrl = (process.env.DATABASE_URL ?? '').trim();
if (vercelEnv === 'preview' && !databaseUrl) {
  console.error('VERCEL_ENV=preview but DATABASE_URL is not set');
  process.exit(1);
}

/** Mirrors scripts/database-url.ts; this file runs without tsx during Vercel builds. */
const connectionString =
  databaseUrl || `postgres://postgres:postgres@127.0.0.1:${process.env.PGPORT ?? 5433}/${process.env.PGDATABASE ?? 'apex'}`;

const client = new pg.Client({ connectionString });
await client.connect();

const { rows: lockRows } = await client.query(
  "select pg_try_advisory_lock(hashtext('apex_migrations')) as locked",
);
if (!lockRows[0].locked) {
  console.log('another migration is already running, skipping');
  await client.end();
  process.exit(0);
}

await client.query(`
  create table if not exists schema_migrations (
    version text primary key,
    applied_at timestamptz not null default now()
  )
`);

const applied = new Set(
  (await client.query('select version from schema_migrations')).rows.map((row) => row.version),
);

const files = (await readdir(migrationsDir)).filter((file) => file.endsWith('.sql')).sort();

for (const file of files) {
  if (applied.has(file)) {
    console.log(`skip ${file}`);
    continue;
  }
  const sql = await readFile(resolve(migrationsDir, file), 'utf8');
  await client.query('begin');
  try {
    await client.query(sql);
    await client.query('insert into schema_migrations (version) values ($1)', [file]);
    await client.query('commit');
    console.log(`applied ${file}`);
  } catch (error) {
    await client.query('rollback');
    throw error;
  }
}

await client.end();
