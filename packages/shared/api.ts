import type { Bank, Notification, Plan, Txn } from './data.js';
import type { Minor } from './money.js';

export const API = {
  health: '/api/health',
  demoState: '/api/state',
  deposit: '/api/deposit',
  withdraw: '/api/withdraw',
  transfer: '/api/transfer',
  trade: '/api/trade',
  openPlan: '/api/plans',
  checkout: '/api/payments/checkout',
  paymentWebhook: '/api/payments/webhook',
  requestCode: '/api/auth/request-code',
  verifyCode: '/api/auth/verify-code',
  logout: '/api/auth/logout',
} as const;

export const planFundPath = (planId: string) => `/api/plans/${encodeURIComponent(planId)}/fund`;
export const planWithdrawPath = (planId: string) => `/api/plans/${encodeURIComponent(planId)}/withdraw`;

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

export type HealthResponse = {
  ok: boolean;
  service: string;
  uptime: number;
  storage: 'postgres' | 'demo-seed';
};
export type ErrorResponse = { error: string; message?: string };

export type DepositRequest = { amountMinor: number; source?: string; reference?: string };
export type WithdrawRequest = { amountMinor: number; bankName?: string; reference?: string };
export type TransferRequest = { amountMinor: number; recipient?: string; tag?: string; reference?: string };
export type TradeRequest = { symbol: string; units: number; side: 'buy' | 'sell'; reference?: string };
export type PlanFundRequest = { amountMinor: number; reference?: string };
export type PlanWithdrawRequest = { amountMinor: number; reference?: string };
export type OpenPlanRequest = {
  name: string;
  kind: 'flexible' | 'fixed' | 'target';
  initialMinor: number;
  targetMinor?: number;
  monthlyMinor?: number;
  reference?: string;
};

export type CheckoutRequest = { amountMinor: number; email?: string; reference?: string };
export type CheckoutResponse = { authorizationUrl: string; reference: string };

export type RequestCodeRequest = { phone: string };
export type RequestCodeResponse = {
  challengeId: string;
  expiresAt: string;
  /** Present until an SMS provider is wired, so the demo can finish signing in. */
  devCode?: string;
};

export type VerifyCodeRequest = {
  challengeId: string;
  code: string;
  name?: string;
  email?: string;
};

export type AuthResponse = {
  token: string;
  expiresAt: string;
  owner: string;
  state: MobileStateResponse;
};
