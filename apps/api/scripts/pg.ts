import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import EmbeddedPostgres from 'embedded-postgres';

const here = dirname(fileURLToPath(import.meta.url));
const databaseDir = resolve(here, '../.pgdata');
const port = Number(process.env.PGPORT ?? 5433);
const database = process.env.PGDATABASE ?? 'apex';

const pg = new EmbeddedPostgres({
  databaseDir,
  user: 'postgres',
  password: 'postgres',
  port,
  persistent: true,
  // Windows initdb defaults to WIN1252, which cannot store the naira sign or the copy punctuation we ship.
  initdbFlags: ['--encoding=UTF8', '--locale=C'],
  onLog: (message) => {
    if (/ready to accept connections|shutting down/.test(message)) console.log(message.trim());
  },
});

const command = process.argv[2];

if (command === 'init') {
  await pg.initialise();
  await pg.start();
  await pg.createDatabase(database);
  await pg.stop();
  console.log(`initialised ${databaseDir} with database ${database} on port ${port}`);
} else if (command === 'start') {
  await pg.start();
  console.log(`postgres ready on 127.0.0.1:${port} (database ${database})`);
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => {
      void pg.stop().then(() => process.exit(0));
    });
  }
} else if (command === 'stop') {
  await pg.stop();
  console.log('postgres stopped');
} else {
  console.log('usage: node scripts/pg.ts <init|start|stop>');
  process.exit(1);
}
