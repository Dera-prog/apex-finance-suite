import type { Bank, Notification, Plan, Txn } from './data.ts';
import type { Minor } from './money.ts';

export const API = {
  health: '/api/health',
  demoState: '/api/state',
} as const;

export type AccountKind = 'seed' | 'new';

export type Profile = {
  name: string;
  firstName: string;
  initials: string;
  phone: string;
  email: string;
  bvn: string;
  nin: string;
  kycLevel: 1 | 2;
  kycLabel: string;
  address: string;
  memberSince: string;
  bankAccount: string;
  usStocksAccount: string;
  avatarTint: string;
};

export type PlanDto = Omit<Plan, 'balance' | 'target' | 'monthly'> & {
  balanceKobo: Minor;
  targetKobo?: Minor;
  monthlyKobo?: Minor;
};

export type HoldingDto = {
  symbol: string;
  units: number;
  currency: 'NGN' | 'USD';
  avgCostMinor: Minor;
  priceMinor: Minor;
  change: number;
};

export type TxnDto = Omit<Txn, 'amount'> & { amountKobo: Minor };

export type MobileStateResponse = {
  account: AccountKind;
  profile: Profile;
  walletNgnKobo: Minor;
  walletUsdCents: Minor;
  plans: PlanDto[];
  holdings: HoldingDto[];
  txns: TxnDto[];
  notifications: Notification[];
  banks: Bank[];
};

export type HealthResponse = { ok: boolean; service: string; uptime: number };
export type ErrorResponse = { error: string };
