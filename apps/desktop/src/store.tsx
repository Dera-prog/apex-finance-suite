import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { stocks, user } from '@shared/data';
import type { PlanKind } from '@shared/data';
import { API } from '@shared/api';
import {
  depositToLedger,
  fundPlanInLedger,
  openPlanInLedger,
  requestSignInCode as requestSignInCodeApi,
  signOutLedger,
  syncLedgerState,
  tradeInLedger,
  transferFromLedger,
  verifySignInCode as verifySignInCodeApi,
  withdrawFromLedger,
  withdrawPlanInLedger,
} from '@shared/client';
import type { MobileStateResponse, PlanDto, Profile as ApiProfile, TxnDto } from '@shared/api';
import { demoMobileState } from '@shared/demo-state';
import { add, formatNgn, neg, pctOf, roundMinor, sub, sum, times, toMinor } from '@shared/money';
import type { Minor } from '@shared/money';

export type Profile = ApiProfile & { bank: string };

export type ThemeMode = 'light' | 'dark' | 'system';

type Prefs = {
  biometric: boolean;
  priceAlerts: boolean;
  productNews: boolean;
  hideBalance: boolean;
  pinAlerts: boolean;
  emailAlerts: boolean;
  extHours: boolean;
  theme: ThemeMode;
};

type PrefKey = 'biometric' | 'priceAlerts' | 'productNews' | 'pinAlerts' | 'emailAlerts' | 'extHours';

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
  theme: s.theme,
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
    theme: 'system',
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
    const parsedRaw = parsed as Partial<DesktopState> & { darkMode?: boolean };
    const { darkMode: legacyDark, ...parsedRest } = parsedRaw;
    const base = seed();
    const theme: ThemeMode =
      parsedRest.theme === 'light' || parsedRest.theme === 'dark' || parsedRest.theme === 'system'
        ? parsedRest.theme
        : typeof legacyDark === 'boolean'
          ? legacyDark
            ? 'dark'
            : 'light'
          : base.theme;
    return {
      state: {
        ...base,
        ...parsedRest,
        account: parsedRest.account ?? 'seed',
        profile: { ...base.profile, ...parsedRest.profile },
        theme,
      },
      stored: true,
    };
  } catch {
    return { state: seed(), stored: false };
  }
}

export type TradeResult = { ok: boolean; error?: string; needsAuth?: boolean };
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
  withdraw: (amount: Minor, bankName: string) => Promise<TradeResult>;
  transfer: (amount: Minor, name: string) => Promise<TradeResult>;
  createPlan: (input: { name: string; kind: PlanKind; initial: Minor; target?: Minor; monthly?: Minor }) => Promise<TradeResult>;
  planDeposit: (id: string, amount: Minor) => Promise<TradeResult>;
  planWithdraw: (id: string, amount: Minor) => Promise<TradeResult>;
  trade: (symbol: string, units: number, side: 'buy' | 'sell') => Promise<TradeResult>;
  markAllRead: () => void;
  toggleSetting: (key: PrefKey) => void;
  toggleBalance: () => void;
  reset: () => void;
  startFresh: (input: { name: string; email: string; phone: string }) => void;
  signInDemo: () => void;
  requestSignInCode: (phone: string) => Promise<SignInResult>;
  verifySignInCode: (input: VerifySignInInput) => Promise<{ ok: boolean; error?: string }>;
  reauthStart: (phone: string) => Promise<{ ok: boolean; challengeId?: string; devCode?: string; error?: string }>;
  reauthVerify: (input: { challengeId?: string; code: string }) => Promise<{ ok: boolean; error?: string }>;
  signOutAccount: () => Promise<void>;
  dark: boolean;
  theme: ThemeMode;
  setTheme: (mode: ThemeMode) => void;
  lastSyncedAt: number | null;
  refreshing: boolean;
  refreshState: () => Promise<void>;
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

/** A signed-in write that never reached the server must fail, not quietly change a local copy. */
const OFFLINE_WRITE = 'Could not reach the Apex server. Check your connection and try again.';
const SIGN_IN_FIRST = 'Sign in to move money in this account.';
/** A 401 means the write was refused before touching the ledger, so the draft can be retried in place. */
const SESSION_ENDED = 'Your session ended. Verify your phone to finish this action.';

/** Server responses replace balances, plans and history; device preferences stay local. */
const adopt = (remote: MobileStateResponse) => (s: DesktopState): DesktopState => ({
  ...remote,
  profile: { ...remote.profile, bank: user.bank },
  ...prefsOf(s),
});

export function StoreProvider({ children }: { children: ReactNode }) {
  const [boot] = useState(load);
  const [state, setState] = useState<DesktopState>(boot.state);
  const [toast, setToast] = useState<string | null>(null);
  const [systemDark, setSystemDark] = useState(prefersDark);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const refreshingRef = useRef(false);
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

  /** Every server read passes through here so the sync line tells the truth. */
  const applyRemote = useCallback((remote: MobileStateResponse) => {
    setState((s) => adopt(remote)(s));
    setLastSyncedAt(Date.now());
  }, []);

  const refreshState = useCallback(async () => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    setRefreshing(true);
    try {
      const token = sessionRef.current?.token;
      if (token) {
        const outcome = await syncLedgerState(API_BASE, token);
        if (outcome.status === 'ok') applyRemote(outcome.state);
        else if (outcome.status === 'unauthorized') setSession(null);
      } else {
        const remote = await fetchRemoteState();
        if (remote) applyRemote(remote);
      }
    } finally {
      refreshingRef.current = false;
      setRefreshing(false);
    }
  }, [applyRemote, setSession]);

  useEffect(() => {
    if (boot.stored || sessionRef.current) return;
    let alive = true;
    void fetchRemoteState().then((remote) => {
      if (alive && remote) applyRemote(remote);
    });
    return () => {
      alive = false;
    };
  }, [boot.stored, applyRemote]);

  useEffect(() => {
    const token = sessionRef.current?.token;
    if (!token) return;
    let alive = true;
    void syncLedgerState(API_BASE, token).then((outcome) => {
      if (!alive) return;
      if (outcome.status === 'ok') applyRemote(outcome.state);
      else if (outcome.status === 'unauthorized') setSession(null);
    });
    return () => {
      alive = false;
    };
  }, [applyRemote, setSession]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage may be unavailable; the demo still works in memory */
    }
  }, [state]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const theme = state.theme;
  const dark = theme === 'system' ? systemDark : theme === 'dark';

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = dark ? 'dark' : 'light';
    root.style.colorScheme = dark ? 'dark' : 'light';
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', dark ? '#050F2C' : '#F5F6F8');
  }, [dark]);

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
    const token = sessionRef.current?.token;

    if (token || state.account === 'seed') {
      const outcome = await depositToLedger(
        API_BASE,
        { amountMinor: amount, source: source.trim(), reference: ref },
        token,
      );
      if (outcome.status === 'unauthorized') return { ok: false, needsAuth: true, error: SESSION_ENDED };
      if (outcome.status === 'rejected') return { ok: false, error: outcome.error };
      if (outcome.status === 'ok') {
        applyRemote(outcome.state);
        notify(`${formatNgn(amount)} added to your wallet`);
        return { ok: true };
      }
      if (token) return { ok: false, error: OFFLINE_WRITE };
    } else {
      return { ok: false, error: SIGN_IN_FIRST };
    }

    const txn: TxnDto = {
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
  }, [notify, state.account, applyRemote]);

  const withdraw = useCallback<Store['withdraw']>(async (amount, bankName) => {
    if (!Number.isInteger(amount) || amount < MIN_DEPOSIT) return { ok: false, error: 'Enter at least ₦100.' };
    const ref = makeRef('WDR');
    const token = sessionRef.current?.token;

    if (token || state.account === 'seed') {
      const outcome = await withdrawFromLedger(API_BASE, { amountMinor: amount, bankName, reference: ref }, token);
      if (outcome.status === 'unauthorized') return { ok: false, needsAuth: true, error: SESSION_ENDED };
      if (outcome.status === 'rejected') return { ok: false, error: outcome.error };
      if (outcome.status === 'ok') {
        applyRemote(outcome.state);
        notify(`${formatNgn(amount)} sent to ${bankName}`);
        return { ok: true };
      }
      if (token) return { ok: false, error: OFFLINE_WRITE };
    } else {
      return { ok: false, error: SIGN_IN_FIRST };
    }

    if (amount > state.walletNgnKobo) return { ok: false, error: 'Amount is more than your available wallet balance.' };
    const txn: TxnDto = {
      id: `tx-${Date.now()}`,
      title: `Withdrawal to ${bankName}`,
      meta: 'Beneficiary bank · demo rails',
      amountKobo: neg(amount),
      date: new Date().toISOString(),
      status: 'Completed',
      type: 'withdrawal',
      ref,
    };
    setState((s) => ({ ...s, walletNgnKobo: sub(s.walletNgnKobo, amount), txns: pushTxn(txn)(s) }));
    notify(`${formatNgn(amount)} sent to ${bankName}`);
    return { ok: true };
  }, [notify, state.account, state.walletNgnKobo, applyRemote]);

  const transfer = useCallback<Store['transfer']>(async (amount, name) => {
    if (!Number.isInteger(amount) || amount < MIN_TRANSFER) return { ok: false, error: 'Enter at least ₦50.' };
    if (!name.trim()) return { ok: false, error: 'Add a recipient name or Apex tag.' };
    const ref = makeRef('TRF');
    const token = sessionRef.current?.token;
    const recipient = name.trim();

    if (token || state.account === 'seed') {
      const outcome = await transferFromLedger(API_BASE, { amountMinor: amount, recipient, reference: ref }, token);
      if (outcome.status === 'unauthorized') return { ok: false, needsAuth: true, error: SESSION_ENDED };
      if (outcome.status === 'rejected') return { ok: false, error: outcome.error };
      if (outcome.status === 'ok') {
        applyRemote(outcome.state);
        notify(`${formatNgn(amount)} sent to ${recipient}`);
        return { ok: true };
      }
      if (token) return { ok: false, error: OFFLINE_WRITE };
    } else {
      return { ok: false, error: SIGN_IN_FIRST };
    }

    if (amount > state.walletNgnKobo) return { ok: false, error: 'Amount is more than your available wallet balance.' };
    const txn: TxnDto = {
      id: `tx-${Date.now()}`,
      title: `Transfer to ${recipient}`,
      meta: 'Apex wallet · demo rails',
      amountKobo: neg(amount),
      date: new Date().toISOString(),
      status: 'Completed',
      type: 'transfer',
      ref,
    };
    setState((s) => ({ ...s, walletNgnKobo: sub(s.walletNgnKobo, amount), txns: pushTxn(txn)(s) }));
    notify(`${formatNgn(amount)} sent to ${recipient}`);
    return { ok: true };
  }, [notify, state.account, state.walletNgnKobo, applyRemote]);

  const createPlan = useCallback<Store['createPlan']>(async (input) => {
    if (!input.name.trim()) return { ok: false, error: 'Give the plan a name.' };
    if (!Number.isInteger(input.initial) || input.initial < MIN_PLAN_OPENING) {
      return { ok: false, error: 'Start with at least ₦1,000.' };
    }
    if (input.kind === 'target' && (!input.target || input.target <= input.initial)) {
      return { ok: false, error: 'A target must be higher than the starting amount.' };
    }
    const name = input.name.trim();
    const ref = makeRef('SAV');
    const token = sessionRef.current?.token;

    if (token || state.account === 'seed') {
      const outcome = await openPlanInLedger(
        API_BASE,
        {
          name,
          kind: input.kind,
          initialMinor: input.initial,
          targetMinor: input.kind === 'target' ? input.target : undefined,
          monthlyMinor: input.kind === 'target' ? input.monthly : undefined,
          reference: ref,
        },
        token,
      );
      if (outcome.status === 'unauthorized') return { ok: false, needsAuth: true, error: SESSION_ENDED };
      if (outcome.status === 'rejected') return { ok: false, error: outcome.error };
      if (outcome.status === 'ok') {
        applyRemote(outcome.state);
        notify(`${name} opened with ${formatNgn(input.initial)}`);
        return { ok: true };
      }
      if (token) return { ok: false, error: OFFLINE_WRITE };
    } else {
      return { ok: false, error: SIGN_IN_FIRST };
    }

    if (input.initial > state.walletNgnKobo) return { ok: false, error: 'Your wallet does not have enough for that starting amount.' };
    const now = new Date();
    const maturity = new Date(now);
    maturity.setDate(maturity.getDate() + 90);
    const plan: PlanDto = {
      id: `plan-${Date.now()}`,
      name,
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
      ref,
    };
    setState((s) => ({
      ...s,
      walletNgnKobo: sub(s.walletNgnKobo, input.initial),
      plans: [plan, ...s.plans],
      txns: pushTxn(txn)(s),
    }));
    notify(`${plan.name} opened with ${formatNgn(input.initial)}`);
    return { ok: true };
  }, [notify, state.account, state.walletNgnKobo, applyRemote]);

  const planDeposit = useCallback<Store['planDeposit']>(async (id, amount) => {
    const plan = state.plans.find((p) => p.id === id);
    if (!plan) return { ok: false, error: 'Plan not found.' };
    if (!Number.isInteger(amount) || amount < MIN_DEPOSIT) return { ok: false, error: 'Enter at least ₦100.' };
    if (amount > state.walletNgnKobo) return { ok: false, error: 'Your wallet does not have enough for this top-up.' };
    const ref = makeRef('SAV');
    const token = sessionRef.current?.token;

    if (token || state.account === 'seed') {
      const outcome = await fundPlanInLedger(API_BASE, id, { amountMinor: amount, reference: ref }, token);
      if (outcome.status === 'unauthorized') return { ok: false, needsAuth: true, error: SESSION_ENDED };
      if (outcome.status === 'rejected') return { ok: false, error: outcome.error };
      if (outcome.status === 'ok') {
        applyRemote(outcome.state);
        notify(`${formatNgn(amount)} added to ${plan.name}`);
        return { ok: true };
      }
      if (token) return { ok: false, error: OFFLINE_WRITE };
    } else {
      return { ok: false, error: SIGN_IN_FIRST };
    }

    if (amount > state.walletNgnKobo) return { ok: false, error: 'Your wallet does not have enough for this top-up.' };
    const txn: TxnDto = {
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
  }, [notify, state.account, state.plans, state.walletNgnKobo, applyRemote]);

  const planWithdraw = useCallback<Store['planWithdraw']>(async (id, amount) => {
    const plan = state.plans.find((p) => p.id === id);
    if (!plan) return { ok: false, error: 'Plan not found.' };
    if (!Number.isInteger(amount) || amount < MIN_DEPOSIT) return { ok: false, error: 'Enter at least ₦100.' };
    const ref = makeRef('SAV');
    const token = sessionRef.current?.token;

    if (token || state.account === 'seed') {
      const outcome = await withdrawPlanInLedger(API_BASE, id, { amountMinor: amount, reference: ref }, token);
      if (outcome.status === 'unauthorized') return { ok: false, needsAuth: true, error: SESSION_ENDED };
      if (outcome.status === 'rejected') return { ok: false, error: outcome.error };
      if (outcome.status === 'ok') {
        applyRemote(outcome.state);
        notify(`${formatNgn(amount)} moved from ${plan.name} to your wallet`);
        return { ok: true };
      }
      if (token) return { ok: false, error: OFFLINE_WRITE };
    } else {
      return { ok: false, error: SIGN_IN_FIRST };
    }

    if (plan.kind === 'fixed') {
      return { ok: false, error: 'This fixed plan is locked until its maturity date. Early access rules apply.' };
    }
    if (amount > plan.balanceKobo) return { ok: false, error: 'Amount is more than this plan balance.' };
    const txn: TxnDto = {
      id: `tx-${Date.now()}`,
      title: plan.name,
      meta: 'Savings withdrawal · to wallet',
      amountKobo: amount,
      date: new Date().toISOString(),
      status: 'Completed',
      type: 'savings',
      ref,
    };
    setState((s) => ({
      ...s,
      walletNgnKobo: add(s.walletNgnKobo, amount),
      plans: s.plans.map((p) => (p.id === id ? { ...p, balanceKobo: sub(p.balanceKobo, amount) } : p)),
      txns: pushTxn(txn)(s),
    }));
    notify(`${formatNgn(amount)} moved from ${plan.name} to your wallet`);
    return { ok: true };
  }, [notify, state.account, state.plans, applyRemote]);

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

    const ref = makeRef('INV');
    const token = sessionRef.current?.token;

    if (token || state.account === 'seed') {
      const outcome = await tradeInLedger(API_BASE, { symbol, units, side, reference: ref }, token);
      if (outcome.status === 'unauthorized') return { ok: false, needsAuth: true, error: SESSION_ENDED };
      if (outcome.status === 'rejected') return { ok: false, error: outcome.error };
      if (outcome.status === 'ok') {
        applyRemote(outcome.state);
        notify(
          side === 'buy' ? `${units} ${symbol} bought at ${priceText}` : `${units} ${symbol} sold`,
        );
        return { ok: true };
      }
      if (token) return { ok: false, error: OFFLINE_WRITE };
    } else {
      return { ok: false, error: SIGN_IN_FIRST };
    }

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

    if (side === 'buy') {
      const txn: TxnDto = {
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

    const txn: TxnDto = {
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
  }, [notify, state.account, state.holdings, state.walletNgnKobo, state.walletUsdCents, applyRemote]);

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
    setState((s) => ({ ...seed(), theme: s.theme }));
    notify('Demo account reset to its starting balances');
    void fetchRemoteState().then((remote) => {
      if (remote) applyRemote(remote);
    });
  }, [notify, applyRemote]);

  const startFresh = useCallback<Store['startFresh']>((input) => {
    setState((s) => ({ ...freshAccount(input), theme: s.theme }));
    notify('Account created. Add money to get started.');
  }, [notify]);

  const signInDemo = useCallback(() => {
    setState((s) => ({ ...seed(), theme: s.theme }));
    notify('Signed in to the demo account');
    void fetchRemoteState().then((remote) => {
      if (remote) applyRemote(remote);
    });
  }, [notify, applyRemote]);

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
          setLastSyncedAt(Date.now());
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

  const reauthStart = useCallback<Store['reauthStart']>(async (phone) => {
    const outcome = await requestSignInCodeApi(API_BASE, { phone });
    if (outcome.status === 'offline') return { ok: false, error: OFFLINE_WRITE };
    if (outcome.status === 'rejected') return { ok: false, error: outcome.error };
    return { ok: true, challengeId: outcome.challengeId, devCode: outcome.devCode };
  }, []);

  /** Unlike verifySignInCode, this never falls back to the device demo: a refused write must not look done. */
  const reauthVerify = useCallback<Store['reauthVerify']>(
    async (input) => {
      if (!input.challengeId) return { ok: false, error: 'That code expired. Send a new one.' };
      const outcome = await verifySignInCodeApi(API_BASE, { challengeId: input.challengeId, code: input.code });
      if (outcome.status === 'offline') return { ok: false, error: OFFLINE_WRITE };
      if (outcome.status === 'rejected') return { ok: false, error: outcome.error };
      if (outcome.status === 'ok') {
        setSession({ token: outcome.auth.token });
        setState((s) => ({
          ...outcome.auth.state,
          profile: { ...outcome.auth.state.profile, bank: user.bank },
          ...prefsOf(s),
        }));
        setLastSyncedAt(Date.now());
        return { ok: true };
      }
      return { ok: false, error: 'Could not verify that code.' };
    },
    [setSession],
  );

  const signOutAccount = useCallback<Store['signOutAccount']>(async () => {
    const token = sessionRef.current?.token;
    setSession(null);
    setState((s) => ({ ...seed(), theme: s.theme }));
    if (token) await signOutLedger(API_BASE, token);
  }, [setSession]);

  const setTheme = useCallback<Store['setTheme']>((mode) => {
    setState((s) => ({ ...s, theme: mode }));
  }, []);

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
      dark,
      theme,
      setTheme,
      lastSyncedAt,
      refreshing,
      refreshState,
      reset,
      startFresh,
      signInDemo,
      requestSignInCode,
      verifySignInCode,
      reauthStart,
      reauthVerify,
      signOutAccount,
    }),
    [state, savings, investNgn, investUsd, toast, notify, addMoney, withdraw, transfer, createPlan, planDeposit, planWithdraw, trade, markAllRead, toggleSetting, toggleBalance, dark, theme, setTheme, lastSyncedAt, refreshing, refreshState, reset, startFresh, signInDemo, requestSignInCode, verifySignInCode, reauthStart, reauthVerify, signOutAccount],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
