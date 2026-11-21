import assert from 'node:assert/strict';
import test from 'node:test';
import pg from 'pg';
import { stocks } from '../../../packages/shared/data.js';
import { pctOf, toMinor } from '../../../packages/shared/money.js';
import { testDatabaseUrl } from '../scripts/database-url.js';
import { deposit, fundPlan, LedgerError, trade } from './writes.js';

process.env.DATABASE_URL ??= testDatabaseUrl;

const { Client } = pg;
const owner = 'write-test';
const planId = 'plan-write-flex';

const balance = async (client: pg.Client, code: string) => {
  const result = await client.query<{ balance_minor: string }>(
    'select balance_minor from account_balances where owner_id = $1 and code = $2',
    [owner, code],
  );
  return Number(result.rows[0]?.balance_minor ?? 0);
};

const holding = async (client: pg.Client, symbol: string) => {
  const result = await client.query<{ units: string; avg_cost_minor: string }>(
    'select units, avg_cost_minor from positions where owner_id = $1 and symbol = $2',
    [owner, symbol],
  );
  const row = result.rows[0];
  return row ? { units: Number(row.units), avgCostMinor: Number(row.avg_cost_minor) } : null;
};

const postingsOf = async (client: pg.Client, reference: string) => {
  const result = await client.query<{ currency: string; total: string; count: string }>(
    `select p.currency, sum(p.amount_minor)::text as total, count(*)::text as count
       from postings p
       join entries e on e.id = p.entry_id
      where e.owner_id = $1 and e.reference = $2
      group by p.currency`,
    [owner, reference],
  );
  return result.rows;
};

const rejects = async (run: Promise<unknown>, code: string) => {
  await assert.rejects(run, (error: unknown) => {
    assert.ok(error instanceof LedgerError, `expected LedgerError, got ${String(error)}`);
    assert.equal(error.code, code);
    return true;
  });
};

/** Every test gets a funded owner of its own inside a transaction that never commits. */
async function inLedger(run: (client: pg.Client) => Promise<void>) {
  const client = new Client({ connectionString: testDatabaseUrl });
  await client.connect();

  try {
    await client.query('begin');

    const accounts: Array<[string, string, 'wallet' | 'savings_plan' | 'external', 'NGN' | 'USD']> = [
      ['wallet:NGN', 'Naira wallet', 'wallet', 'NGN'],
      ['wallet:USD', 'Dollar wallet', 'wallet', 'USD'],
      ['external:NGN', 'External naira', 'external', 'NGN'],
      ['external:USD', 'External dollar', 'external', 'USD'],
      [`plan:${planId}`, 'Test flex plan', 'savings_plan', 'NGN'],
    ];
    for (const [code, name, kind, currency] of accounts) {
      await client.query('insert into accounts (owner_id, code, name, kind, currency) values ($1,$2,$3,$4,$5)', [
        owner,
        code,
        name,
        kind,
        currency,
      ]);
    }

    await client.query(
      `insert into plans (id, owner_id, name, kind, rate, subtitle, opened, color, pastel, icon)
       values ($1,$2,'Test flex plan','flexible',12,'Withdraw anytime','2026-01-01','#1D52CE','#A9CBFF','bolt')`,
      [planId, owner],
    );

    for (const [code, currency, amount] of [
      ['wallet:NGN', 'NGN', 5_000_000],
      ['wallet:USD', 'USD', 100_000],
    ] as const) {
      await client.query(
        `select post_entry($1,'OPEN-' || $2,'Opening','test','deposit','Completed',now(),$2,$3::jsonb,true)`,
        [
          owner,
          code,
          JSON.stringify([
            { account: code, currency, amountMinor: amount },
            { account: `external:${currency}`, currency, amountMinor: -amount },
          ]),
        ],
      );
    }

    await run(client);
  } finally {
    await client.query('rollback');
    await client.end();
  }
}

test('a deposit credits the wallet and leaves the ledger balanced', async () => {
  await inLedger(async (client) => {
    await deposit({ amountMinor: 250_000, source: 'Zenith Bank', reference: 'TEST-DEP-1' }, owner, client);

    assert.equal(await balance(client, 'wallet:NGN'), 5_250_000);
    assert.equal(await balance(client, `external:NGN`), -5_250_000);

    const postings = await postingsOf(client, 'TEST-DEP-1');
    assert.equal(postings.length, 1);
    assert.equal(postings[0]?.total, '0');

    const entry = await client.query<{ title: string; kind: string }>(
      'select title, kind from entries where owner_id = $1 and reference = $2',
      [owner, 'TEST-DEP-1'],
    );
    const row = entry.rows[0];
    assert.ok(row);
    assert.equal(row.title, 'Bank transfer from Zenith Bank');
    assert.equal(row.kind, 'deposit');
  });
});

test('a deposit rejects amounts below the minimum and fractional amounts', async () => {
  await inLedger(async (client) => {
    await rejects(deposit({ amountMinor: 9_999 }, owner, client), 'amount_below_minimum');
    await rejects(deposit({ amountMinor: 1_000.5 }, owner, client), 'invalid_amount');
    await rejects(deposit({ amountMinor: 1_000_000_001 }, owner, client), 'amount_above_limit');
    assert.equal(await balance(client, 'wallet:NGN'), 5_000_000);
  });
});

test('a supplied reference can only be used once', async () => {
  await inLedger(async (client) => {
    await deposit({ amountMinor: 100_000, reference: 'TEST-ONCE-1' }, owner, client);
    await rejects(deposit({ amountMinor: 100_000, reference: 'TEST-ONCE-1' }, owner, client), 'duplicate_reference');
    assert.equal(await balance(client, 'wallet:NGN'), 5_100_000);
  });
});

test('a buy debits the wallet, records the position and averages repeat buys', async () => {
  await inLedger(async (client) => {
    const stock = stocks.find((item) => item.symbol === 'DANGCEM');
    assert.ok(stock);

    await trade({ symbol: 'DANGCEM', units: 10, side: 'buy' }, owner, client);
    await trade({ symbol: 'DANGCEM', units: 10, side: 'buy' }, owner, client);

    const gross = toMinor(10 * stock.price);
    const cost = gross + pctOf(gross, 1.5);

    assert.equal(await balance(client, 'wallet:NGN'), 5_000_000 - cost * 2);
    assert.deepEqual(await holding(client, 'DANGCEM'), { units: 20, avgCostMinor: Math.round(gross / 10) });
  });
});

test('a sell credits the wallet and removes the position once it is empty', async () => {
  await inLedger(async (client) => {
    const stock = stocks.find((item) => item.symbol === 'DANGCEM');
    assert.ok(stock);

    const gross = toMinor(10 * stock.price);
    const proceeds = gross - pctOf(gross, 1.5);
    const cost = gross + pctOf(gross, 1.5);

    await trade({ symbol: 'DANGCEM', units: 10, side: 'buy' }, owner, client);
    await trade({ symbol: 'DANGCEM', units: 10, side: 'sell' }, owner, client);

    assert.equal(await balance(client, 'wallet:NGN'), 5_000_000 - cost + proceeds);
    assert.equal(await holding(client, 'DANGCEM'), null);
  });
});

test('a sell refuses more units than the account holds', async () => {
  await inLedger(async (client) => {
    await rejects(trade({ symbol: 'DANGCEM', units: 3, side: 'sell' }, owner, client), 'insufficient_holding');
    await rejects(trade({ symbol: 'NOPE', units: 1, side: 'buy' }, owner, client), 'unknown_symbol');
    await rejects(trade({ symbol: 'DANGCEM', units: 0, side: 'buy' }, owner, client), 'invalid_units');
  });
});

test('a buy refuses when the wallet cannot cover the order plus fees', async () => {
  await inLedger(async (client) => {
    await rejects(trade({ symbol: 'DANGCEM', units: 100_000, side: 'buy' }, owner, client), 'insufficient_wallet');
  });
});

test('a dollar trade settles in the dollar wallet', async () => {
  await inLedger(async (client) => {
    const stock = stocks.find((item) => item.currency === 'USD');
    assert.ok(stock);

    await trade({ symbol: stock.symbol, units: 1, side: 'buy' }, owner, client);

    const gross = toMinor(stock.price);
    assert.equal(await balance(client, 'wallet:USD'), 100_000 - (gross + pctOf(gross, 1.5)));
    assert.equal(await balance(client, 'wallet:NGN'), 5_000_000);
    assert.equal((await holding(client, stock.symbol))?.units, 1);
  });
});

test('funding a plan moves money from the wallet into the plan', async () => {
  await inLedger(async (client) => {
    await fundPlan(planId, { amountMinor: 100_000, reference: 'TEST-SAV-1' }, owner, client);

    assert.equal(await balance(client, 'wallet:NGN'), 4_900_000);
    assert.equal(await balance(client, `plan:${planId}`), 100_000);

    const entry = await client.query<{ title: string; kind: string; amount_minor: string }>(
      'select title, kind, amount_minor from entries where owner_id = $1 and reference = $2',
      [owner, 'TEST-SAV-1'],
    );
    const row = entry.rows[0];
    assert.ok(row);
    assert.equal(row.title, 'Test flex plan');
    assert.equal(row.kind, 'savings');
    assert.equal(row.amount_minor, '-100000');
  });
});

test('funding refuses an unknown plan and a wallet that cannot cover it', async () => {
  await inLedger(async (client) => {
    await rejects(fundPlan('plan-missing', { amountMinor: 100_000 }, owner, client), 'unknown_plan');
    await rejects(fundPlan(planId, { amountMinor: 5_100_000 }, owner, client), 'insufficient_wallet');
    assert.equal(await balance(client, `plan:${planId}`), 0);
  });
});
