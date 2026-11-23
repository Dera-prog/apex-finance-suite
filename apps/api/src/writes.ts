import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import { formatNgn, formatUsd, pctOf, roundMinor, toMinor } from '../../../packages/shared/money.js';
import type {
  DepositRequest,
  OpenPlanRequest,
  PlanFundRequest,
  PlanWithdrawRequest,
  TradeRequest,
  TransferRequest,
  WithdrawRequest,
} from '../../../packages/shared/api.js';
import { stocks } from '../../../packages/shared/data.js';
import { db } from './db.js';
import { LEDGER_OWNER } from './env.js';

/** The amount a client may move in one request, in minor units. */
const MIN_MOVE = 10_000; // ₦100
const MIN_TRANSFER = 5_000; // ₦50
const MIN_PLAN_OPENING = 100_000; // ₦1,000
const MAX_DEPOSIT = 1_000_000_000; // ₦10,000,000
const TRADE_FEE_PERCENT = 1.5;

const PLAN_STYLES = {
  flexible: { rate: 12, color: '#1D52CE', pastel: '#A9CBFF', icon: 'bolt', label: 'Flexible' },
  fixed: { rate: 16, color: '#760A81', pastel: '#F4CCF9', icon: 'lock', label: 'Fixed' },
  target: { rate: 14, color: '#06720C', pastel: '#C3F3C6', icon: 'target', label: 'Target' },
} as const;

export type LedgerErrorCode =
  | 'invalid_amount'
  | 'invalid_reference'
  | 'invalid_text'
  | 'invalid_plan'
  | 'amount_below_minimum'
  | 'amount_above_limit'
  | 'invalid_units'
  | 'invalid_side'
  | 'unknown_symbol'
  | 'unknown_plan'
  | 'plan_locked'
  | 'insufficient_wallet'
  | 'insufficient_plan'
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

const checkedAmount = (value: unknown, max = MAX_DEPOSIT, min = MIN_MOVE): number => {
  const amount = toAmount(value);
  if (amount < min) {
    throw new LedgerError('amount_below_minimum', 400, `Enter at least ${formatNgn(roundMinor(min))}.`);
  }
  if (amount > max) throw new LedgerError('amount_above_limit', 400, 'Amount is above the ₦10,000,000 demo limit.');
  return amount;
};

/** Free-text names are stored on the entry, so keep them short and single-line. */
const cleanText = (value: unknown, fallback: string, max = 60): string => {
  if (typeof value !== 'string') return fallback;
  const text = value.replace(/\s+/g, ' ').trim().slice(0, max);
  return text || fallback;
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

export async function withdraw(input: WithdrawRequest, owner = LEDGER_OWNER, client?: Query) {
  const amount = checkedAmount(input.amountMinor);
  const bank = cleanText(input.bankName, 'Beneficiary bank');

  return withLedger(client, async (query) => {
    const walletId = await accountId(query, owner, 'wallet:NGN');
    if (amount > (await balanceOf(query, walletId))) {
      throw new LedgerError('insufficient_wallet', 400, 'Amount is more than your available wallet balance.');
    }
    const reference = await resolveReference(query, owner, 'WDR', input.reference);
    return postEntry(query, {
      owner,
      reference,
      title: `Withdrawal to ${bank}`,
      meta: 'Beneficiary bank · demo rails',
      kind: 'withdrawal',
      primary: 'wallet:NGN',
      postings: [
        { account: 'wallet:NGN', currency: 'NGN', amountMinor: -amount },
        { account: 'external:NGN', currency: 'NGN', amountMinor: amount },
      ],
    });
  });
}

export async function transfer(input: TransferRequest, owner = LEDGER_OWNER, client?: Query) {
  const amount = checkedAmount(input.amountMinor, MAX_DEPOSIT, MIN_TRANSFER);
  const tag = typeof input.tag === 'string' ? input.tag.replace(/\s+/g, '').trim().slice(0, 30) : '';
  const recipient = cleanText(input.recipient, 'Apex user', 80);
  const to = tag ? `${recipient} (${tag})` : recipient;

  return withLedger(client, async (query) => {
    const walletId = await accountId(query, owner, 'wallet:NGN');
    if (amount > (await balanceOf(query, walletId))) {
      throw new LedgerError('insufficient_wallet', 400, 'Amount is more than your available wallet balance.');
    }
    const reference = await resolveReference(query, owner, 'TRF', input.reference);
    return postEntry(query, {
      owner,
      reference,
      title: `Transfer to ${to}`,
      meta: 'Apex wallet · demo rails',
      kind: 'transfer',
      primary: 'wallet:NGN',
      postings: [
        { account: 'wallet:NGN', currency: 'NGN', amountMinor: -amount },
        { account: 'external:NGN', currency: 'NGN', amountMinor: amount },
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
  const feeText = currency === 'NGN' ? formatNgn(fee, 2) : formatUsd(fee);

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

export async function openPlan(input: OpenPlanRequest, owner = LEDGER_OWNER, client?: Query) {
  const kind = input.kind;
  if (kind !== 'flexible' && kind !== 'fixed' && kind !== 'target') {
    throw new LedgerError('invalid_plan', 400, 'Choose flexible, fixed or target.');
  }
  const style = PLAN_STYLES[kind];
  const name = cleanText(input.name, '', 60);
  if (!name) throw new LedgerError('invalid_text', 400, 'Give the plan a name.');
  const initial = checkedAmount(input.initialMinor, MAX_DEPOSIT, MIN_PLAN_OPENING);
  const target = input.targetMinor === undefined ? undefined : toAmount(input.targetMinor);
  const monthly = input.monthlyMinor === undefined ? undefined : toAmount(input.monthlyMinor);
  if (kind === 'target') {
    if (target === undefined || target <= initial) {
      throw new LedgerError('invalid_plan', 400, 'A target must be higher than the starting amount.');
    }
    if (monthly !== undefined && monthly < MIN_MOVE) {
      throw new LedgerError('amount_below_minimum', 400, 'Monthly auto-save must be at least ₦100.');
    }
  }

  const now = new Date();
  const opened = now.toISOString().slice(0, 10);
  const maturityDate = new Date(now);
  maturityDate.setDate(maturityDate.getDate() + 90);
  const subtitle =
    kind === 'fixed'
      ? `90-day fixed deposit · matures ${maturityDate.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}`
      : kind === 'target'
        ? monthly
          ? `${formatNgn(roundMinor(monthly))} auto-save monthly`
          : 'Manual top-ups'
        : 'Withdraw anytime · interest paid monthly';

  return withLedger(client, async (query) => {
    const walletId = await accountId(query, owner, 'wallet:NGN');
    if (initial > (await balanceOf(query, walletId))) {
      throw new LedgerError('insufficient_wallet', 400, 'Your wallet does not have enough for that starting amount.');
    }

    const planId = `plan-${randomUUID().slice(0, 8)}`;
    const sort = await query.query('select coalesce(min(sort_order), 0) - 1 as next from plans where owner_id = $1', [owner]);
    const sortOrder = Number((sort.rows[0] as { next: number | string }).next);

    await query.query(
      `insert into plans (id, owner_id, name, kind, rate, subtitle, opened, maturity, target_minor, monthly_minor,
                          color, pastel, icon, sort_order)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [
        planId,
        owner,
        name,
        kind,
        style.rate,
        subtitle,
        opened,
        kind === 'fixed' ? maturityDate.toISOString().slice(0, 10) : null,
        kind === 'target' ? target : null,
        kind === 'target' ? (monthly ?? null) : null,
        style.color,
        style.pastel,
        style.icon,
        sortOrder,
      ],
    );
    await query.query(
      `insert into accounts (owner_id, code, name, kind, currency) values ($1,$2,$3,'savings_plan','NGN')
       on conflict (owner_id, code) do nothing`,
      [owner, `plan:${planId}`, name],
    );

    const reference = await resolveReference(query, owner, 'SAV', input.reference);
    const entryId = await postEntry(query, {
      owner,
      reference,
      title: name,
      meta: `${style.label} savings · plan opened`,
      kind: 'savings',
      primary: 'wallet:NGN',
      postings: [
        { account: 'wallet:NGN', currency: 'NGN', amountMinor: -initial },
        { account: `plan:${planId}`, currency: 'NGN', amountMinor: initial },
      ],
    });
    return { planId, entryId };
  });
}

export async function withdrawPlan(
  planId: string,
  input: PlanWithdrawRequest,
  owner = LEDGER_OWNER,
  client?: Query,
) {
  const amount = checkedAmount(input.amountMinor);

  return withLedger(client, async (query) => {
    const plan = await query.query<{ id: string; name: string; kind: string; maturity: Date | null }>(
      'select id, name, kind, maturity from plans where owner_id = $1 and id = $2 for update',
      [owner, planId],
    );
    const row = plan.rows[0];
    if (!row) throw new LedgerError('unknown_plan', 404, 'Plan not found.');
    if (row.kind === 'fixed' && row.maturity !== null && row.maturity.getTime() > Date.now()) {
      throw new LedgerError('plan_locked', 400, 'This fixed plan is locked until its maturity date.');
    }

    const planAccountId = await accountId(query, owner, `plan:${row.id}`);
    if (amount > (await balanceOf(query, planAccountId))) {
      throw new LedgerError('insufficient_plan', 400, 'Amount is more than this plan balance.');
    }

    const reference = await resolveReference(query, owner, 'SAV', input.reference);
    return postEntry(query, {
      owner,
      reference,
      title: row.name,
      meta: 'Savings withdrawal · to wallet',
      kind: 'savings',
      primary: 'wallet:NGN',
      postings: [
        { account: `plan:${row.id}`, currency: 'NGN', amountMinor: -amount },
        { account: 'wallet:NGN', currency: 'NGN', amountMinor: amount },
      ],
    });
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
