import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  banks as seedBanks,
  holdings as seedHoldings,
  initialPlans,
  notifications as seedNotifications,
  stocks,
  transactions as seedTxns,
  user,
  wallet,
} from '@shared/data';
import type { Bank, Holding, Notification, Plan, PlanKind, Stock, Txn } from '@shared/data';

type Prefs = {
  biometric: boolean;
  priceAlerts: boolean;
  productNews: boolean;
  hideBalance: boolean;
  pinAlerts: boolean;
  emailAlerts: boolean;
  extHours: boolean;
};

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

export type MobileState = {
  account: 'seed' | 'new';
  profile: Profile;
  walletNgn: number;
  walletUsd: number;
  plans: Plan[];
  holdings: Holding[];
  txns: Txn[];
  notifications: Notification[];
  banks: Bank[];
  prefs: Prefs;
};

const STORAGE_KEY = 'apex.mobile.v1';

const seedProfile = (): Profile => ({ ...user, usStocksAccount: '••• ••• 4471' });

const seed = (): MobileState => ({
  account: 'seed',
  profile: seedProfile(),
  walletNgn: wallet.ngn,
  walletUsd: wallet.usd,
  plans: initialPlans.map((p) => ({ ...p })),
  holdings: seedHoldings.map((h) => ({ ...h })),
  txns: seedTxns.map((t) => ({ ...t })),
  notifications: seedNotifications.map((n) => ({ ...n })),
  banks: seedBanks.map((b) => ({ ...b })),
  prefs: { biometric: true, priceAlerts: true, productNews: false, hideBalance: false, pinAlerts: true, emailAlerts: true, extHours: false },
});

const freshAccount = (input: { name: string; email: string; phone: string }): MobileState => {
  const name = input.name.trim();
  const firstName = name.split(/\s+/)[0] || 'Friend';
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const digits = input.phone.replace(/\D/g, '');
  return {
    account: 'new',
    profile: {
      name,
      firstName,
      initials,
      phone: input.phone.trim(),
      email: input.email.trim(),
      bvn: 'Not verified',
      nin: 'Not verified',
      kycLevel: 1,
      kycLabel: 'Level 1 · Phone verified',
      address: 'Not added yet',
      memberSince: new Date().toLocaleDateString('en-NG', { month: 'long', year: 'numeric' }),
      bankAccount: 'None linked',
      usStocksAccount: 'Not issued yet',
      avatarTint: '#FFDCCE',
    },
    walletNgn: 0,
    walletUsd: 0,
    plans: [],
    holdings: [],
    txns: [],
    notifications: [
      {
        id: 'nt-welcome',
        title: 'Welcome to Apex',
        body: 'Add money to activate your wallet and start saving or investing.',
        time: new Date().toISOString(),
        kind: 'kyc',
        unread: true,
      },
    ],
    banks: [],
    prefs: seed().prefs,
  };
};

function load(): MobileState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seed();
    const parsed = JSON.parse(raw) as Partial<MobileState>;
    if (typeof parsed.walletNgn !== 'number' || !Array.isArray(parsed.plans)) return seed();
    const base = seed();
    return {
      ...base,
      ...parsed,
      account: parsed.account ?? 'seed',
      profile: { ...base.profile, ...parsed.profile },
      prefs: { ...base.prefs, ...parsed.prefs },
    };
  } catch {
    return seed();
  }
}

export type MoneyResult = { ok: boolean; error?: string; txn?: Txn };
export type PlanResult = MoneyResult & { plan?: Plan };

type Store = MobileState & {
  total: number;
  savings: number;
  investNgn: number;
  investUsd: number;
  toast: string | null;
  notify: (message: string) => void;
  addMoney: (amount: number, source: string) => MoneyResult;
  withdraw: (amount: number, bankName: string) => MoneyResult;
  transfer: (amount: number, name: string) => MoneyResult;
  createPlan: (input: { name: string; kind: PlanKind; initial: number; target?: number; monthly?: number }) => PlanResult;
  planDeposit: (id: string, amount: number) => MoneyResult;
  planWithdraw: (id: string, amount: number) => MoneyResult;
  trade: (symbol: string, units: number, side: 'buy' | 'sell') => MoneyResult;
  markAllRead: () => void;
  setPref: <K extends keyof Prefs>(key: K, value: Prefs[K]) => void;
  reset: () => void;
  startFresh: (input: { name: string; email: string; phone: string }) => void;
  signInDemo: () => void;
  user: Profile;
};

const StoreContext = createContext<Store | null>(null);

const makeRef = (kind: string) => `APX-${kind}-${Math.floor(100000 + Math.random() * 899999)}`;

const planLook = (kind: PlanKind) =>
  kind === 'fixed'
    ? { color: '#760A81', pastel: '#F4CCF9', icon: 'lock', rate: 16 }
    : kind === 'target'
      ? { color: '#06720C', pastel: '#C3F3C6', icon: 'target', rate: 14 }
      : { color: '#1D52CE', pastel: '#A9CBFF', icon: 'bolt', rate: 12 };

const clock = () => new Date();

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<MobileState>(() => load());
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* demo continues in memory when storage is unavailable */
    }
  }, [state]);

  const notify = useCallback((message: string) => {
    setToast(message);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), 3400);
  }, []);

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    [],
  );

  const pushTxn = (txn: Txn) => (s: MobileState): Txn[] => [txn, ...s.txns];

  const addMoney = useCallback<Store['addMoney']>(
    (amount, source) => {
      if (!Number.isFinite(amount) || amount < 100) return { ok: false, error: 'Enter at least ₦100.' };
      if (amount > 10_000_000) return { ok: false, error: 'Demo funding is capped at ₦10,000,000 at a time.' };
      const txn: Txn = {
        id: `tx-${Date.now()}`,
        title: `Bank transfer from ${source}`,
        meta: 'Wallet funding · demo balance',
        amount,
        date: clock().toISOString(),
        status: 'Completed',
        type: 'deposit',
        ref: makeRef('DEP'),
      };
      setState((s) => ({ ...s, walletNgn: s.walletNgn + amount, txns: pushTxn(txn)(s) }));
      notify(`₦${amount.toLocaleString('en-NG')} added to your wallet`);
      return { ok: true, txn };
    },
    [notify],
  );

  const withdraw = useCallback<Store['withdraw']>(
    (amount, bankName) => {
      if (!Number.isFinite(amount) || amount < 100) return { ok: false, error: 'Enter at least ₦100.' };
      if (amount > state.walletNgn) return { ok: false, error: 'That is more than your available wallet balance.' };
      const txn: Txn = {
        id: `tx-${Date.now()}`,
        title: `Withdrawal to ${bankName}`,
        meta: 'Beneficiary bank · demo rails',
        amount: -amount,
        date: clock().toISOString(),
        status: 'Completed',
        type: 'withdrawal',
        ref: makeRef('WDR'),
      };
      setState((s) => ({ ...s, walletNgn: s.walletNgn - amount, txns: pushTxn(txn)(s) }));
      notify(`₦${amount.toLocaleString('en-NG')} sent to ${bankName}`);
      return { ok: true, txn };
    },
    [notify, state.walletNgn],
  );

  const transfer = useCallback<Store['transfer']>(
    (amount, name) => {
      if (!Number.isFinite(amount) || amount < 50) return { ok: false, error: 'Enter at least ₦50.' };
      if (amount > state.walletNgn) return { ok: false, error: 'That is more than your available wallet balance.' };
      if (!name.trim()) return { ok: false, error: 'Add a recipient name or Apex tag.' };
      const txn: Txn = {
        id: `tx-${Date.now()}`,
        title: `Transfer to ${name.trim()}`,
        meta: 'Apex wallet · instant',
        amount: -amount,
        date: clock().toISOString(),
        status: 'Completed',
        type: 'transfer',
        ref: makeRef('TRF'),
      };
      setState((s) => ({ ...s, walletNgn: s.walletNgn - amount, txns: pushTxn(txn)(s) }));
      notify(`₦${amount.toLocaleString('en-NG')} sent to ${name.trim()}`);
      return { ok: true, txn };
    },
    [notify, state.walletNgn],
  );

  const createPlan = useCallback<Store['createPlan']>(
    (input) => {
      if (!input.name.trim()) return { ok: false, error: 'Give the plan a name.' };
      if (!Number.isFinite(input.initial) || input.initial < 1000) return { ok: false, error: 'Start with at least ₦1,000.' };
      if (input.initial > state.walletNgn) return { ok: false, error: 'Your wallet does not have enough for that starting amount.' };
      if (input.kind === 'target' && (!input.target || input.target <= input.initial)) {
        return { ok: false, error: 'A target must be higher than the starting amount.' };
      }
      const now = clock();
      const maturity = new Date(now);
      maturity.setDate(maturity.getDate() + 90);
      const plan: Plan = {
        id: `plan-${Date.now()}`,
        name: input.name.trim(),
        kind: input.kind,
        balance: input.initial,
        target: input.kind === 'target' ? input.target : undefined,
        subtitle:
          input.kind === 'fixed'
            ? `90-day fixed deposit · matures ${maturity.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}`
            : input.kind === 'target'
              ? input.monthly
                ? `₦${input.monthly.toLocaleString('en-NG')} auto-save monthly`
                : 'Manual top-ups'
              : 'Withdraw anytime · interest paid monthly',
        opened: now.toISOString(),
        maturity: input.kind === 'fixed' ? maturity.toISOString() : undefined,
        monthly: input.monthly,
        ...planLook(input.kind),
      };
      const txn: Txn = {
        id: `tx-${Date.now()}`,
        title: plan.name,
        meta: `${input.kind === 'fixed' ? 'Fixed' : input.kind === 'target' ? 'Target' : 'Flexible'} savings · plan opened`,
        amount: -input.initial,
        date: now.toISOString(),
        status: 'Completed',
        type: 'savings',
        ref: makeRef('SAV'),
      };
      setState((s) => ({
        ...s,
        walletNgn: s.walletNgn - input.initial,
        plans: [plan, ...s.plans],
        txns: pushTxn(txn)(s),
      }));
      notify(`${plan.name} opened with ₦${input.initial.toLocaleString('en-NG')}`);
      return { ok: true, plan, txn };
    },
    [notify, state.walletNgn],
  );

  const planDeposit = useCallback<Store['planDeposit']>(
    (id, amount) => {
      const plan = state.plans.find((p) => p.id === id);
      if (!plan) return { ok: false, error: 'Plan not found.' };
      if (!Number.isFinite(amount) || amount < 100) return { ok: false, error: 'Enter at least ₦100.' };
      if (amount > state.walletNgn) return { ok: false, error: 'Your wallet does not have enough for this top-up.' };
      const txn: Txn = {
        id: `tx-${Date.now()}`,
        title: plan.name,
        meta: 'Savings top-up · from wallet',
        amount: -amount,
        date: clock().toISOString(),
        status: 'Completed',
        type: 'savings',
        ref: makeRef('SAV'),
      };
      setState((s) => ({
        ...s,
        walletNgn: s.walletNgn - amount,
        plans: s.plans.map((p) => (p.id === id ? { ...p, balance: p.balance + amount } : p)),
        txns: pushTxn(txn)(s),
      }));
      notify(`₦${amount.toLocaleString('en-NG')} added to ${plan.name}`);
      return { ok: true, txn };
    },
    [notify, state.plans, state.walletNgn],
  );

  const planWithdraw = useCallback<Store['planWithdraw']>(
    (id, amount) => {
      const plan = state.plans.find((p) => p.id === id);
      if (!plan) return { ok: false, error: 'Plan not found.' };
      if (plan.kind === 'fixed') {
        return { ok: false, error: 'This fixed plan is locked until maturity. Early access follows partner rules.' };
      }
      if (!Number.isFinite(amount) || amount < 100) return { ok: false, error: 'Enter at least ₦100.' };
      if (amount > plan.balance) return { ok: false, error: 'That is more than this plan holds.' };
      const txn: Txn = {
        id: `tx-${Date.now()}`,
        title: plan.name,
        meta: 'Savings withdrawal · to wallet',
        amount,
        date: clock().toISOString(),
        status: 'Completed',
        type: 'savings',
        ref: makeRef('SAV'),
      };
      setState((s) => ({
        ...s,
        walletNgn: s.walletNgn + amount,
        plans: s.plans.map((p) => (p.id === id ? { ...p, balance: p.balance - amount } : p)),
        txns: pushTxn(txn)(s),
      }));
      notify(`₦${amount.toLocaleString('en-NG')} moved to your wallet`);
      return { ok: true, txn };
    },
    [notify, state.plans],
  );

  const trade = useCallback<Store['trade']>(
    (symbol, units, side) => {
      const stock = stocks.find((s) => s.symbol === symbol);
      if (!stock) return { ok: false, error: 'Unknown instrument.' };
      if (!Number.isInteger(units) || units < 1) return { ok: false, error: 'Enter a whole number of units.' };
      const gross = units * stock.price;
      const fee = gross * 0.015;
      const holding = state.holdings.find((h) => h.symbol === symbol);
      const currency = stock.currency === 'USD' ? '$' : '₦';

      if (side === 'buy') {
        if (stock.currency === 'NGN' && gross + fee > state.walletNgn) {
          return { ok: false, error: 'Your naira wallet does not cover this order plus fees.' };
        }
        if (stock.currency === 'USD' && gross + fee > state.walletUsd) {
          return { ok: false, error: 'Your USD wallet does not cover this order plus fees.' };
        }
        const txn: Txn = {
          id: `tx-${Date.now()}`,
          title: `Bought ${units} ${symbol}`,
          meta: `Invest · ${stock.exchange} · fee ${currency}${fee.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
          amount: -Math.round((gross + fee) * (stock.currency === 'USD' ? 1600 : 1)),
          date: clock().toISOString(),
          status: 'Completed',
          type: 'invest',
          ref: makeRef('INV'),
        };
        setState((s) => {
          const existing = s.holdings.find((h) => h.symbol === symbol);
          const nextHoldings = existing
            ? s.holdings.map((h) =>
                h.symbol === symbol
                  ? {
                      ...h,
                      units: h.units + units,
                      avgCost: (h.avgCost * h.units + gross) / (h.units + units),
                      price: stock.price,
                      change: stock.change,
                    }
                  : h,
              )
            : [...s.holdings, { symbol, units, avgCost: stock.price, price: stock.price, change: stock.change }];
          return {
            ...s,
            holdings: nextHoldings,
            walletNgn: stock.currency === 'NGN' ? s.walletNgn - gross - fee : s.walletNgn,
            walletUsd: stock.currency === 'USD' ? s.walletUsd - gross - fee : s.walletUsd,
            txns: pushTxn(txn)(s),
          };
        });
        notify(`${units} ${symbol} bought at ${currency}${stock.price.toLocaleString('en-US')}`);
        return { ok: true, txn };
      }

      if (!holding || holding.units < units) {
        return { ok: false, error: `You only hold ${holding?.units ?? 0} unit${holding?.units === 1 ? '' : 's'} of ${symbol}.` };
      }
      const proceeds = gross - fee;
      const txn: Txn = {
        id: `tx-${Date.now()}`,
        title: `Sold ${units} ${symbol}`,
        meta: `Invest · ${stock.exchange} · settled to ${stock.currency} wallet`,
        amount: Math.round(proceeds * (stock.currency === 'USD' ? 1600 : 1)),
        date: clock().toISOString(),
        status: 'Completed',
        type: 'invest',
        ref: makeRef('INV'),
      };
      setState((s) => {
        const existing = s.holdings.find((h) => h.symbol === symbol)!;
        const nextHoldings =
          existing.units === units
            ? s.holdings.filter((h) => h.symbol !== symbol)
            : s.holdings.map((h) => (h.symbol === symbol ? { ...h, units: h.units - units, price: stock.price } : h));
        return {
          ...s,
          holdings: nextHoldings,
          walletNgn: stock.currency === 'NGN' ? s.walletNgn + proceeds : s.walletNgn,
          walletUsd: stock.currency === 'USD' ? s.walletUsd + proceeds : s.walletUsd,
          txns: pushTxn(txn)(s),
        };
      });
      notify(`${units} ${symbol} sold`);
      return { ok: true, txn };
    },
    [notify, state.holdings, state.walletNgn, state.walletUsd],
  );

  const markAllRead = useCallback(() => {
    setState((s) => ({ ...s, notifications: s.notifications.map((n) => ({ ...n, unread: false })) }));
  }, []);

  const setPref = useCallback(<K extends keyof Prefs>(key: K, value: Prefs[K]) => {
    setState((s) => ({ ...s, prefs: { ...s.prefs, [key]: value } }));
  }, []);

  const reset = useCallback(() => {
    setState(seed());
    notify('Demo account reset to its starting balances');
  }, [notify]);

  const startFresh = useCallback<Store['startFresh']>(
    (input) => {
      setState(freshAccount(input));
      notify(`Welcome to Apex, ${input.name.trim().split(/\s+/)[0]}`);
    },
    [notify],
  );

  const signInDemo = useCallback(() => {
    setState(seed());
    notify('Signed in to the demo account');
  }, [notify]);

  const savings = useMemo(() => state.plans.reduce((sum, p) => sum + p.balance, 0), [state.plans]);
  const investNgn = useMemo(
    () =>
      state.holdings.reduce((sum, h) => {
        const stock = stocks.find((s) => s.symbol === h.symbol);
        return stock && stock.currency === 'NGN' ? sum + h.units * stock.price : sum;
      }, 0),
    [state.holdings],
  );
  const investUsd = useMemo(
    () =>
      state.holdings.reduce((sum, h) => {
        const stock = stocks.find((s) => s.symbol === h.symbol);
        return stock && stock.currency === 'USD' ? sum + h.units * stock.price : sum;
      }, 0),
    [state.holdings],
  );

  const value = useMemo<Store>(
    () => ({
      ...state,
      user: state.profile,
      total: state.walletNgn + savings + investNgn,
      savings,
      investNgn,
      investUsd,
      toast,
      notify,
      addMoney,
      withdraw,
      transfer,
      createPlan,
      planDeposit,
      planWithdraw,
      trade,
      markAllRead,
      setPref,
      reset,
      startFresh,
      signInDemo,
    }),
    [state, savings, investNgn, investUsd, toast, notify, addMoney, withdraw, transfer, createPlan, planDeposit, planWithdraw, trade, markAllRead, setPref, reset, startFresh, signInDemo],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}

export const stockFor = (symbol: string): Stock | undefined => stocks.find((s) => s.symbol === symbol);
