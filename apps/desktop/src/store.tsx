import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { stocks, user } from '@shared/data';
import type { PlanKind } from '@shared/data';
import { API } from '@shared/api';
import {
  depositToLedger,
  fundPlanInLedger,
  requestSignInCode as requestSignInCodeApi,
  signOutLedger,
  syncLedgerState,
  tradeInLedger,
  verifySignInCode as verifySignInCodeApi,
} from '@shared/client';
import type { MobileStateResponse, PlanDto, Profile as ApiProfile, TxnDto } from '@shared/api';
import { demoMobileState } from '@shared/demo-state';
import { add, formatNgn, neg, pctOf, roundMinor, sub, sum, times, toMinor } from '@shared/money';
import type { Minor } from '@shared/money';

export type Profile = ApiProfile & { bank: string };

type Prefs = {
  biometric: boolean;
  priceAlerts: boolean;
  productNews: boolean;
  hideBalance: boolean;
  pinAlerts: boolean;
  emailAlerts: boolean;
  extHours: boolean;
  darkMode: boolean;
};

type PrefKey = 'biometric' | 'priceAlerts' | 'productNews' | 'pinAlerts' | 'emailAlerts' | 'extHours' | 'darkMode';

export type DesktopState = Omit<MobileStateResponse, 'profile'> & { profile: Profile } & Prefs;

const STORAGE_KEY = 'apex.desktop.v2';
const SESSION_KEY = 'apex.session.v1';

type Session = { token: string };

function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Session>;
    return typeof parsed.token === 'string' && parsed.token.length > 0 ? { token: parsed.token } : null;
  } catch {
    return null;
  }
}

export const hasStoredSession = () => loadSession() !== null;

const MIN_DEPOSIT = toMinor(100);
const MIN_TRANSFER = toMinor(50);
const MAX_FUNDING = toMinor(10_000_000);
const MIN_PLAN_OPENING = toMinor(1_000);
const DEMO_NGN_PER_USD = 1600;

const API_BASE = (import.meta.env.VITE_API_BASE ?? '').replace(/\/+$/, '');

async function fetchRemoteState(): Promise<MobileStateResponse | null> {
  try {
    const res = await fetch(`${API_BASE}${API.demoState}`, { headers: { accept: 'application/json' } });
    if (!res.ok) return null;
    return (await res.json()) as MobileStateResponse;
  } catch {
    return null;
  }
}

const prefersDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches;

const prefsOf = (s: DesktopState): Prefs => ({
  biometric: s.biometric,
  priceAlerts: s.priceAlerts,
  productNews: s.productNews,
  hideBalance: s.hideBalance,
  pinAlerts: s.pinAlerts,
  emailAlerts: s.emailAlerts,
  extHours: s.extHours,
  darkMode: s.darkMode,
});

function seedPrefs(): Prefs {
  return {
    biometric: true,
    priceAlerts: true,
    productNews: false,
    hideBalance: false,
    pinAlerts: true,
    emailAlerts: true,
    extHours: false,
    darkMode: prefersDark(),
  };
}

const seed = (): DesktopState => {
  const base = demoMobileState();
  return { ...base, profile: { ...base.profile, bank: user.bank }, ...seedPrefs() };
};

const freshAccount = (input: { name: string; email: string; phone: string }): DesktopState => {
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
    walletNgnKobo: toMinor(0),
    walletUsdCents: toMinor(0),
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

function load(): { state: DesktopState; stored: boolean } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { state: seed(), stored: false };
    const parsed = JSON.parse(raw) as Partial<DesktopState>;
    if (typeof parsed.walletNgnKobo !== 'number' || !Array.isArray(parsed.plans)) {
      return { state: seed(), stored: false };
    }
    const base = seed();
    return {
      state: {
        ...base,
        ...parsed,
        account: parsed.account ?? 'seed',
        profile: { ...base.profile, ...parsed.profile },
      },
      stored: true,
    };
  } catch {
    return { state: seed(), stored: false };
  }
}

export type TradeResult = { ok: boolean; error?: string };
export type SignInResult = { ok: boolean; error?: string; challengeId?: string; devCode?: string; offline?: boolean };
export type VerifySignInInput = {
  challengeId?: string;
  code: string;
  name?: string;
  email?: string;
  phone?: string;
  mode: 'signup' | 'signin';
};

type Store = DesktopState & {
  total: Minor;
  savings: Minor;
  investNgn: Minor;
  investUsd: Minor;
  toast: string | null;
  notify: (message: string) => void;
  addMoney: (amount: Minor, source: string) => Promise<TradeResult>;
  withdraw: (amount: Minor, bankName: string) => TradeResult;
  transfer: (amount: Minor, name: string) => TradeResult;
  createPlan: (input: { name: string; kind: PlanKind; initial: Minor; target?: Minor; monthly?: Minor }) => TradeResult;
  planDeposit: (id: string, amount: Minor) => Promise<TradeResult>;
  planWithdraw: (id: string, amount: Minor) => TradeResult;
  trade: (symbol: string, units: number, side: 'buy' | 'sell') => Promise<TradeResult>;
  markAllRead: () => void;
  toggleSetting: (key: PrefKey) => void;
  toggleBalance: () => void;
  reset: () => void;
  startFresh: (input: { name: string; email: string; phone: string }) => void;
  signInDemo: () => void;
  requestSignInCode: (phone: string) => Promise<SignInResult>;
  verifySignInCode: (input: VerifySignInInput) => Promise<{ ok: boolean; error?: string }>;
  signOutAccount: () => Promise<void>;
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

export function StoreProvider({ children }: { children: ReactNode }) {
  const [boot] = useState(load);
  const [state, setState] = useState<DesktopState>(boot.state);
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<number | null>(null);
  const sessionRef = useRef<Session | null>(loadSession());

  const setSession = useCallback((session: Session | null) => {
    sessionRef.current = session;
    try {
      if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      else localStorage.removeItem(SESSION_KEY);
    } catch {
      /* storage is optional */
    }
  }, []);

  useEffect(() => {
    if (boot.stored || sessionRef.current) return;
    let alive = true;
    void fetchRemoteState().then((remote) => {
      if (alive && remote) setState((current) => ({ ...remote, profile: { ...remote.profile, bank: user.bank }, ...prefsOf(current) }));
    });
    return () => {
      alive = false;
    };
  }, [boot.stored]);

  useEffect(() => {
    const token = sessionRef.current?.token;
    if (!token) return;
    let alive = true;
    void syncLedgerState(API_BASE, token).then((outcome) => {
      if (!alive) return;
      if (outcome.status === 'ok') {
        setState((current) => ({
          ...outcome.state,
          profile: { ...outcome.state.profile, bank: user.bank },
          ...prefsOf(current),
        }));
      } else if (outcome.status === 'unauthorized') {
        setSession(null);
      }
    });
    return () => {
      alive = false;
    };
  }, [setSession]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage may be unavailable; the demo still works in memory */
    }
  }, [state]);

  useEffect(() => {
    const root = document.documentElement;
    const dark = state.darkMode;
    root.dataset.theme = dark ? 'dark' : 'light';
    root.style.colorScheme = dark ? 'dark' : 'light';
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', dark ? '#050F2C' : '#F5F6F8');
  }, [state.darkMode]);

  const notify = useCallback((message: string) => {
    setToast(message);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), 3200);
  }, []);

  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
  }, []);

  const pushTxn = (txn: TxnDto) => (s: DesktopState): TxnDto[] => [txn, ...s.txns];

  const addMoney = useCallback<Store['addMoney']>(async (amount, source) => {
    if (!Number.isInteger(amount) || amount < MIN_DEPOSIT) return { ok: false, error: 'Enter at least ₦100.' };
    if (amount > MAX_FUNDING) return { ok: false, error: 'Demo funding is capped at ₦10,000,000 per transfer.' };
    const ref = makeRef('DEP');
    let recorded: TxnDto | undefined;

    if (sessionRef.current?.token || state.account === 'seed') {
      const outcome = await depositToLedger(API_BASE, { amountMinor: amount, source: source.trim(), reference: ref }, sessionRef.current?.token);
      if (outcome.status === 'rejected') return { ok: false, error: outcome.error };
      if (outcome.status === 'ok') recorded = outcome.state.txns.find((t) => t.ref === ref);
    }

    const txn: TxnDto = recorded ?? {
      id: `tx-${Date.now()}`,
      title: `Bank transfer from ${source}`,
      meta: 'Wallet funding · demo balance',
      amountKobo: amount,
      date: new Date().toISOString(),
      status: 'Completed',
      type: 'deposit',
      ref,
    };
    setState((s) => ({ ...s, walletNgnKobo: add(s.walletNgnKobo, amount), txns: pushTxn(txn)(s) }));
    notify(`${formatNgn(amount)} added to your wallet`);
    return { ok: true };
  }, [notify, state.account]);

  const withdraw = useCallback<Store['withdraw']>((amount, bankName) => {
    if (!Number.isInteger(amount) || amount < MIN_DEPOSIT) return { ok: false, error: 'Enter at least ₦100.' };
    if (amount > state.walletNgnKobo) return { ok: false, error: 'Amount is more than your available wallet balance.' };
    const txn: TxnDto = {
      id: `tx-${Date.now()}`,
      title: `Withdrawal to ${bankName}`,
      meta: 'Beneficiary bank · demo rails',
      amountKobo: neg(amount),
      date: new Date().toISOString(),
      status: 'Completed',
      type: 'withdrawal',
      ref: makeRef('WDR'),
    };
    setState((s) => ({ ...s, walletNgnKobo: sub(s.walletNgnKobo, amount), txns: pushTxn(txn)(s) }));
    notify(`${formatNgn(amount)} sent to ${bankName}`);
    return { ok: true };
  }, [notify, state.walletNgnKobo]);

  const transfer = useCallback<Store['transfer']>((amount, name) => {
    if (!Number.isInteger(amount) || amount < MIN_TRANSFER) return { ok: false, error: 'Enter at least ₦50.' };
    if (amount > state.walletNgnKobo) return { ok: false, error: 'Amount is more than your available wallet balance.' };
    if (!name.trim()) return { ok: false, error: 'Add a recipient name or Apex tag.' };
    const txn: TxnDto = {
      id: `tx-${Date.now()}`,
      title: `Transfer to ${name.trim()}`,
      meta: 'Apex wallet · instant',
      amountKobo: neg(amount),
      date: new Date().toISOString(),
      status: 'Completed',
      type: 'transfer',
      ref: makeRef('TRF'),
    };
    setState((s) => ({ ...s, walletNgnKobo: sub(s.walletNgnKobo, amount), txns: pushTxn(txn)(s) }));
    notify(`${formatNgn(amount)} sent to ${name.trim()}`);
    return { ok: true };
  }, [notify, state.walletNgnKobo]);

  const createPlan = useCallback<Store['createPlan']>((input) => {
    if (!input.name.trim()) return { ok: false, error: 'Give the plan a name.' };
    if (!Number.isInteger(input.initial) || input.initial < MIN_PLAN_OPENING) {
      return { ok: false, error: 'Start with at least ₦1,000.' };
    }
    if (input.initial > state.walletNgnKobo) return { ok: false, error: 'Your wallet does not have enough for that starting amount.' };
    if (input.kind === 'target' && (!input.target || input.target <= input.initial)) {
      return { ok: false, error: 'A target must be higher than the starting amount.' };
    }
    const now = new Date();
    const maturity = new Date(now);
    maturity.setDate(maturity.getDate() + 90);
    const plan: PlanDto = {
      id: `plan-${Date.now()}`,
      name: input.name.trim(),
      kind: input.kind,
      balanceKobo: input.initial,
      targetKobo: input.kind === 'target' ? input.target : undefined,
      subtitle:
        input.kind === 'fixed'
          ? `90-day fixed deposit · matures ${maturity.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}`
          : input.kind === 'target'
            ? `${input.monthly ? `${formatNgn(input.monthly)} auto-save monthly` : 'Manual top-ups'}`
            : 'Withdraw anytime · interest paid monthly',
      opened: now.toISOString(),
      maturity: input.kind === 'fixed' ? maturity.toISOString() : undefined,
      monthlyKobo: input.monthly,
      ...planLook(input.kind),
    };
    const txn: TxnDto = {
      id: `tx-${Date.now()}`,
      title: plan.name,
      meta: `${input.kind === 'fixed' ? 'Fixed' : input.kind === 'target' ? 'Target' : 'Flexible'} savings · plan opened`,
      amountKobo: neg(input.initial),
      date: now.toISOString(),
      status: 'Completed',
      type: 'savings',
      ref: makeRef('SAV'),
    };
    setState((s) => ({
      ...s,
      walletNgnKobo: sub(s.walletNgnKobo, input.initial),
      plans: [plan, ...s.plans],
      txns: pushTxn(txn)(s),
    }));
    notify(`${plan.name} opened with ${formatNgn(input.initial)}`);
    return { ok: true };
  }, [notify, state.walletNgnKobo]);

  const planDeposit = useCallback<Store['planDeposit']>(async (id, amount) => {
    const plan = state.plans.find((p) => p.id === id);
    if (!plan) return { ok: false, error: 'Plan not found.' };
    if (!Number.isInteger(amount) || amount < MIN_DEPOSIT) return { ok: false, error: 'Enter at least ₦100.' };
    if (amount > state.walletNgnKobo) return { ok: false, error: 'Your wallet does not have enough for this top-up.' };
    const ref = makeRef('SAV');
    let recorded: TxnDto | undefined;

    if (sessionRef.current?.token || state.account === 'seed') {
      const outcome = await fundPlanInLedger(API_BASE, id, { amountMinor: amount, reference: ref }, sessionRef.current?.token);
      if (outcome.status === 'rejected' && outcome.code !== 'unknown_plan') return { ok: false, error: outcome.error };
      if (outcome.status === 'ok') recorded = outcome.state.txns.find((t) => t.ref === ref);
    }

    const txn: TxnDto = recorded ?? {
      id: `tx-${Date.now()}`,
      title: plan.name,
      meta: 'Savings top-up · from wallet',
      amountKobo: neg(amount),
      date: new Date().toISOString(),
      status: 'Completed',
      type: 'savings',
      ref,
    };
    setState((s) => ({
      ...s,
      walletNgnKobo: sub(s.walletNgnKobo, amount),
      plans: s.plans.map((p) => (p.id === id ? { ...p, balanceKobo: add(p.balanceKobo, amount) } : p)),
      txns: pushTxn(txn)(s),
    }));
    notify(`${formatNgn(amount)} added to ${plan.name}`);
    return { ok: true };
  }, [notify, state.account, state.plans, state.walletNgnKobo]);

  const planWithdraw = useCallback<Store['planWithdraw']>((id, amount) => {
    const plan = state.plans.find((p) => p.id === id);
    if (!plan) return { ok: false, error: 'Plan not found.' };
    if (plan.kind === 'fixed') {
      return { ok: false, error: 'This fixed plan is locked until its maturity date. Early access rules apply.' };
    }
    if (!Number.isInteger(amount) || amount < MIN_DEPOSIT) return { ok: false, error: 'Enter at least ₦100.' };
    if (amount > plan.balanceKobo) return { ok: false, error: 'Amount is more than this plan balance.' };
    const txn: TxnDto = {
      id: `tx-${Date.now()}`,
      title: plan.name,
      meta: 'Savings withdrawal · to wallet',
      amountKobo: amount,
      date: new Date().toISOString(),
      status: 'Completed',
      type: 'savings',
      ref: makeRef('SAV'),
    };
    setState((s) => ({
      ...s,
      walletNgnKobo: add(s.walletNgnKobo, amount),
      plans: s.plans.map((p) => (p.id === id ? { ...p, balanceKobo: sub(p.balanceKobo, amount) } : p)),
      txns: pushTxn(txn)(s),
    }));
    notify(`${formatNgn(amount)} moved from ${plan.name} to your wallet`);
    return { ok: true };
  }, [notify, state.plans]);

  const trade = useCallback<Store['trade']>(async (symbol, units, side) => {
    const stock = stocks.find((s) => s.symbol === symbol);
    if (!stock) return { ok: false, error: 'Unknown instrument.' };
    if (!Number.isInteger(units) || units < 1) return { ok: false, error: 'Enter a whole number of units.' };
    const isUsd = stock.currency === 'USD';
    const gross = toMinor(units * stock.price);
    const fee = pctOf(gross, 1.5);
    const cost = add(gross, fee);
    const proceeds = sub(gross, fee);
    const holding = state.holdings.find((h) => h.symbol === symbol);
    const priceText = isUsd ? `$${stock.price.toLocaleString('en-US')}` : formatNgn(toMinor(stock.price));

    if (side === 'buy') {
      const wallet = isUsd ? state.walletUsdCents : state.walletNgnKobo;
      if (cost > wallet) {
        return {
          ok: false,
          error: isUsd
            ? 'Your USD wallet does not cover this order plus fees.'
            : 'Your naira wallet does not cover this order plus fees.',
        };
      }
    } else if (!holding || holding.units < units) {
      return { ok: false, error: `You only hold ${holding?.units ?? 0} unit${holding?.units === 1 ? '' : 's'} of ${symbol}.` };
    }

    const ref = makeRef('INV');
    let recorded: TxnDto | undefined;

    if (sessionRef.current?.token || state.account === 'seed') {
      const outcome = await tradeInLedger(API_BASE, { symbol, units, side, reference: ref }, sessionRef.current?.token);
      if (outcome.status === 'rejected') return { ok: false, error: outcome.error };
      if (outcome.status === 'ok') recorded = outcome.state.txns.find((t) => t.ref === ref);
    }

    if (side === 'buy') {
      const txn: TxnDto = recorded ?? {
        id: `tx-${Date.now()}`,
        title: `Bought ${units} ${symbol}`,
        meta: `Invest · ${stock.exchange} · fee ${formatNgn(fee, 2)}${isUsd ? ' · NGN equivalent' : ''}`,
        amountKobo: neg(isUsd ? times(DEMO_NGN_PER_USD, cost) : cost),
        date: new Date().toISOString(),
        status: 'Completed',
        type: 'invest',
        ref,
      };
      setState((s) => {
        const existing = s.holdings.find((h) => h.symbol === symbol);
        const nextHoldings = existing
          ? s.holdings.map((h) =>
              h.symbol === symbol
                ? {
                    ...h,
                    units: h.units + units,
                    avgCostMinor: roundMinor((h.avgCostMinor * h.units + gross) / (h.units + units)),
                    priceMinor: toMinor(stock.price),
                    change: stock.change,
                  }
                : h,
            )
          : [
              ...s.holdings,
              {
                symbol,
                units,
                currency: isUsd ? ('USD' as const) : ('NGN' as const),
                avgCostMinor: toMinor(stock.price),
                priceMinor: toMinor(stock.price),
                change: stock.change,
              },
            ];
        return {
          ...s,
          holdings: nextHoldings,
          walletNgnKobo: isUsd ? s.walletNgnKobo : sub(s.walletNgnKobo, cost),
          walletUsdCents: isUsd ? sub(s.walletUsdCents, cost) : s.walletUsdCents,
          txns: pushTxn(txn)(s),
        };
      });
      notify(`${units} ${symbol} bought at ${priceText}`);
      return { ok: true };
    }

    const txn: TxnDto = recorded ?? {
      id: `tx-${Date.now()}`,
      title: `Sold ${units} ${symbol}`,
      meta: `Invest · ${stock.exchange} · settled to ${stock.currency} wallet${isUsd ? ' · NGN equivalent' : ''}`,
      amountKobo: isUsd ? times(DEMO_NGN_PER_USD, proceeds) : proceeds,
      date: new Date().toISOString(),
      status: 'Completed',
      type: 'invest',
      ref,
    };
    setState((s) => {
      const existing = s.holdings.find((h) => h.symbol === symbol)!;
      const nextHoldings =
        existing.units === units
          ? s.holdings.filter((h) => h.symbol !== symbol)
          : s.holdings.map((h) => (h.symbol === symbol ? { ...h, units: h.units - units, priceMinor: toMinor(stock.price) } : h));
      return {
        ...s,
        holdings: nextHoldings,
        walletNgnKobo: isUsd ? s.walletNgnKobo : add(s.walletNgnKobo, proceeds),
        walletUsdCents: isUsd ? add(s.walletUsdCents, proceeds) : s.walletUsdCents,
        txns: pushTxn(txn)(s),
      };
    });
    notify(`${units} ${symbol} sold`);
    return { ok: true };
  }, [notify, state.account, state.holdings, state.walletNgnKobo, state.walletUsdCents]);

  const markAllRead = useCallback(() => {
    setState((s) => ({ ...s, notifications: s.notifications.map((n) => ({ ...n, unread: false })) }));
  }, []);

  const toggleSetting = useCallback<Store['toggleSetting']>((key) => {
    setState((s) => ({ ...s, [key]: !s[key] }));
  }, []);

  const toggleBalance = useCallback(() => {
    setState((s) => ({ ...s, hideBalance: !s.hideBalance }));
  }, []);

  const reset = useCallback(() => {
    setState((s) => ({ ...seed(), darkMode: s.darkMode }));
    notify('Demo account reset to its starting balances');
    void fetchRemoteState().then((remote) => {
      if (remote) setState((current) => ({ ...remote, profile: { ...remote.profile, bank: user.bank }, ...prefsOf(current) }));
    });
  }, [notify]);

  const startFresh = useCallback<Store['startFresh']>((input) => {
    setState((s) => ({ ...freshAccount(input), darkMode: s.darkMode }));
    notify('Account created. Add money to get started.');
  }, [notify]);

  const signInDemo = useCallback(() => {
    setState((s) => ({ ...seed(), darkMode: s.darkMode }));
    notify('Signed in to the demo account');
    void fetchRemoteState().then((remote) => {
      if (remote) setState((current) => ({ ...remote, profile: { ...remote.profile, bank: user.bank }, ...prefsOf(current) }));
    });
  }, [notify]);

  const requestSignInCode = useCallback<Store['requestSignInCode']>(async (phone) => {
    const outcome = await requestSignInCodeApi(API_BASE, { phone });
    if (outcome.status === 'offline') return { ok: true, offline: true };
    if (outcome.status === 'rejected') return { ok: false, error: outcome.error };
    return { ok: true, challengeId: outcome.challengeId, devCode: outcome.devCode };
  }, []);

  const verifySignInCode = useCallback<Store['verifySignInCode']>(
    async (input) => {
      if (input.challengeId) {
        const outcome = await verifySignInCodeApi(API_BASE, {
          challengeId: input.challengeId,
          code: input.code,
          name: input.name,
          email: input.email,
        });
        if (outcome.status === 'rejected') return { ok: false, error: outcome.error };
        if (outcome.status === 'ok') {
          setSession({ token: outcome.auth.token });
          setState((s) => ({
            ...outcome.auth.state,
            profile: { ...outcome.auth.state.profile, bank: user.bank },
            ...prefsOf(s),
          }));
          notify(
            input.mode === 'signup'
              ? `Welcome to Apex${input.name ? `, ${input.name.trim().split(/\s+/)[0]}` : ''}`
              : 'Welcome back',
          );
          return { ok: true };
        }
      }

      // No ledger reachable (or no challenge): keep the demo usable on this device.
      if (input.mode === 'signup') {
        startFresh({ name: input.name ?? '', email: input.email ?? '', phone: input.phone ?? '' });
      } else {
        signInDemo();
      }
      return { ok: true };
    },
    [notify, setSession, startFresh, signInDemo],
  );

  const signOutAccount = useCallback<Store['signOutAccount']>(async () => {
    const token = sessionRef.current?.token;
    setSession(null);
    setState((s) => ({ ...seed(), darkMode: s.darkMode }));
    if (token) await signOutLedger(API_BASE, token);
  }, [setSession]);

  const savings = useMemo(() => sum(state.plans.map((p) => p.balanceKobo)), [state.plans]);
  const investNgn = useMemo(
    () => sum(state.holdings.filter((h) => h.currency === 'NGN').map((h) => times(h.units, h.priceMinor))),
    [state.holdings],
  );
  const investUsd = useMemo(
    () => sum(state.holdings.filter((h) => h.currency === 'USD').map((h) => times(h.units, h.priceMinor))),
    [state.holdings],
  );

  const value = useMemo<Store>(
    () => ({
      ...state,
      user: state.profile,
      total: add(state.walletNgnKobo, add(savings, investNgn)),
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
      toggleSetting,
      toggleBalance,
      reset,
      startFresh,
      signInDemo,
      requestSignInCode,
      verifySignInCode,
      signOutAccount,
    }),
    [state, savings, investNgn, investUsd, toast, notify, addMoney, withdraw, transfer, createPlan, planDeposit, planWithdraw, trade, markAllRead, toggleSetting, toggleBalance, reset, startFresh, signInDemo, requestSignInCode, verifySignInCode, signOutAccount],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
