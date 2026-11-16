import assert from 'node:assert/strict';
import test from 'node:test';
import pg from 'pg';
import { demoMobileState } from '../../../packages/shared/demo-state.ts';
import { localDatabaseUrl } from '../scripts/database-url.ts';

process.env.DATABASE_URL ??= localDatabaseUrl;

const { readLedgerState } = await import('./ledger.ts');

const { Client } = pg;
const owner = 'demo';

const connect = async () => {
  const client = new Client({ connectionString: localDatabaseUrl });
  await client.connect();
  return client;
};

test('seeded balances come out of the postings, not a stored field', async () => {
  const client = await connect();
  try {
    const balances = await client.query<{ code: string; balance_minor: string }>(
      'select code, balance_minor from account_balances where owner_id = $1',
      [owner],
    );
    const byCode = new Map(balances.rows.map((row) => [row.code, Number(row.balance_minor)]));
    const state = demoMobileState();

    assert.equal(byCode.get('wallet:NGN'), state.walletNgnKobo);
    assert.equal(byCode.get('wallet:USD'), state.walletUsdCents);
    for (const plan of state.plans) {
      assert.equal(byCode.get(`plan:${plan.id}`), plan.balanceKobo);
    }
  } finally {
    await client.end();
  }
});

test('every entry nets to zero in its currency', async () => {
  const client = await connect();
  try {
    const { rows } = await client.query<{ entry_id: string; currency: string; total: string }>(
      `select p.entry_id, p.currency, sum(p.amount_minor) as total
         from postings p
         join entries e on e.id = p.entry_id
        where e.owner_id = $1
        group by p.entry_id, p.currency
       having sum(p.amount_minor) <> 0`,
      [owner],
    );
    assert.deepEqual(rows, []);
  } finally {
    await client.end();
  }
});

test('post_entry refuses an unbalanced entry', async () => {
  const client = await connect();
  try {
    await assert.rejects(
      () =>
        client.query(
          `select post_entry($1,$2,$3,$4,'deposit','Completed',now(),'wallet:NGN',$5::jsonb,true,null)`,
          [
            owner,
            'APX-TEST-UNBALANCED',
            'Unbalanced test',
            'test',
            JSON.stringify([
              { account: 'wallet:NGN', currency: 'NGN', amountMinor: 100 },
              { account: 'external:NGN', currency: 'NGN', amountMinor: -50 },
            ]),
          ],
        ),
      /post_entry_unbalanced/,
    );
  } finally {
    await client.end();
  }
});

test('postings cannot be rewritten', async () => {
  const client = await connect();
  try {
    await assert.rejects(() => client.query('update postings set amount_minor = amount_minor + 1'), /append_only/);
  } finally {
    await client.end();
  }
});

test('the ledger serves the same product state as the demo seed', async () => {
  const state = await readLedgerState();
  const demo = demoMobileState();

  assert.ok(state, 'ledger state should be readable');
  assert.equal(state.walletNgnKobo, demo.walletNgnKobo);
  assert.equal(state.walletUsdCents, demo.walletUsdCents);
  assert.deepEqual(
    state.plans.map((plan) => [plan.id, plan.balanceKobo]),
    demo.plans.map((plan) => [plan.id, plan.balanceKobo]),
  );
  assert.deepEqual(
    state.holdings.map((holding) => [holding.symbol, holding.units, holding.avgCostMinor]),
    demo.holdings.map((holding) => [holding.symbol, holding.units, holding.avgCostMinor]),
  );
  assert.deepEqual(
    state.txns.map((txn) => [txn.ref, txn.amountKobo, txn.status]),
    demo.txns.map((txn) => [txn.ref, txn.amountKobo, txn.status]),
  );
  assert.equal(state.profile.name, demo.profile.name);
});

test('a failed attempt keeps its amount but moves no money', async () => {
  const client = await connect();
  try {
    const { rows } = await client.query<{ reference: string; amount_minor: string | null; postings: string }>(
      `select e.reference, e.amount_minor, count(p.id)::text as postings
         from entries e
         left join postings p on p.entry_id = e.id
        where e.owner_id = $1 and e.status <> 'Completed'
        group by e.id`,
      [owner],
    );
    assert.equal(rows.length, 1);
    const failed = rows[0];
    assert.ok(failed);
    assert.equal(failed.reference, 'APX-DEP-881996');
    assert.equal(Number(failed.amount_minor), 2_000_000);
    assert.equal(failed.postings, '0');
  } finally {
    await client.end();
  }
});
