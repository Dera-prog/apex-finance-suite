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
import type { Bank, Holding, Notification, Plan, PlanKind, Txn } from '@shared/data';

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
  bank: string;
  bankAccount: string;
  usStocksAccount: string;
  avatarTint: string;
};

export type AppState = {
  account: 'seed' | 'new';
  profile: Profile;
  walletNgn: number;
  walletUsd: number;
  investmentsNgn: number;
  investmentsUsd: number;
  plans: Plan[];
  holdings: Holding[];
  txns: Txn[];
  notifications: Notification[];
  banks: Bank[];
  biometric: boolean;
  priceAlerts: boolean;
  productNews: boolean;
  hideBalance: boolean;
  pinAlerts: boolean;
  emailAlerts: boolean;
  extHours: boolean;
};

const STORAGE_KEY = 'apex.desktop.v2';

const usdHoldings = () => seedHoldings.filter((h) => h.symbol === 'NVDA' || h.symbol === 'AAPL');

const seedProfile = (): Profile => ({ ...user, usStocksAccount: '••• ••• 4471' });

const seed = (): AppState => {
  const usdValue = usdHoldings().reduce((sum, h) => sum + h.units * h.price, 0);
  return {
    account: 'seed',
    profile: seedProfile(),
    walletNgn: wallet.ngn,
    walletUsd: wallet.usd,
    investmentsNgn: wallet.investments,
    investmentsUsd: usdValue,
    plans: initialPlans.map((p) => ({ ...p })),
    holdings: seedHoldings.map((h) => ({ ...h })),
    txns: seedTxns.map((t) => ({ ...t })),
    notifications: seedNotifications.map((n) => ({ ...n })),
    banks: seedBanks.map((b) => ({ ...b })),
    biometric: true,
    priceAlerts: true,
    productNews: false,
    hideBalance: false,
    pinAlerts: true,
    emailAlerts: true,
    extHours: false,
  };
};

const freshAccount = (input: { name: string; email: string; phone: string }): AppState => {
  const name = input.name.trim();
  const firstName = name.split(/\s+/)[0] || 'Friend';
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
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
      bank: 'No bank linked',
      bankAccount: '',
      usStocksAccount: 'Not issued yet',
      avatarTint: '#FFDCCE',
    },
    walletNgn: 0,
    walletUsd: 0,
    investmentsNgn: 0,
    investmentsUsd: 0,
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
    ...seedPrefs(),
  };
};

function seedPrefs() {
  return {
    biometric: true,
    priceAlerts: true,
    productNews: false,
    hideBalance: false,
    pinAlerts: true,
    emailAlerts: true,
    extHours: false,
  };
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seed();
    const parsed = JSON.parse(raw) as Partial<AppState>;
    if (typeof parsed.walletNgn !== 'number' || !Array.isArray(parsed.plans)) return seed();
    const base = seed();
    return {
      ...base,
      ...parsed,
      account: parsed.account ?? 'seed',
      profile: { ...base.profile, ...parsed.profile },
    };
  } catch {
    return seed();
  }
}

export type TradeResult = { ok: boolean; error?: string; message?: string };

type Store = AppState & {
  total: number;
  savings: number;
  investmentValue: number;
  toast: string | null;
  notify: (message: string) => void;
  addMoney: (amount: number, source: string) => TradeResult;
  withdraw: (amount: number, bankName: string) => TradeResult;
  transfer: (amount: number, name: string) => TradeResult;
  createPlan: (input: { name: string; kind: PlanKind; initial: number; target?: number; monthly?: number }) => TradeResult;
  planDeposit: (id: string, amount: number) => TradeResult;
  planWithdraw: (id: string, amount: number) => TradeResult;
  trade: (symbol: string, units: number, side: 'buy' | 'sell') => TradeResult;
  markAllRead: () => void;
  toggleSetting: (key: 'biometric' | 'priceAlerts' | 'productNews' | 'pinAlerts' | 'emailAlerts' | 'extHours') => void;
  toggleBalance: () => void;
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

const monthName = (d: Date) => d.toLocaleDateString('en-NG', { month: 'long' });
const USD_NGN = 1600;

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => load());
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage may be unavailable; the demo still works in memory */
    }
  }, [state]);

  const notify = useCallback((message: string) => {
    setToast(message);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), 3200);
  }, []);

  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
  }, []);

  const addMoney = useCallback<Store['addMoney']>((amount, source) => {
    if (!Number.isFinite(amount) || amount < 100) return { ok: false, error: 'Enter at least ₦100.' };
    if (amount > 10_000_000) return { ok: false, error: 'Demo funding is capped at ₦10,000,000 per transfer.' };
    setState((s) => ({
      ...s,
      walletNgn: s.walletNgn + amount,
      txns: [
        {
          id: `tx-${Date.now()}`,
          title: `Bank transfer from ${source}`,
          meta: 'Wallet funding · demo balance',
          amount,
          date: new Date().toISOString(),
          status: 'Completed',
          type: 'deposit',
          ref: makeRef('DEP'),
        },
        ...s.txns,
      ],
    }));
    notify(`₦${amount.toLocaleString('en-NG')} added to your wallet`);
    return { ok: true };
  }, [notify]);

  const withdraw = useCallback<Store['withdraw']>((amount, bankName) => {
    if (!Number.isFinite(amount) || amount < 100) return { ok: false, error: 'Enter at least ₦100.' };
    if (amount > state.walletNgn) return { ok: false, error: 'Amount is more than your available wallet balance.' };
    setState((s) => ({
      ...s,
      walletNgn: s.walletNgn - amount,
      txns: [
        {
          id: `tx-${Date.now()}`,
          title: `Withdrawal to ${bankName}`,
          meta: 'Beneficiary bank · demo rails',
          amount: -amount,
          date: new Date().toISOString(),
          status: 'Completed',
          type: 'withdrawal',
          ref: makeRef('WDR'),
        },
        ...s.txns,
      ],
    }));
    notify(`₦${amount.toLocaleString('en-NG')} sent to ${bankName}`);
    return { ok: true };
  }, [notify, state.walletNgn]);

  const transfer = useCallback<Store['transfer']>((amount, name) => {
    if (!Number.isFinite(amount) || amount < 50) return { ok: false, error: 'Enter at least ₦50.' };
    if (amount > state.walletNgn) return { ok: false, error: 'Amount is more than your available wallet balance.' };
    if (!name.trim()) return { ok: false, error: 'Add a recipient name or Apex tag.' };
    setState((s) => ({
      ...s,
      walletNgn: s.walletNgn - amount,
      txns: [
        {
          id: `tx-${Date.now()}`,
          title: `Transfer to ${name.trim()}`,
          meta: 'Apex wallet · instant',
          amount: -amount,
          date: new Date().toISOString(),
          status: 'Completed',
          type: 'transfer',
          ref: makeRef('TRF'),
        },
        ...s.txns,
      ],
    }));
    notify(`₦${amount.toLocaleString('en-NG')} sent to ${name.trim()}`);
    return { ok: true };
  }, [notify, state.walletNgn]);

  const createPlan = useCallback<Store['createPlan']>((input) => {
    const initial = input.initial;
    if (!input.name.trim()) return { ok: false, error: 'Give the plan a name.' };
    if (!Number.isFinite(initial) || initial < 1000) return { ok: false, error: 'Start with at least ₦1,000.' };
    if (initial > state.walletNgn) return { ok: false, error: 'Your wallet does not have enough for that starting amount.' };
    if (input.kind === 'target' && (!input.target || input.target <= initial)) {
      return { ok: false, error: 'A target must be higher than the starting amount.' };
    }
    const look = planLook(input.kind);
    const now = new Date();
    const maturity = new Date(now);
    maturity.setDate(maturity.getDate() + 90);
    const plan: Plan = {
      id: `plan-${Date.now()}`,
      name: input.name.trim(),
      kind: input.kind,
      balance: initial,
      target: input.kind === 'target' ? input.target : undefined,
      subtitle:
        input.kind === 'fixed'
          ? `90-day fixed deposit · matures ${maturity.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}`
          : input.kind === 'target'
            ? `${input.monthly ? `₦${input.monthly.toLocaleString('en-NG')} auto-save monthly` : 'Manual top-ups'}`
            : 'Withdraw anytime · interest paid monthly',
      opened: now.toISOString(),
      maturity: input.kind === 'fixed' ? maturity.toISOString() : undefined,
      monthly: input.monthly,
      ...look,
    };
    setState((s) => ({
      ...s,
      walletNgn: s.walletNgn - initial,
      plans: [plan, ...s.plans],
      txns: [
        {
          id: `tx-${Date.now()}`,
          title: plan.name,
          meta: `${input.kind === 'fixed' ? 'Fixed' : input.kind === 'target' ? 'Target' : 'Flexible'} savings · plan opened`,
          amount: -initial,
          date: now.toISOString(),
          status: 'Completed',
          type: 'savings',
          ref: makeRef('SAV'),
        },
        ...s.txns,
      ],
    }));
    notify(`${plan.name} opened with ₦${initial.toLocaleString('en-NG')}`);
    return { ok: true };
  }, [notify, state.walletNgn]);

  const planDeposit = useCallback<Store['planDeposit']>((id, amount) => {
    if (!Number.isFinite(amount) || amount < 100) return { ok: false, error: 'Enter at least ₦100.' };
    if (amount > state.walletNgn) return { ok: false, error: 'Your wallet does not have enough for this top-up.' };
    const plan = state.plans.find((p) => p.id === id);
    if (!plan) return { ok: false, error: 'Plan not found.' };
    setState((s) => ({
      ...s,
      walletNgn: s.walletNgn - amount,
      plans: s.plans.map((p) => (p.id === id ? { ...p, balance: p.balance + amount } : p)),
      txns: [
        {
          id: `tx-${Date.now()}`,
          title: plan.name,
          meta: 'Savings top-up · from wallet',
          amount: -amount,
          date: new Date().toISOString(),
          status: 'Completed',
          type: 'savings',
          ref: makeRef('SAV'),
        },
        ...s.txns,
      ],
    }));
    notify(`₦${amount.toLocaleString('en-NG')} added to ${plan.name}`);
    return { ok: true };
  }, [notify, state.plans, state.walletNgn]);

  const planWithdraw = useCallback<Store['planWithdraw']>((id, amount) => {
    const plan = state.plans.find((p) => p.id === id);
    if (!plan) return { ok: false, error: 'Plan not found.' };
    if (plan.kind === 'fixed') {
      return { ok: false, error: 'This fixed plan is locked until its maturity date. Early access rules apply.' };
    }
    if (!Number.isFinite(amount) || amount < 100) return { ok: false, error: 'Enter at least ₦100.' };
    if (amount > plan.balance) return { ok: false, error: 'Amount is more than this plan balance.' };
    setState((s) => ({
      ...s,
      walletNgn: s.walletNgn + amount,
      plans: s.plans.map((p) => (p.id === id ? { ...p, balance: p.balance - amount } : p)),
      txns: [
        {
          id: `tx-${Date.now()}`,
          title: plan.name,
          meta: 'Savings withdrawal · to wallet',
          amount,
          date: new Date().toISOString(),
          status: 'Completed',
          type: 'savings',
          ref: makeRef('SAV'),
        },
        ...s.txns,
      ],
    }));
    notify(`₦${amount.toLocaleString('en-NG')} moved from ${plan.name} to your wallet`);
    return { ok: true };
  }, [notify, state.plans]);

  const trade = useCallback<Store['trade']>((symbol, units, side) => {
    const stock = stocks.find((s) => s.symbol === symbol);
    if (!stock) return { ok: false, error: 'Unknown instrument.' };
    if (!Number.isInteger(units) || units < 1) return { ok: false, error: 'Enter a whole number of units.' };
    const gross = units * stock.price;
    const fee = gross * 0.015;
    const total = gross + fee;
    const holding = state.holdings.find((h) => h.symbol === symbol);

    if (side === 'buy') {
      if (stock.currency === 'NGN' && total > state.walletNgn) {
        return { ok: false, error: 'Your naira wallet does not have enough for this order.' };
      }
      if (stock.currency === 'USD' && total > state.walletUsd) {
        return { ok: false, error: 'Your USD wallet does not have enough for this order.' };
      }
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
          walletNgn: stock.currency === 'NGN' ? s.walletNgn - total : s.walletNgn,
          walletUsd: stock.currency === 'USD' ? Math.max(0, s.walletUsd - total) : s.walletUsd,
          investmentsNgn: stock.currency === 'NGN' ? s.investmentsNgn + gross : s.investmentsNgn,
          investmentsUsd: stock.currency === 'USD' ? s.investmentsUsd + gross : s.investmentsUsd,
          txns: [
            {
              id: `tx-${Date.now()}`,
              title: `Bought ${units} ${symbol}`,
              meta: `Invest · ${stock.exchange} · fee ${stock.currency === 'USD' ? '$' : '₦'}${fee.toLocaleString('en-US', { maximumFractionDigits: 0 })}${stock.currency === 'USD' ? ' · NGN equivalent' : ''}`,
              amount: -Math.round(total * (stock.currency === 'USD' ? USD_NGN : 1)),
              date: new Date().toISOString(),
              status: 'Completed',
              type: 'invest',
              ref: makeRef('INV'),
            },
            ...s.txns,
          ],
        };
      });
      notify(`${units} ${symbol} bought at ${stock.currency === 'NGN' ? '₦' : '$'}${stock.price.toLocaleString('en-US')}`);
      return { ok: true };
    }

    if (!holding || holding.units < units) {
      return { ok: false, error: `You only hold ${holding?.units ?? 0} unit${holding?.units === 1 ? '' : 's'} of ${symbol}.` };
    }
    const proceeds = gross - fee;
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
        investmentsNgn: stock.currency === 'NGN' ? Math.max(0, s.investmentsNgn - gross) : s.investmentsNgn,
        investmentsUsd: stock.currency === 'USD' ? Math.max(0, s.investmentsUsd - gross) : s.investmentsUsd,
        txns: [
          {
            id: `tx-${Date.now()}`,
            title: `Sold ${units} ${symbol}`,
            meta: `Invest · ${stock.exchange} · settled to ${stock.currency} wallet${stock.currency === 'USD' ? ' · NGN equivalent' : ''}`,
            amount: Math.round(proceeds * (stock.currency === 'USD' ? USD_NGN : 1)),
            date: new Date().toISOString(),
            status: 'Completed',
            type: 'invest',
            ref: makeRef('INV'),
          },
          ...s.txns,
        ],
      };
    });
    notify(`${units} ${symbol} sold`);
    return { ok: true };
  }, [notify, state.holdings, state.walletNgn, state.walletUsd]);

  const markAllRead = useCallback(() => {
    setState((s) => ({ ...s, notifications: s.notifications.map((n) => ({ ...n, unread: false })) }));
  }, []);

  const toggleSetting = useCallback<Store['toggleSetting']>((key) => {
    setState((s) => ({ ...s, [key]: !s[key] }));
  }, []);

  const reset = useCallback(() => {
    const fresh = seed();
    setState(fresh);
    notify('Demo account reset to its starting balances');
  }, [notify]);

  const startFresh = useCallback<Store['startFresh']>((input) => {
    setState(freshAccount(input));
    notify('Account created. Add money to get started.');
  }, [notify]);

  const signInDemo = useCallback(() => {
    setState(seed());
    notify('Signed in to the demo account');
  }, [notify]);

  const toggleBalance = useCallback(() => {
    setState((s) => ({ ...s, hideBalance: !s.hideBalance }));
  }, []);

  const savings = useMemo(() => state.plans.reduce((sum, p) => sum + p.balance, 0), [state.plans]);
  const investmentValue = useMemo(
    () =>
      state.holdings.reduce((sum, h) => {
        const stock = stocks.find((s) => s.symbol === h.symbol);
        if (!stock || stock.currency === 'USD') return sum;
        return sum + h.units * stock.price;
      }, 0),
    [state.holdings],
  );

  const value = useMemo<Store>(
    () => ({
      ...state,
      user: state.profile,
      total: state.walletNgn + savings + state.investmentsNgn,
      savings,
      investmentValue,
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
      toggleSetting,
      toggleBalance,
      reset,
      startFresh,
      signInDemo,
    }),
    [state, savings, investmentValue, toast, notify, addMoney, withdraw, transfer, createPlan, planDeposit, planWithdraw, trade, markAllRead, toggleSetting, toggleBalance, reset, startFresh, signInDemo],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}

export const monthLabel = (date: string) => monthName(new Date(date));
