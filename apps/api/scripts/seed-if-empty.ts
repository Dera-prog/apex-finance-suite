import pg from 'pg';
import { scriptDatabaseUrl } from './database-url.js';

const client = new pg.Client({ connectionString: scriptDatabaseUrl });
await client.connect();
const { rows } = await client.query<{ n: number }>('select count(*)::int as n from users');
await client.end();

if (rows[0].n > 0) {
  console.log(`ledger already seeded (${rows[0].n} users), leaving it alone`);
} else {
  await import('./seed.js');
}
