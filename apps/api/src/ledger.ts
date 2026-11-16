import { banks, notifications, stocks } from '../../../packages/shared/data.js';
import type { HoldingDto, MobileStateResponse, PlanDto, Profile, TxnDto } from '../../../packages/shared/api.js';
import { roundMinor, toMinor } from '../../../packages/shared/money.js';
import type { Minor } from '../../../packages/shared/money.js';
import { db } from './db.js';
import { LEDGER_OWNER } from './env.js';

type BalanceRow = { code: string; balance_minor: string };
type PlanRow = {
  id: string;
  name: string;
  kind: PlanDto['kind'];
  rate: string;
  subtitle: string;
  opened: Date;
  maturity: Date | null;
  target_minor: string | null;
  monthly_minor: string | null;
  color: string;
  pastel: string;
  icon: string;
  balance_minor: string;
};
type TxnRow = {
  id: string;
  title: string;
  meta: string;
  kind: TxnDto['type'];
  status: TxnDto['status'];
  occurred_at: Date;
  reference: string;
  amount_minor: string | null;
};
type PositionRow = { symbol: string; currency: 'NGN' | 'USD'; units: string; avg_cost_minor: string };
type ProfileRow = Record<string, string | number | null>;

const isoDate = (value: Date | string | null) =>
  value === null ? undefined : (typeof value === 'string' ? value : value.toISOString()).slice(0, 10);

const moneyOf = (value: string | null) => (value === null ? null : Number(value));

function toProfile(row: ProfileRow): Profile {
  const text = (key: string) => String(row[key] ?? '');
  return {
    name: text('name'),
    firstName: text('first_name'),
    initials: text('initials'),
    phone: text('phone'),
    email: text('email'),
    bvn: text('bvn'),
    nin: text('nin'),
    kycLevel: Number(row.kyc_level) === 2 ? 2 : 1,
    kycLabel: text('kyc_label'),
    address: text('address'),
    memberSince: text('member_since'),
    bankAccount: text('bank_account'),
    usStocksAccount: text('us_stocks_account'),
    avatarTint: text('avatar_tint'),
  };
}

/** Reads the whole product state from the ledger. Returns null when the database is unavailable. */
/** Whether /api/state can actually read the ledger right now, as opposed to the packaged seed. */
export async function ledgerConnected(): Promise<boolean> {
  const pool = db();
  if (!pool) return false;

  try {
    await pool.query('select 1');
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}

export async function readLedgerState(owner = LEDGER_OWNER): Promise<MobileStateResponse | null> {
  const pool = db();
  if (!pool) return null;

  try {
    const [profile, balances, plans, txns, positions] = await Promise.all([
      pool.query<ProfileRow>('select * from profiles where owner_id = $1', [owner]),
      pool.query<BalanceRow>('select code, balance_minor from account_balances where owner_id = $1', [owner]),
      pool.query<PlanRow>(
        `select p.*, coalesce(b.balance_minor, 0) as balance_minor
           from plans p
           left join account_balances b on b.code = 'plan:' || p.id and b.owner_id = p.owner_id
          where p.owner_id = $1
          order by p.sort_order`,
        [owner],
      ),
      pool.query<TxnRow>(
        `select e.id, e.title, e.meta, e.kind, e.status, e.occurred_at, e.reference,
                coalesce(
                  (select p.amount_minor from postings p where p.entry_id = e.id and p.account_id = e.primary_account),
                  e.amount_minor
                ) as amount_minor
           from entries e
          where e.owner_id = $1 and e.visible
          order by e.occurred_at desc`,
        [owner],
      ),
      pool.query<PositionRow>(
        'select symbol, currency, units, avg_cost_minor from positions where owner_id = $1 order by sort_order',
        [owner],
      ),
    ]);

    const row = profile.rows[0];
    if (!row) return null;

    const balanceOf = (code: string) => {
      const found = balances.rows.find((item) => item.code === code);
      return roundMinor(Number(found?.balance_minor ?? 0));
    };

    const holdings: HoldingDto[] = positions.rows.map((position) => {
      const quote = stocks.find((stock) => stock.symbol === position.symbol);
      const avgCostMinor = roundMinor(Number(position.avg_cost_minor));
      return {
        symbol: position.symbol,
        units: Number(position.units),
        currency: position.currency,
        avgCostMinor,
        priceMinor: quote ? toMinor(quote.price) : avgCostMinor,
        change: quote?.change ?? 0,
      };
    });

    return {
      account: row.account_kind === 'new' ? 'new' : 'seed',
      profile: toProfile(row),
      walletNgnKobo: balanceOf('wallet:NGN'),
      walletUsdCents: balanceOf('wallet:USD'),
      plans: plans.rows.map(
        (plan): PlanDto => ({
          id: plan.id,
          name: plan.name,
          kind: plan.kind,
          rate: Number(plan.rate),
          subtitle: plan.subtitle,
          opened: isoDate(plan.opened) ?? '',
          maturity: isoDate(plan.maturity),
          balanceKobo: roundMinor(Number(plan.balance_minor)) as Minor,
          targetKobo: moneyOf(plan.target_minor) === null ? undefined : (roundMinor(Number(plan.target_minor)) as Minor),
          monthlyKobo:
            moneyOf(plan.monthly_minor) === null ? undefined : (roundMinor(Number(plan.monthly_minor)) as Minor),
          color: plan.color,
          pastel: plan.pastel,
          icon: plan.icon,
        }),
      ),
      txns: txns.rows.map(
        (txn): TxnDto => ({
          id: txn.id,
          title: txn.title,
          meta: txn.meta,
          type: txn.kind,
          status: txn.status,
          date: txn.occurred_at.toISOString(),
          ref: txn.reference,
          amountKobo: roundMinor(Number(txn.amount_minor ?? 0)) as Minor,
        }),
      ),
      holdings,
      notifications: notifications.map((notification) => ({ ...notification })),
      banks: banks.map((bank) => ({ ...bank })),
    } as MobileStateResponse;
  } catch (error) {
    console.error('ledger read failed', error);
    return null;
  }
}
