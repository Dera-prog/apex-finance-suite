import { readdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { scriptDatabaseUrl } from './database-url.js';

const { Client } = pg;
const migrationsDir = resolve(dirname(fileURLToPath(import.meta.url)), '../migrations');

const client = new Client({ connectionString: scriptDatabaseUrl });
await client.connect();

await client.query(`
  create table if not exists schema_migrations (
    version text primary key,
    applied_at timestamptz not null default now()
  )
`);

const applied = new Set(
  (await client.query<{ version: string }>('select version from schema_migrations')).rows.map((row) => row.version),
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
