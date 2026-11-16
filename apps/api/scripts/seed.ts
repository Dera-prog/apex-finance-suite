import pg from 'pg';
import { demoMobileState } from '../../../packages/shared/demo-state.ts';
import { scriptDatabaseUrl } from './database-url.ts';

const { Client } = pg;

const owner = (process.env.LEDGER_OWNER ?? 'demo').trim();
const state = demoMobileState();

type Posting = { account: string; currency: 'NGN' | 'USD'; amountMinor: number };

const client = new Client({ connectionString: scriptDatabaseUrl });
await client.connect();

const post = async (
  reference: string,
  title: string,
  meta: string,
  kind: 'deposit' | 'withdrawal' | 'transfer' | 'savings' | 'invest' | 'interest',
  status: 'Completed' | 'Pending' | 'Failed',
  occurredAt: string,
  primary: string,
  postings: Posting[],
  visible: boolean,
  amountMinor: number | null = null,
) => {
  const result = await client.query<{ id: string }>(
    `select post_entry($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11) as id`,
    [
      owner,
      reference,
      title,
      meta,
      kind,
      status,
      occurredAt,
      primary,
      JSON.stringify(postings.map((p) => ({ account: p.account, currency: p.currency, amountMinor: p.amountMinor }))),
      visible,
      amountMinor,
    ],
  );
  return result.rows[0].id;
};

await client.query('begin');

try {
  await client.query('truncate postings, entries, positions, plans, profiles, accounts restart identity cascade');

  const accounts: Array<[string, string, 'wallet' | 'savings_plan' | 'external', 'NGN' | 'USD']> = [
    ['wallet:NGN', 'Naira wallet', 'wallet', 'NGN'],
    ['wallet:USD', 'Dollar wallet', 'wallet', 'USD'],
    ['external:NGN', 'External naira', 'external', 'NGN'],
    ['external:USD', 'External dollar', 'external', 'USD'],
    ...state.plans.map(
      (plan) => [`plan:${plan.id}`, plan.name, 'savings_plan', 'NGN'] as [string, string, 'savings_plan', 'NGN'],
    ),
  ];

  for (const [code, name, kind, currency] of accounts) {
    await client.query(
      'insert into accounts (owner_id, code, name, kind, currency) values ($1,$2,$3,$4,$5)',
      [owner, code, name, kind, currency],
    );
  }

  for (const [index, plan] of state.plans.entries()) {
    await client.query(
      `insert into plans (id, owner_id, name, kind, rate, subtitle, opened, maturity, target_minor, monthly_minor, color, pastel, icon, sort_order)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [
        plan.id,
        owner,
        plan.name,
        plan.kind,
        plan.rate,
        plan.subtitle,
        plan.opened,
        plan.maturity ?? null,
        plan.targetKobo ?? null,
        plan.monthlyKobo ?? null,
        plan.color,
        plan.pastel,
        plan.icon,
        index,
      ],
    );
  }

  await client.query(
    `insert into profiles (owner_id, account_kind, name, first_name, initials, phone, email, bvn, nin, kyc_level,
                           kyc_label, address, member_since, bank_account, us_stocks_account, avatar_tint)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
    [
      owner,
      state.account,
      state.profile.name,
      state.profile.firstName,
      state.profile.initials,
      state.profile.phone,
      state.profile.email,
      state.profile.bvn,
      state.profile.nin,
      state.profile.kycLevel,
      state.profile.kycLabel,
      state.profile.address,
      state.profile.memberSince,
      state.profile.bankAccount,
      state.profile.usStocksAccount,
      state.profile.avatarTint,
    ],
  );

  for (const [index, holding] of state.holdings.entries()) {
    await client.query(
      'insert into positions (owner_id, symbol, currency, units, avg_cost_minor, sort_order) values ($1,$2,$3,$4,$5,$6)',
      [owner, holding.symbol, holding.currency, holding.units, holding.avgCostMinor, index],
    );
  }

  const balances = new Map<string, number>();
  const apply = (postings: Posting[]) => {
    for (const posting of postings) {
      balances.set(posting.account, (balances.get(posting.account) ?? 0) + posting.amountMinor);
    }
  };

  const history = [...state.txns].sort((a, b) => a.date.localeCompare(b.date));

  for (const txn of history) {
    const failed = txn.status !== 'Completed';
    const currency = txn.type === 'invest' && /US|NASDAQ|NYSE/i.test(txn.meta) ? 'USD' : 'NGN';
    const wallet = `wallet:${currency}`;
    const plan = state.plans.find((item) => txn.title === item.name || txn.meta.startsWith(item.name));

    const postings: Posting[] = [];
    if (!failed) {
      if (txn.type === 'interest' && plan) {
        postings.push({ account: `plan:${plan.id}`, currency: 'NGN', amountMinor: txn.amountKobo });
        postings.push({ account: 'external:NGN', currency: 'NGN', amountMinor: -txn.amountKobo });
      } else if (txn.type === 'savings' && plan) {
        postings.push({ account: wallet, currency, amountMinor: txn.amountKobo });
        postings.push({ account: `plan:${plan.id}`, currency: 'NGN', amountMinor: -txn.amountKobo });
      } else {
        postings.push({ account: wallet, currency, amountMinor: txn.amountKobo });
        postings.push({ account: `external:${currency}`, currency, amountMinor: -txn.amountKobo });
      }
      apply(postings);
    }

    const primary = txn.type === 'interest' && plan ? `plan:${plan.id}` : wallet;
    await post(
      txn.ref,
      txn.title,
      txn.meta,
      txn.type,
      txn.status,
      txn.date,
      primary,
      postings,
      true,
      failed ? txn.amountKobo : null,
    );
  }

  // Bring every account up to the balance the product ships with, so the ledger and the UI agree exactly.
  const targets: Array<[string, 'NGN' | 'USD', number]> = [
    ['wallet:NGN', 'NGN', state.walletNgnKobo],
    ['wallet:USD', 'USD', state.walletUsdCents],
    ...state.plans.map((plan) => [`plan:${plan.id}`, 'NGN', plan.balanceKobo] as [string, 'NGN', number]),
  ];

  let openingIndex = 0;
  for (const [code, currency, target] of targets) {
    const current = balances.get(code) ?? 0;
    const opening = target - current;
    if (opening === 0) continue;
    openingIndex += 1;
    const postings: Posting[] = [
      { account: code, currency, amountMinor: opening },
      { account: `external:${currency}`, currency, amountMinor: -opening },
    ];
    apply(postings);
    await post(
      `APX-OPN-${String(openingIndex).padStart(4, '0')}`,
      'Opening balance',
      'Brought forward · demo seed',
      'deposit',
      'Completed',
      '2026-01-01T00:00:00+01:00',
      code,
      postings,
      false,
    );
  }

  const actual = await client.query<{ code: string; balance_minor: string }>(
    'select code, balance_minor from account_balances where owner_id = $1',
    [owner],
  );

  const mismatches = targets.filter(([code, , target]) => {
    const row = actual.rows.find((item) => item.code === code);
    return Number(row?.balance_minor ?? 0) !== target;
  });

  if (mismatches.length > 0) {
    throw new Error(`seed did not reconcile: ${mismatches.map(([code]) => code).join(', ')}`);
  }

  const totals = await client.query<{ currency: string; total: string }>(
    `select p.currency, sum(p.amount_minor) as total
       from postings p
       join entries e on e.id = p.entry_id
      where e.owner_id = $1
      group by p.currency`,
    [owner],
  );

  const unbalanced = totals.rows.filter((row) => Number(row.total) !== 0);
  if (unbalanced.length > 0) {
    throw new Error(`ledger does not balance: ${unbalanced.map((row) => row.currency).join(', ')}`);
  }

  await client.query('commit');

  console.log(`seeded ${owner}: ${history.length} transactions, ${openingIndex} opening entries`);
  for (const [code, , target] of targets) {
    console.log(`  ${code} = ${target}`);
  }
  console.log('all currencies net to zero');
} catch (error) {
  await client.query('rollback');
  throw error;
} finally {
  await client.end();
}
