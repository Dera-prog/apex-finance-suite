import type { PoolClient } from 'pg';
import { formatNgn, formatUsd, pctOf, toMinor } from '../../../packages/shared/money.js';
import type { DepositRequest, PlanFundRequest, TradeRequest } from '../../../packages/shared/api.js';
import { stocks } from '../../../packages/shared/data.js';
import { db } from './db.js';
import { LEDGER_OWNER } from './env.js';

/** The amount a client may move in one request, in minor units. */
const MIN_MOVE = 10_000; // ₦100
const MAX_DEPOSIT = 1_000_000_000; // ₦10,000,000
const TRADE_FEE_PERCENT = 1.5;

export type LedgerErrorCode =
  | 'invalid_amount'
  | 'invalid_reference'
  | 'amount_below_minimum'
  | 'amount_above_limit'
  | 'invalid_units'
  | 'invalid_side'
  | 'unknown_symbol'
  | 'unknown_plan'
  | 'insufficient_wallet'
  | 'insufficient_holding'
  | 'duplicate_reference'
  | 'ledger_unavailable';

export class LedgerError extends Error {
  constructor(
    readonly code: LedgerErrorCode,
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

type Query = Pick<PoolClient, 'query'>;

const toAmount = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new LedgerError('invalid_amount', 400, 'Amount must be a whole number of minor units.');
  }
  return value;
};

const checkedAmount = (value: unknown, max = Number.MAX_SAFE_INTEGER): number => {
  const amount = toAmount(value);
  if (amount < MIN_MOVE) throw new LedgerError('amount_below_minimum', 400, 'Enter at least ₦100.');
  if (amount > max) throw new LedgerError('amount_above_limit', 400, 'Amount is above the ₦10,000,000 demo limit.');
  return amount;
};

/** Runs a write inside a transaction when no client is supplied, so callers can also join their own. */
async function withLedger<T>(client: Query | undefined, run: (query: Query) => Promise<T>): Promise<T> {
  if (client) return run(client);

  const pool = db();
  if (!pool) throw new LedgerError('ledger_unavailable', 503, 'The ledger database is not configured.');

  const tx = await pool.connect();
  try {
    await tx.query('begin');
    const result = await run(tx);
    await tx.query('commit');
    return result;
  } catch (error) {
    await tx.query('rollback');
    throw error;
  } finally {
    tx.release();
  }
}

const accountId = async (query: Query, owner: string, code: string) => {
  const result = await query.query('select id from accounts where owner_id = $1 and code = $2 for update', [owner, code]);
  const row = result.rows[0] as { id: string } | undefined;
  if (!row) throw new LedgerError('ledger_unavailable', 500, `Account ${code} is missing for this owner.`);
  return row.id;
};

const balanceOf = async (query: Query, id: string) => {
  const result = await query.query('select coalesce(sum(amount_minor), 0)::bigint as total from postings where account_id = $1', [id]);
  return Number((result.rows[0] as { total: string }).total);
};

const referenceExists = async (query: Query, owner: string, reference: string) => {
  const result = await query.query('select 1 from entries where owner_id = $1 and reference = $2', [owner, reference]);
  return result.rows.length > 0;
};

async function resolveReference(query: Query, owner: string, kind: string, supplied: unknown) {
  if (supplied !== undefined) {
    const reference = typeof supplied === 'string' ? supplied.trim() : '';
    if (!/^[A-Za-z0-9._-]{4,40}$/.test(reference)) {
      throw new LedgerError('invalid_reference', 400, 'Reference must be 4-40 letters, digits, dots, dashes or underscores.');
    }
    if (await referenceExists(query, owner, reference)) {
      throw new LedgerError('duplicate_reference', 409, 'That reference has already been used.');
    }
    return reference;
  }

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const reference = `APX-${kind}-${Math.floor(100000 + Math.random() * 899999)}`;
    if (!(await referenceExists(query, owner, reference))) return reference;
  }
  throw new LedgerError('duplicate_reference', 409, 'Could not allocate a fresh reference; retry.');
}

type EntryInput = {
  owner: string;
  reference: string;
  title: string;
  meta: string;
  kind: 'deposit' | 'withdrawal' | 'transfer' | 'savings' | 'invest' | 'interest';
  primary: string;
  postings: Array<{ account: string; currency: 'NGN' | 'USD'; amountMinor: number }>;
};

const postEntry = async (query: Query, entry: EntryInput) => {
  const result = await query.query<{ id: string }>(
    `select post_entry($1,$2,$3,$4,$5,'Completed',$6,$7,$8::jsonb,true) as id`,
    [
      entry.owner,
      entry.reference,
      entry.title,
      entry.meta,
      entry.kind,
      new Date().toISOString(),
      entry.primary,
      JSON.stringify(entry.postings),
    ],
  );
  return (result.rows[0] as { id: string }).id;
};

export async function deposit(input: DepositRequest, owner = LEDGER_OWNER, client?: Query) {
  const amount = checkedAmount(input.amountMinor, MAX_DEPOSIT);
  const source = (input.source ?? 'Guaranty Trust Bank').trim().slice(0, 60) || 'Guaranty Trust Bank';

  return withLedger(client, async (query) => {
    await accountId(query, owner, 'wallet:NGN');
    const reference = await resolveReference(query, owner, 'DEP', input.reference);
    return postEntry(query, {
      owner,
      reference,
      title: `Bank transfer from ${source}`,
      meta: 'Wallet funding · demo balance',
      kind: 'deposit',
      primary: 'wallet:NGN',
      postings: [
        { account: 'wallet:NGN', currency: 'NGN', amountMinor: amount },
        { account: 'external:NGN', currency: 'NGN', amountMinor: -amount },
      ],
    });
  });
}

export async function trade(input: TradeRequest, owner = LEDGER_OWNER, client?: Query) {
  const stock = stocks.find((item) => item.symbol === input.symbol);
  if (!stock) throw new LedgerError('unknown_symbol', 400, 'Unknown instrument.');
  if (input.side !== 'buy' && input.side !== 'sell') {
    throw new LedgerError('invalid_side', 400, 'Side must be buy or sell.');
  }
  if (typeof input.units !== 'number' || !Number.isInteger(input.units) || input.units < 1) {
    throw new LedgerError('invalid_units', 400, 'Enter a whole number of units.');
  }

  const units = input.units;
  const currency = stock.currency;
  const wallet = `wallet:${currency}`;
  const gross = toMinor(units * stock.price);
  const fee = pctOf(gross, TRADE_FEE_PERCENT);
  const feeText = currency === 'NGN' ? formatNgn(fee) : formatUsd(fee);

  return withLedger(client, async (query) => {
    const walletId = await accountId(query, owner, wallet);
    const reference = await resolveReference(query, owner, 'INV', input.reference);
    const position = await query.query(
      'select id, units from positions where owner_id = $1 and symbol = $2 for update',
      [owner, stock.symbol],
    );
    const held = Number((position.rows[0] as { units: string } | undefined)?.units ?? 0);

    if (input.side === 'buy') {
      const cost = gross + fee;
      if (cost > (await balanceOf(query, walletId))) {
        const message =
          currency === 'USD'
            ? 'Your USD wallet does not cover this order plus fees.'
            : 'Your naira wallet does not cover this order plus fees.';
        throw new LedgerError('insufficient_wallet', 400, message);
      }

      await postEntry(query, {
        owner,
        reference,
        title: `Bought ${units} ${stock.symbol}`,
        meta: `Invest · ${stock.exchange} · fee ${feeText}`,
        kind: 'invest',
        primary: wallet,
        postings: [
          { account: wallet, currency, amountMinor: -cost },
          { account: `external:${currency}`, currency, amountMinor: cost },
        ],
      });

      await query.query(
        `insert into positions (owner_id, symbol, currency, units, avg_cost_minor, sort_order)
         values ($1,$2,$3,$4,$5,(select coalesce(max(sort_order) + 1, 0) from positions where owner_id = $1))
         on conflict (owner_id, symbol) do update
            set units = positions.units + excluded.units,
                avg_cost_minor = round(
                  (positions.avg_cost_minor::numeric * positions.units + excluded.avg_cost_minor::numeric * excluded.units)
                  / (positions.units + excluded.units)
                )::bigint`,
        [owner, stock.symbol, currency, units, Math.round(gross / units)],
      );
      return;
    }

    if (held < units) {
      throw new LedgerError(
        'insufficient_holding',
        400,
        `You only hold ${held} unit${held === 1 ? '' : 's'} of ${stock.symbol}.`,
      );
    }

    const proceeds = gross - fee;
    await postEntry(query, {
      owner,
      reference,
      title: `Sold ${units} ${stock.symbol}`,
      meta: `Invest · ${stock.exchange} · settled to ${currency} wallet`,
      kind: 'invest',
      primary: wallet,
      postings: [
        { account: wallet, currency, amountMinor: proceeds },
        { account: `external:${currency}`, currency, amountMinor: -proceeds },
      ],
    });

    if (held === units) {
      await query.query('delete from positions where owner_id = $1 and symbol = $2', [owner, stock.symbol]);
    } else {
      await query.query('update positions set units = units - $3 where owner_id = $1 and symbol = $2', [
        owner,
        stock.symbol,
        units,
      ]);
    }
  });
}

export async function fundPlan(planId: string, input: PlanFundRequest, owner = LEDGER_OWNER, client?: Query) {
  const amount = checkedAmount(input.amountMinor);

  return withLedger(client, async (query) => {
    const plan = await query.query<{ id: string; name: string }>(
      'select id, name from plans where owner_id = $1 and id = $2',
      [owner, planId],
    );
    const row = plan.rows[0] as { id: string; name: string } | undefined;
    if (!row) throw new LedgerError('unknown_plan', 404, 'Plan not found.');

    const walletId = await accountId(query, owner, 'wallet:NGN');
    if (amount > (await balanceOf(query, walletId))) {
      throw new LedgerError('insufficient_wallet', 400, 'Your wallet does not have enough for this top-up.');
    }
    await accountId(query, owner, `plan:${row.id}`);

    const reference = await resolveReference(query, owner, 'SAV', input.reference);
    return postEntry(query, {
      owner,
      reference,
      title: row.name,
      meta: 'Savings top-up · from wallet',
      kind: 'savings',
      primary: 'wallet:NGN',
      postings: [
        { account: 'wallet:NGN', currency: 'NGN', amountMinor: -amount },
        { account: `plan:${row.id}`, currency: 'NGN', amountMinor: amount },
      ],
    });
  });
}
