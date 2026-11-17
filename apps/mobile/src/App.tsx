import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Bell,
  ChartNoAxesCombined,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Download,
  Eye,
  EyeOff,
  Fingerprint,
  Home,
  Info,
  Landmark,
  Lock,
  Minus,
  Moon,
  PiggyBank,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Target,
  TrendingUp,
  UserRound,
  Wallet,
  X,
  Zap,
} from 'lucide-react';
import { Avatar, ApexMark, Sparkline } from '@shared/ui';
import { longDate, marketMovers, ngn as quoteNgn, pct, relativeTime, shortDate, stocks, usd as quoteUsd } from '@shared/data';
import { abs, add, compactNgn, formatNgn, formatPlain, formatUsd, parseNgn, pctOf, sub, sum, toMinor } from '@shared/money';
import type { Minor } from '@shared/money';
import type { PlanDto, TxnDto } from '@shared/api';
import type { CSSProperties } from 'react';
import type { PlanKind } from '@shared/data';
import { links, isLive } from '@shared/links';
import { hasStoredSession, stockFor, useStore } from './store';
import type { MoneyResult } from './store';
import {
  createPasskey,
  passkeyErrorMessage,
  passkeySupported,
  readPasskey,
  verifyPasskey,
} from './passkey';
import type { StoredPasskey } from './passkey';

type Tab = 'home' | 'save' | 'invest' | 'profile';
type MoneyMode = 'add' | 'withdraw' | 'transfer' | 'plan-add' | 'plan-withdraw';

type Overlay =
  | { type: 'notifications' }
  | { type: 'activity' }
  | { type: 'plan'; id: string }
  | { type: 'stock'; symbol: string }
  | { type: 'order'; symbol: string; side: 'buy' | 'sell' }
  | { type: 'money'; mode: MoneyMode; planId?: string }
  | { type: 'newPlan' }
  | { type: 'receipt'; txn: TxnDto }
  | { type: 'kyc' }
  | { type: 'banks' }
  | { type: 'install' }
  | { type: 'account' }
  | { type: 'info'; title: string; body: string };

type Stage = 'welcome' | 'auth' | 'otp' | 'pin' | 'app';

type PromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

type InstallCtx = {
  available: boolean;
  installed: boolean;
  isIos: boolean;
  prompt: () => Promise<boolean>;
};

const TODAY = new Date();

const maskAmount = (hide: boolean, value: string) => (hide ? '••••••' : value);
const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};
const planIcon = (icon: string, size = 18) => {
  if (icon === 'lock') return <Lock size={size} />;
  if (icon === 'target') return <Target size={size} />;
  return <Zap size={size} />;
};
const kindLabel = (kind: PlanKind) => (kind === 'fixed' ? 'Fixed' : kind === 'target' ? 'Target' : 'Flexible');
const stockTint = (symbol: string) => stocks.find((s) => s.symbol === symbol)?.tint ?? '#EEF4FF';
const holdingGain = (avg: Minor, price: Minor) => ((price - avg) / avg) * 100;
const priceText = (currency: 'NGN' | 'USD', value: number) =>
  currency === 'USD' ? quoteUsd(value) : quoteNgn(value, 2);
const minorText = (currency: 'NGN' | 'USD', value: Minor) =>
  currency === 'USD' ? formatUsd(value) : formatNgn(value, 2);
const progressPct = (balance: Minor, target: Minor) => Math.min(100, Math.floor((balance / target) * 100));

function useInstall() {
  const [event, setEvent] = useState<PromptEvent | null>(null);
  const [installed, setInstalled] = useState(
    () =>
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true,
  );
  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvent(e as PromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setEvent(null);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);
  const prompt = async () => {
    if (!event) return false;
    await event.prompt();
    const choice = await event.userChoice;
    if (choice.outcome === 'accepted') setInstalled(true);
    setEvent(null);
    return choice.outcome === 'accepted';
  };
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const value: InstallCtx = { available: Boolean(event), installed, isIos, prompt };
  return value;
}

function Splash({ done }: { done: () => void }) {
  const [second, setSecond] = useState(false);
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    const swap = window.setTimeout(() => setSecond(true), 1150);
    const fade = window.setTimeout(() => setLeaving(true), 2350);
    const end = window.setTimeout(done, 2800);
    return () => {
      window.clearTimeout(swap);
      window.clearTimeout(fade);
      window.clearTimeout(end);
    };
  }, [done]);
  return (
    <div
      className={`splash${second ? ' phase-2' : ''}${leaving ? ' leaving' : ''}`}
      aria-hidden="true"
    >
      <img className="splash-img" src="./assets/editorial-cream.webp" alt="" />
      <img className="splash-img" src="./assets/hero-spheres.webp" alt="" />
      <div className="splash-brand">
        <ApexMark size={54} />
        <b>Apex Finance</b>
        <span>Save. Access. Invest. Grow.</span>
      </div>
    </div>
  );
}

export default function App() {
  const [stage, setStage] = useState<Stage>(() => (hasStoredSession() ? 'app' : 'welcome'));
  const [splash, setSplash] = useState(true);
  const install = useInstall();
  const store = useStore();

  const begin = () => setStage('app');
  const signOut = () => {
    setStage('welcome');
    void store.signOutAccount();
  };

  return (
    <div className="app">
      {stage === 'app' ? (
        <Main install={install} onSignOut={signOut} />
      ) : (
        <AuthFlow stage={stage} setStage={setStage} onDone={begin} />
      )}
      {splash && <Splash done={() => setSplash(false)} />}
    </div>
  );
}

function Main({ install, onSignOut }: { install: InstallCtx; onSignOut: () => void }) {
  const s = useStore();
  const [tab, setTab] = useState<Tab>('home');
  const [overlay, setOverlay] = useState<Overlay | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(
    () => localStorage.getItem('apex.mobile.installDismissed') === 'on',
  );
  const historyPushed = useRef(false);

  useEffect(() => {
    const onPop = () => {
      if (historyPushed.current) {
        historyPushed.current = false;
        setOverlay(null);
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const open = useCallback((next: Overlay) => {
    if (!historyPushed.current) {
      window.history.pushState({ apexSheet: true }, '');
      historyPushed.current = true;
    }
    setOverlay(next);
  }, []);

  const close = useCallback(() => {
    setOverlay(null);
    if (historyPushed.current) {
      historyPushed.current = false;
      window.history.back();
    }
  }, []);

  const goTab = (next: Tab) => {
    close();
    setTab(next);
  };

  const dismissBanner = () => {
    localStorage.setItem('apex.mobile.installDismissed', 'on');
    setBannerDismissed(true);
  };

  return (
    <>
      {tab === 'home' &&
        (s.account === 'new' ? (
          <NewHome open={open} goTab={goTab} install={install} />
        ) : (
          <HomeScreen
            open={open}
            goTab={goTab}
            install={install}
            showBanner={!bannerDismissed && !install.installed && (install.available || install.isIos)}
            dismissBanner={dismissBanner}
          />
        ))}
      {tab === 'save' && <SaveScreen open={open} />}
      {tab === 'invest' && <InvestScreen open={open} />}
      {tab === 'profile' && <ProfileScreen open={open} onSignOut={onSignOut} install={install} />}

      <nav className="tabbar" aria-label="Main navigation">
        {(
          [
            { key: 'home', label: 'Home', icon: Home },
            { key: 'save', label: 'Save', icon: PiggyBank },
            { key: 'invest', label: 'Invest', icon: ChartNoAxesCombined },
            { key: 'profile', label: 'Profile', icon: UserRound },
          ] as const
        ).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            className={`tab ${tab === key ? 'active' : ''}`}
            aria-current={tab === key ? 'page' : undefined}
            onClick={() => goTab(key)}
          >
            <Icon size={21} strokeWidth={tab === key ? 2.4 : 1.9} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      {s.toast && !overlay && (
        <div className="toast" role="status">
          {s.toast}
        </div>
      )}

      {overlay && <OverlayView overlay={overlay} open={open} close={close} install={install} onSignOut={onSignOut} />}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Home                                                                */
/* ------------------------------------------------------------------ */

function HomeScreen({
  open,
  goTab,
  install,
  showBanner,
  dismissBanner,
}: {
  open: (o: Overlay) => void;
  goTab: (t: Tab) => void;
  install: InstallCtx;
  showBanner: boolean;
  dismissBanner: () => void;
}) {
  const s = useStore();
  const hide = s.prefs.hideBalance;
  const unread = s.notifications.filter((n) => n.unread).length;
  const targetPlans = s.plans.filter((p) => p.kind === 'target').slice(0, 3);
  const movers = marketMovers.slice(0, 4);

  return (
    <div className="screen home">
      <header className="screen-head home-head">
        <div>
          <p className="eyebrow">{TODAY.toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <h1 className="screen-title">
            {greeting()}, {s.user.firstName}
          </h1>
        </div>
        <div className="head-actions">
          <button className="icon-btn bell" aria-label="Notifications" onClick={() => open({ type: 'notifications' })}>
            <Bell size={20} />
            {unread > 0 && <span className="dot">{unread}</span>}
          </button>
          <button className="avatar-btn" aria-label="Profile" onClick={() => goTab('profile')}>
            <Avatar initials={s.user.initials} tint={s.user.avatarTint} size={40} />
          </button>
        </div>
      </header>

      <section className="hero" aria-label="Total balance">
        <div className="hero-top">
          <span>Total balance</span>
          <button
            className="eye"
            aria-label={hide ? 'Show balances' : 'Hide balances'}
            onClick={() => s.setPref('hideBalance', !hide)}
          >
            {hide ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>
        <div className="hero-amount">{maskAmount(hide, formatNgn(s.total, 2))}</div>
        <div className="hero-meta">
          <span className="hero-chip">
            <TrendingUp size={13} /> {pct(4.8)} · {maskAmount(hide, `+${formatNgn(toMinor(73000))}`)}
          </span>
          <span>all time</span>
        </div>
        <div className="hero-actions">
          <button className="hero-btn primary" onClick={() => open({ type: 'money', mode: 'add' })}>
            <Plus size={17} /> Add money
          </button>
          <button className="hero-btn ghost" onClick={() => open({ type: 'money', mode: 'withdraw' })}>
            <ArrowUpRight size={17} /> Withdraw
          </button>
        </div>
        <div className="hero-stats">
          <div>
            <span>Wallet</span>
            <b>{maskAmount(hide, formatNgn(s.walletNgnKobo))}</b>
          </div>
          <div>
            <span>Savings</span>
            <b>{maskAmount(hide, formatNgn(s.savings))}</b>
          </div>
          <div>
            <span>Invest</span>
            <b>{maskAmount(hide, formatNgn(s.investNgn))}</b>
          </div>
        </div>
      </section>

      <div className="quick-grid">
        <button className="quick" onClick={() => open({ type: 'money', mode: 'add' })}>
          <span className="quick-icon blue">
            <Plus size={20} />
          </span>
          Add money
        </button>
        <button className="quick" onClick={() => open({ type: 'money', mode: 'withdraw' })}>
          <span className="quick-icon peach">
            <ArrowUpRight size={20} />
          </span>
          Withdraw
        </button>
        <button className="quick" onClick={() => open({ type: 'money', mode: 'transfer' })}>
          <span className="quick-icon purple">
            <Send size={20} />
          </span>
          Send
        </button>
        <button className="quick" onClick={() => goTab('invest')}>
          <span className="quick-icon green">
            <TrendingUp size={20} />
          </span>
          Invest
        </button>
      </div>

      {showBanner && (
        <div className="banner">
          <span className="banner-icon">
            <Smartphone size={20} />
          </span>
          <div>
            <b>Keep Apex on your home screen</b>
            <p>Open it like any app, even when the signal drops.</p>
          </div>
          <button className="banner-cta" onClick={() => open({ type: 'install' })}>
            Install
          </button>
          <button className="banner-close" aria-label="Dismiss" onClick={dismissBanner}>
            <X size={15} />
          </button>
        </div>
      )}

      <section className="block">
        <div className="section-head">
          <h2>Savings goals</h2>
          <button className="link-btn" onClick={() => goTab('save')}>
            See all <ChevronRight size={14} />
          </button>
        </div>
        <div className="plan-scroll">
          {targetPlans.map((plan) => {
            const pctDone = plan.targetKobo ? progressPct(plan.balanceKobo, plan.targetKobo) : 100;
            return (
              <button
                key={plan.id}
                className="plan-mini"
                style={{ '--plan-tint': plan.pastel } as CSSProperties}
                onClick={() => open({ type: 'plan', id: plan.id })}
              >
                <span className="plan-mini-top">
                  <span className="plan-icon" style={{ background: '#fff', color: plan.color }}>
                    {planIcon(plan.icon, 16)}
                  </span>
                  <span className="mini-rate">{plan.rate}% p.a.</span>
                </span>
                <span className="plan-mini-name">{plan.name}</span>
                <span className="plan-mini-balance">{maskAmount(hide, formatNgn(plan.balanceKobo))}</span>
                <span className="bar" aria-hidden="true">
                  <span style={{ width: `${pctDone}%`, background: plan.color }} />
                </span>
                <span className="plan-mini-foot">
                  {plan.targetKobo ? `${pctDone}% of ${compactNgn(plan.targetKobo)}` : 'Withdraw anytime'}
                  <ChevronRight size={14} />
                </span>
              </button>
            );
          })}
          <button className="plan-mini add" onClick={() => open({ type: 'newPlan' })}>
            <span className="add-circle">
              <Plus size={22} />
            </span>
            <span className="plan-mini-name">New plan</span>
            <span className="plan-mini-foot">Flexible, fixed or target</span>
          </button>
        </div>
      </section>

      <section className="block">
        <div className="section-head">
          <h2>Market movers</h2>
          <button className="link-btn" onClick={() => goTab('invest')}>
            See market <ChevronRight size={14} />
          </button>
        </div>
        <div className="rows card">
          {movers.map((m) => (
            <button key={m.symbol} className="row" onClick={() => open({ type: 'stock', symbol: m.symbol })}>
              <span className="tile" style={{ background: stockTint(m.symbol) }}>
                {m.symbol.slice(0, 2)}
              </span>
              <span className="row-main">
                <span className="row-title">{m.name}</span>
                <span className="row-sub">
                  {m.symbol} · {m.currency === 'USD' ? 'NASDAQ' : 'NGX'}
                </span>
              </span>
              <Sparkline
                data={stocks.find((s) => s.symbol === m.symbol)?.spark ?? [1, 2, 3]}
                width={56}
                height={26}
                stroke={m.change >= 0 ? '#0B8A13' : '#D92D20'}
                fill={false}
                strokeWidth={1.8}
              />
              <span className="row-end">
                <b>{priceText(m.currency, m.price)}</b>
                <span className={m.change >= 0 ? 'delta up' : 'delta down'}>{pct(m.change, 2)}</span>
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="block">
        <div className="section-head">
          <h2>Recent activity</h2>
          <button className="link-btn" onClick={() => open({ type: 'activity' })}>
            See all <ChevronRight size={14} />
          </button>
        </div>
        <div className="rows card">
          {s.txns.slice(0, 4).map((t) => {
            const credited = t.amountKobo > 0 && t.status !== 'Failed';
            return (
              <button key={t.id} className="row txn-row" onClick={() => open({ type: 'receipt', txn: t })}>
                <span className={`row-icon ${credited ? 'in' : 'out'} ${t.status === 'Failed' ? 'failed' : ''}`}>
                  {t.status === 'Failed' ? <X size={16} /> : credited ? <ArrowDownLeft size={17} /> : <ArrowUpRight size={17} />}
                </span>
                <span className="row-main">
                  <span className="row-title">{t.title}</span>
                  <span className="row-sub">
                    {t.status === 'Failed' ? <em className="failed-text">Failed</em> : shortDate(t.date)} · {t.meta}
                  </span>
                </span>
                <span className={`txn-amount ${credited ? 'up' : ''}${t.status === 'Failed' ? ' void' : ''}`}>
                  {maskAmount(
                    hide,
                    t.status === 'Failed' ? formatNgn(abs(t.amountKobo)) : `${credited ? '+' : '−'}${formatNgn(abs(t.amountKobo))}`,
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <button className="install-strip" onClick={() => open({ type: 'install' })}>
        <Download size={18} />
        <span>
          <b>{install.installed ? 'Apex is installed' : 'Install the Apex app'}</b>
          <em>{install.installed ? 'You are running the installed experience' : 'Add to your home screen in two taps'}</em>
        </span>
        <ChevronRight size={17} />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* New account home                                                    */
/* ------------------------------------------------------------------ */

function NewHome({
  open,
  goTab,
  install,
}: {
  open: (o: Overlay) => void;
  goTab: (t: Tab) => void;
  install: InstallCtx;
}) {
  const s = useStore();
  const hide = s.prefs.hideBalance;
  const [cur, setCur] = useState<'NGN' | 'USD'>('NGN');
  const unread = s.notifications.filter((n) => n.unread).length;
  const movers = marketMovers.slice(0, 4);
  const money = (value: Minor) => (cur === 'USD' ? formatUsd(value) : formatNgn(value));
  const total = cur === 'USD' ? add(s.walletUsdCents, s.investUsd) : add(s.walletNgnKobo, add(s.savings, s.investNgn));
  const savingsValue = cur === 'USD' ? toMinor(0) : s.savings;
  const investValue = cur === 'USD' ? s.investUsd : s.investNgn;

  return (
    <div className="screen home">
      <header className="screen-head home-head">
        <button className="who" onClick={() => goTab('profile')}>
          <Avatar initials={s.user.initials} tint={s.user.avatarTint} size={42} ring />
          <span>
            <b>{s.user.name}</b>
            <em>{s.user.kycLabel}</em>
          </span>
          <ChevronDown size={16} />
        </button>
        <button className="icon-btn bell" aria-label="Notifications" onClick={() => open({ type: 'notifications' })}>
          <Bell size={20} />
          {unread > 0 && <span className="dot">{unread}</span>}
        </button>
      </header>

      <section className="hero" aria-label="Total balance">
        <div className="hero-top">
          <button
            className="hero-cur"
            aria-label={`Show balances in ${cur === 'NGN' ? 'US dollars' : 'naira'}`}
            onClick={() => setCur(cur === 'NGN' ? 'USD' : 'NGN')}
          >
            Total balance in {cur} <ChevronDown size={14} />
          </button>
          <button
            className="eye"
            aria-label={hide ? 'Show balances' : 'Hide balances'}
            onClick={() => s.setPref('hideBalance', !hide)}
          >
            {hide ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>
        <div className="hero-amount">{maskAmount(hide, money(total))}</div>
        <div className="hero-stats two">
          <div>
            <span>Savings</span>
            <b>{maskAmount(hide, money(savingsValue))}</b>
          </div>
          <div>
            <span>Investments</span>
            <b>{maskAmount(hide, money(investValue))}</b>
          </div>
        </div>
        <div className="hero-actions">
          <button className="hero-btn soft" onClick={() => open({ type: 'money', mode: 'add' })}>
            <Plus size={17} /> Add money
          </button>
          <button className="hero-btn dark" onClick={() => open({ type: 'money', mode: 'withdraw' })}>
            <Minus size={17} /> Withdraw
          </button>
        </div>
      </section>

      {s.txns.length === 0 && (
        <div className="points-strip">
          <span className="points-icon">
            <Sparkles size={18} />
          </span>
          <div>
            <b>Welcome to Apex</b>
            <span>Add money to activate savings and investing.</span>
          </div>
          <button className="link-btn" onClick={() => open({ type: 'kyc' })}>
            Verify
          </button>
        </div>
      )}

      <section className="block">
        <div className="section-head">
          <h2>Market movers</h2>
          <button className="link-btn" onClick={() => goTab('invest')}>
            See market <ChevronRight size={14} />
          </button>
        </div>
        <div className="rows card">
          {movers.map((m) => (
            <button key={m.symbol} className="row" onClick={() => open({ type: 'stock', symbol: m.symbol })}>
              <span className="tile" style={{ background: stockTint(m.symbol) }}>
                {m.symbol.slice(0, 2)}
              </span>
              <span className="row-main">
                <span className="row-title">{m.name}</span>
                <span className="row-sub">
                  {m.symbol} · {m.currency === 'USD' ? 'NASDAQ' : 'NGX'}
                </span>
              </span>
              <Sparkline
                data={stocks.find((s) => s.symbol === m.symbol)?.spark ?? [1, 2, 3]}
                width={56}
                height={26}
                stroke={m.change >= 0 ? '#0B8A13' : '#D92D20'}
                fill={false}
                strokeWidth={1.8}
              />
              <span className="row-end">
                <b>{priceText(m.currency, m.price)}</b>
                <span className={m.change >= 0 ? 'delta up' : 'delta down'}>{pct(m.change, 2)}</span>
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="block">
        <div className="section-head">
          <h2>Recent activity</h2>
          {s.txns.length > 0 && (
            <button className="link-btn" onClick={() => open({ type: 'activity' })}>
              See all <ChevronRight size={14} />
            </button>
          )}
        </div>
        {s.txns.length > 0 ? (
          <div className="rows card">
            {s.txns.slice(0, 4).map((t) => {
              const credited = t.amountKobo > 0 && t.status !== 'Failed';
              return (
                <button key={t.id} className="row txn-row" onClick={() => open({ type: 'receipt', txn: t })}>
                  <span className={`row-icon ${credited ? 'in' : 'out'} ${t.status === 'Failed' ? 'failed' : ''}`}>
                    {t.status === 'Failed' ? <X size={16} /> : credited ? <ArrowDownLeft size={17} /> : <ArrowUpRight size={17} />}
                  </span>
                  <span className="row-main">
                    <span className="row-title">{t.title}</span>
                    <span className="row-sub">
                      {t.status === 'Failed' ? <em className="failed-text">Failed</em> : shortDate(t.date)} · {t.meta}
                    </span>
                  </span>
                  <span className={`txn-amount ${credited ? 'up' : ''}${t.status === 'Failed' ? ' void' : ''}`}>
                    {maskAmount(
                      hide,
                      t.status === 'Failed' ? formatNgn(abs(t.amountKobo)) : `${credited ? '+' : '−'}${formatNgn(abs(t.amountKobo))}`,
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="empty-card">
            <span className="empty-icon">
              <Clock size={20} />
            </span>
            <b>No activity yet</b>
            <p>Deposits, transfers and trades will appear here once you start moving money.</p>
          </div>
        )}
      </section>

      <button className="install-strip" onClick={() => open({ type: 'install' })}>
        <Download size={18} />
        <span>
          <b>{install.installed ? 'Apex is installed' : 'Install the Apex app'}</b>
          <em>{install.installed ? 'You are running the installed experience' : 'Add to your home screen in two taps'}</em>
        </span>
        <ChevronRight size={17} />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Save                                                                */
/* ------------------------------------------------------------------ */

function SaveScreen({ open }: { open: (o: Overlay) => void }) {
  const s = useStore();
  const hide = s.prefs.hideBalance;
  const [filter, setFilter] = useState<'all' | PlanKind>('all');
  const plans = filter === 'all' ? s.plans : s.plans.filter((p) => p.kind === filter);
  const projected = sum(s.plans.map((p) => pctOf(p.balanceKobo, p.rate)));

  return (
    <div className="screen">
      <header className="screen-head">
        <div>
          <h1 className="screen-title">Save</h1>
          <p className="screen-sub">Flexible, fixed and target plans</p>
        </div>
        <button className="icon-btn solid" aria-label="New savings plan" onClick={() => open({ type: 'newPlan' })}>
          <Plus size={21} />
        </button>
      </header>

      <section className="sum-card">
        <div>
          <span>Total saved</span>
          <b>{maskAmount(hide, formatNgn(s.savings))}</b>
        </div>
        <div className="sum-side">
          <span>Projected interest</span>
          <b className="green">{maskAmount(hide, formatNgn(projected))}</b>
          <em>annualised, illustrative</em>
        </div>
      </section>

      <div className="segmented" role="group" aria-label="Filter plans by type">
        {(['all', 'flexible', 'fixed', 'target'] as const).map((k) => (
          <button
            key={k}
            aria-pressed={filter === k}
            className={filter === k ? 'seg active' : 'seg'}
            onClick={() => setFilter(k)}
          >
            {k === 'all' ? 'All' : kindLabel(k)}
          </button>
        ))}
      </div>

      <div className="plan-list">
        {plans.map((plan) => (
          <PlanCard key={plan.id} plan={plan} hide={hide} onOpen={() => open({ type: 'plan', id: plan.id })} />
        ))}
        {plans.length === 0 && (
          <div className="empty">
            <PiggyBank size={26} />
            <p>No {kindLabel(filter as PlanKind).toLowerCase()} plans yet.</p>
            <button className="btn btn-primary btn-sm" onClick={() => open({ type: 'newPlan' })}>
              Start a plan
            </button>
          </div>
        )}
      </div>

      <div className="note">
        <Info size={17} />
        <p>
          Rates are illustrative for this demo and can change. Fixed plans are locked for their tenure; target plans stay
          accessible. Apex holds customer funds with licensed partner institutions.
        </p>
      </div>
    </div>
  );
}

function PlanCard({ plan, hide, onOpen }: { plan: PlanDto; hide: boolean; onOpen: () => void }) {
  const progress = plan.targetKobo ? progressPct(plan.balanceKobo, plan.targetKobo) : 100;
  return (
    <article className="plan-card" style={{ '--plan-tint': plan.pastel } as CSSProperties}>
      <button className="plan-card-top" onClick={onOpen} aria-label={`Open ${plan.name}`}>
        <span className="plan-icon" style={{ background: plan.pastel, color: plan.color }}>
          {planIcon(plan.icon)}
        </span>
        <span className="plan-card-name">
          <b>{plan.name}</b>
          <em>{plan.subtitle}</em>
        </span>
        <span className="kind-pill" style={{ color: plan.color, background: `${plan.pastel}88` }}>
          {kindLabel(plan.kind)}
        </span>
      </button>
      <div className="plan-card-balance">{maskAmount(hide, formatNgn(plan.balanceKobo, 2))}</div>
      {plan.targetKobo ? (
        <>
          <div className="bar big">
            <span style={{ width: `${progress}%`, background: plan.color }} />
          </div>
          <div className="bar-meta">
            <span>{progress}% of {formatNgn(plan.targetKobo)}</span>
            <span>{plan.rate}% p.a.</span>
          </div>
        </>
      ) : (
        <div className="bar-meta">
          <span>{plan.kind === 'fixed' ? 'Locked until maturity' : 'Available anytime'}</span>
          <span>{plan.rate}% p.a.</span>
        </div>
      )}
      <div className="plan-actions">
        <button className="btn btn-soft btn-sm" onClick={() => onOpen()}>
          <Plus size={15} /> Add
        </button>
        <button className="btn btn-ghost btn-sm" onClick={() => onOpen()}>
          {plan.kind === 'fixed' ? (
            <>
              <Lock size={14} /> Locked
            </>
          ) : (
            <>
              <ArrowUpRight size={15} /> Withdraw
            </>
          )}
        </button>
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Invest                                                              */
/* ------------------------------------------------------------------ */

function InvestScreen({ open }: { open: (o: Overlay) => void }) {
  const s = useStore();
  const hide = s.prefs.hideBalance;
  const [view, setView] = useState<'portfolio' | 'market'>('portfolio');
  const [exchange, setExchange] = useState<'all' | 'NGX' | 'NASDAQ'>('all');
  const [query, setQuery] = useState('');
  const list = stocks.filter(
    (st) =>
      (exchange === 'all' || st.exchange === exchange) &&
      (!query.trim() ||
        st.name.toLowerCase().includes(query.trim().toLowerCase()) ||
        st.symbol.toLowerCase().includes(query.trim().toLowerCase())),
  );

  return (
    <div className="screen">
      <header className="screen-head">
        <div>
          <h1 className="screen-title">Invest</h1>
          <p className="screen-sub">Nigerian and US shares</p>
        </div>
        <span className="live-pill">
          <span /> 15-min delay
        </span>
      </header>

      <section className="invest-card">
        <div className="invest-top">
          <span>NGX portfolio</span>
          <span className="hero-chip dark">
            <TrendingUp size={13} /> {pct(4.8)}
          </span>
        </div>
        <b className="invest-total">{maskAmount(hide, formatNgn(s.investNgn))}</b>
        <div className="invest-split two">
          <div>
            <span>US shares</span>
            <b>{maskAmount(hide, formatUsd(s.investUsd))}</b>
          </div>
          <div>
            <span>USD wallet</span>
            <b>{maskAmount(hide, formatUsd(s.walletUsdCents))}</b>
          </div>
        </div>
      </section>

      <div className="segmented" role="group" aria-label="Invest view">
        <button
          aria-pressed={view === 'portfolio'}
          className={view === 'portfolio' ? 'seg active' : 'seg'}
          onClick={() => setView('portfolio')}
        >
          Portfolio
        </button>
        <button
          aria-pressed={view === 'market'}
          className={view === 'market' ? 'seg active' : 'seg'}
          onClick={() => setView('market')}
        >
          Market
        </button>
      </div>

      {view === 'portfolio' ? (
        <>
          <div className="section-head tight">
            <h2>Your holdings</h2>
            <span className="muted">{s.holdings.length} positions</span>
          </div>
          <div className="rows card">
            {s.holdings.map((h) => {
              const stock = stockFor(h.symbol);
              if (!stock) return null;
              const value = toMinor(h.units * stock.price);
              const gain = holdingGain(h.avgCostMinor, h.priceMinor);
              return (
                <button key={h.symbol} className="row" onClick={() => open({ type: 'stock', symbol: h.symbol })}>
                  <span className="tile" style={{ background: stock.tint }}>
                    {h.symbol.slice(0, 2)}
                  </span>
                  <span className="row-main">
                    <span className="row-title">{stock.name}</span>
                    <span className="row-sub">
                      {h.units} units · avg {minorText(stock.currency, h.avgCostMinor)}
                    </span>
                  </span>
                  <span className="row-end">
                    <b>{maskAmount(hide, minorText(stock.currency, value))}</b>
                    <span className={gain >= 0 ? 'delta up' : 'delta down'}>{pct(gain)}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <div className="note">
            <Info size={17} />
            <p>
              Prices are indicative and delayed by at least 15 minutes. US orders settle at a quoted FX rate. Past
              performance does not predict future returns.
            </p>
          </div>
        </>
      ) : (
        <>
          <div className="search-field">
            <Search size={17} />
            <input
              aria-label="Search instruments"
              placeholder="Search company or symbol"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="chips">
            {(['all', 'NGX', 'NASDAQ'] as const).map((x) => (
              <button key={x} className={exchange === x ? 'chip active' : 'chip'} onClick={() => setExchange(x)}>
                {x === 'all' ? 'All markets' : x}
              </button>
            ))}
          </div>
          <div className="rows card market-list">
            {list.map((st) => (
              <div key={st.symbol} className="row market-row">
                <button className="market-tap" onClick={() => open({ type: 'stock', symbol: st.symbol })}>
                  <span className="tile" style={{ background: st.tint }}>
                    {st.symbol.slice(0, 2)}
                  </span>
                  <span className="row-main">
                    <span className="row-title">{st.name}</span>
                    <span className="row-sub">
                      {st.symbol} · {st.exchange}
                    </span>
                  </span>
                  <span className="row-end">
                    <b>{priceText(st.currency, st.price)}</b>
                    <span className={st.change >= 0 ? 'delta up' : 'delta down'}>{pct(st.change, 2)}</span>
                  </span>
                </button>
                <button className="trade-btn" onClick={() => open({ type: 'order', symbol: st.symbol, side: 'buy' })}>
                  Trade
                </button>
              </div>
            ))}
            {list.length === 0 && (
              <div className="empty">
                <Search size={24} />
                <p>No instruments match “{query}”.</p>
              </div>
            )}
          </div>
          <p className="foot-note">
            NGX prices in naira · US prices in dollars. FX quoted before each order.
          </p>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Profile                                                             */
/* ------------------------------------------------------------------ */

function ProfileScreen({
  open,
  onSignOut,
  install,
}: {
  open: (o: Overlay) => void;
  onSignOut: () => void;
  install: InstallCtx;
}) {
  const s = useStore();
  const p = s.user;
  const dark = s.prefs.darkMode;

  const explore = [
    { label: 'Marketing website', href: links.website },
    { label: 'Desktop workspace', href: links.desktop },
    { label: 'Case study', href: links.caseStudy },
  ].filter((l) => isLive(l.href));

  const note = (title: string, body: string) => open({ type: 'info', title, body });

  const toggle = (key: keyof typeof s.prefs) => (
    <button
      role="switch"
      aria-checked={s.prefs[key]}
      aria-label={key}
      className={`toggle ${s.prefs[key] ? 'on' : ''}`}
      onClick={() => s.setPref(key, !s.prefs[key])}
    >
      <span />
    </button>
  );

  const kycSteps = [
    { label: 'Phone Verified', done: true },
    { label: 'ID Verified', done: p.kycLevel === 2 },
    { label: 'Selfie Verification', done: false },
  ];

  return (
    <div className="screen">
      <header className="screen-head">
        <div>
          <p className="eyebrow">Profile</p>
          <h1 className="screen-title">Your account</h1>
        </div>
        <button className="icon-btn" aria-label="Notifications" onClick={() => open({ type: 'notifications' })}>
          <Bell size={20} />
        </button>
      </header>

      <button className="profile-card as-btn" onClick={() => open({ type: 'account' })}>
        <Avatar initials={p.initials} tint={p.avatarTint} size={54} ring />
        <span className="profile-main">
          <b>{p.name}</b>
          <em>{p.phone}</em>
        </span>
        <ChevronRight size={18} />
      </button>

      <section className="kyc-card" aria-label="KYC verification">
        <div className="kyc-head">
          <b>KYC Verification</b>
          <span className="kyc-badge">{p.kycLevel === 2 ? 'level 2' : 'level 1'}</span>
        </div>
        <ul className="kyc-steps">
          {kycSteps.map((step) => (
            <li key={step.label} className={step.done ? 'done' : ''}>
              <span>{step.label}</span>
              {step.done ? (
                <span className="kyc-tick">
                  <Check size={12} />
                </span>
              ) : (
                <span className="kyc-pending" aria-hidden="true" />
              )}
            </li>
          ))}
        </ul>
        <button className="btn btn-primary btn-block btn-sm" onClick={() => open({ type: 'kyc' })}>
          Complete Verification
        </button>
      </section>

      <div className="menu-group">
        <h3>Bio Data</h3>
        <div className="menu">
          <button className="menu-row" onClick={() => open({ type: 'account' })}>
            <span className="menu-main">
              <b>Account Details</b>
            </span>
            <ChevronRight size={17} />
          </button>
          <button
            className="menu-row"
            onClick={() =>
              note(
                'Security Settings',
                'PIN, biometrics and device controls are part of the live build. This demo keeps your settings on this device only.',
              )
            }
          >
            <span className="menu-main">
              <b>Security Settings</b>
            </span>
            <ChevronRight size={17} />
          </button>
        </div>
      </div>

      <div className="menu-group">
        <h3>Account</h3>
        <div className="menu">
          <button className="menu-row" onClick={() => open({ type: 'activity' })}>
            <span className="menu-main">
              <b>Account Statements</b>
            </span>
            <ChevronRight size={17} />
          </button>
          <div className="menu-row static">
            <span className="menu-main">
              <b>Manage Transaction PIN</b>
              <em>Get transaction alerts</em>
            </span>
            {toggle('pinAlerts')}
          </div>
          <div className="menu-row static">
            <span className="menu-main">
              <b>Push &amp; Email Notification</b>
              <em>Weekly Summaries</em>
            </span>
            {toggle('emailAlerts')}
          </div>
        </div>
      </div>

      <div className="menu-group">
        <h3>Trade &amp; Documentation</h3>
        <div className="menu">
          <div className="menu-row static">
            <span className="menu-main">
              <b>Extend Trading Hours</b>
              <em>Place orders outside regular market hours</em>
            </span>
            {toggle('extHours')}
          </div>
          <button
            className="menu-row"
            onClick={() =>
              note(
                'Trade Confirmations',
                'Contract notes for each executed order are generated in the live product. This demo shows them as receipts in Activity.',
              )
            }
          >
            <span className="menu-main">
              <b>Trade Confirmations</b>
            </span>
            <ChevronRight size={17} />
          </button>
        </div>
      </div>

      <div className="menu-group">
        <h3>Appearance</h3>
        <div className="menu">
          <div className="menu-row static">
            <span className="menu-icon purple">
              <Moon size={18} />
            </span>
            <span className="menu-main">
              <b>Dark Mode</b>
              <em>Deep royal blue interface for low light. Applies to this device.</em>
            </span>
            <button
              role="switch"
              aria-checked={dark}
              aria-label="Deep royal blue dark mode"
              className={`toggle ${dark ? 'on' : ''}`}
              onClick={() => s.setPref('darkMode', !dark)}
            >
              <span />
            </button>
          </div>
        </div>
      </div>

      <div className="menu-group">
        <h3>About Us</h3>
        <div className="menu">
          <button
            className="menu-row"
            onClick={() =>
              note(
                'Help & Support',
                'Support runs 8am–8pm WAT in the live product. For this demo, your feedback shapes the next build.',
              )
            }
          >
            <span className="menu-main">
              <b>Help &amp; Support</b>
            </span>
            <ChevronRight size={17} />
          </button>
          <button
            className="menu-row"
            onClick={() =>
              note(
                'Terms & Conditions',
                'Apex Finance is a portfolio concept, not a licensed financial institution. No real money moves in this demo.',
              )
            }
          >
            <span className="menu-main">
              <b>Terms &amp; Conditions</b>
            </span>
            <ChevronRight size={17} />
          </button>
          <button
            className="menu-row"
            onClick={() =>
              note(
                'Privacy Policy',
                'This demo stores your balances and preferences in this browser only. Nothing is sent to a server.',
              )
            }
          >
            <span className="menu-main">
              <b>Privacy Policy</b>
            </span>
            <ChevronRight size={17} />
          </button>
          <button
            className="menu-row"
            onClick={() => {
              if (window.confirm('Reset the demo account to its starting balances?')) s.reset();
            }}
          >
            <span className="menu-icon peach">
              <RefreshCw size={18} />
            </span>
            <span className="menu-main">
              <b>Reset demo data</b>
              <em>Restore seeded balances and activity</em>
            </span>
            <ChevronRight size={17} />
          </button>
        </div>
      </div>

      <button className="install-card" onClick={() => open({ type: 'install' })}>
        <span className="install-art">
          <ApexMark size={44} />
        </span>
        <span className="install-copy">
          <b>{install.installed ? 'Apex is installed' : 'Install Apex on your phone'}</b>
          <em>
            {install.installed
              ? 'You are using the standalone app experience'
              : install.isIos
                ? 'Tap Share, then “Add to Home Screen”'
                : 'Full screen, home-screen icon and offline shell'}
          </em>
        </span>
        <Download size={19} />
      </button>

      {explore.length > 0 && (
        <div className="menu-group">
          <h3>Explore the project</h3>
          <div className="menu">
            {explore.map((item) => (
              <a key={item.label} className="menu-row" href={item.href} target="_blank" rel="noreferrer">
                <span className="menu-icon blue">
                  <ArrowUpRight size={18} />
                </span>
                <span className="menu-main">
                  <b>{item.label}</b>
                  <em>Opens in a new tab</em>
                </span>
                <ChevronRight size={17} />
              </a>
            ))}
          </div>
        </div>
      )}

      <button className="account-logout" onClick={onSignOut}>
        Log Out
      </button>

      <p className="version">Apex Finance · Mobile demo · v1.0</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Onboarding and auth                                                 */
/* ------------------------------------------------------------------ */

function AuthFlow({
  stage,
  setStage,
  onDone,
}: {
  stage: Stage;
  setStage: (s: Stage) => void;
  onDone: () => void;
}) {
  const store = useStore();
  const [mode, setMode] = useState<'signup' | 'signin'>('signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [passkey, setPasskey] = useState<StoredPasskey | null>(() => readPasskey());
  const [passkeyBusy, setPasskeyBusy] = useState(false);
  const [passkeyNote, setPasskeyNote] = useState('');
  const [askForPasskey, setAskForPasskey] = useState(false);
  const supportsPasskey = passkeySupported();
  const [challengeId, setChallengeId] = useState<string | undefined>();
  const [devCode, setDevCode] = useState<string | undefined>();
  const [offline, setOffline] = useState(false);
  const [busy, setBusy] = useState(false);

  const signInDemoRef = useRef(store.signInDemo);
  signInDemoRef.current = store.signInDemo;

  const go = (next: Stage) => {
    setError('');
    setPin('');
    setStage(next);
  };

  const submitAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError('');
    if (mode === 'signup') {
      if (name.trim().length < 2) {
        setError('Tell us your full name.');
        return;
      }
      if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
        setError('Enter a valid email address.');
        return;
      }
    }
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) {
      setError('Enter a valid Nigerian phone number.');
      return;
    }
    setBusy(true);
    const result = await store.requestSignInCode(`+234${digits.slice(-10)}`);
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? 'Could not send a code.');
      return;
    }
    setChallengeId(result.challengeId);
    setDevCode(result.devCode);
    setOffline(Boolean(result.offline));
    go('otp');
  };

  const submitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError('');
    if (code.length < 6) {
      setError('Enter all six digits.');
      return;
    }
    setBusy(true);
    const result = await store.verifySignInCode({
      challengeId,
      code,
      name,
      email,
      phone: `+234 ${phone.trim()}`,
      mode,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? 'That code did not work.');
      return;
    }
    go('pin');
  };

  const enterWithPasskey = () => {
    signInDemoRef.current();
    onDone();
  };

  const handlePasskey = async () => {
    setPasskeyNote('');
    if (!passkey) {
      setAskForPasskey(true);
      return;
    }
    setPasskeyBusy(true);
    try {
      await verifyPasskey();
      enterWithPasskey();
    } catch (err) {
      setPasskeyNote(passkeyErrorMessage(err));
    } finally {
      setPasskeyBusy(false);
    }
  };

  const handleCreatePasskey = async () => {
    setPasskeyBusy(true);
    setPasskeyNote('');
    try {
      const stored = await createPasskey(name.trim() || 'Apex demo account');
      setPasskey(stored);
      setAskForPasskey(false);
      enterWithPasskey();
    } catch (err) {
      setAskForPasskey(false);
      setPasskeyNote(passkeyErrorMessage(err));
    } finally {
      setPasskeyBusy(false);
    }
  };

  useEffect(() => {
    if (pin.length === 4) {
      const timer = window.setTimeout(onDone, 260);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [pin, onDone]);

  if (stage === 'welcome') {
    return (
      <div className="welcome">
        <img className="welcome-img" src="./assets/hero-spheres.webp" alt="" />

        <div className="welcome-content">
          <div className="welcome-brand">
            <ApexMark size={30} />
            <b>Apex Finance</b>
          </div>
          <h1>
            Your money,
            <br />
            moving forward.
          </h1>
          <p>
            Save steadily, access funds and own pieces of great companies — from one simple
            app.
          </p>
          <div className="welcome-trust">
            <div>
              <ShieldCheck size={16} /> Identity-protected accounts
            </div>
            <div>
              <Lock size={16} /> Clearly disclosed fees &amp; limits
            </div>
          </div>
          <div className="welcome-cta">
            <button
              type="button"
              className="primary"
              onClick={() => {
                setMode('signup');
                go('auth');
              }}
            >
              Create free account
            </button>
            <button
              type="button"
              className="ghost"
              onClick={() => {
                setMode('signin');
                go('auth');
              }}
            >
              Sign in
            </button>
          </div>
          <p className="welcome-note">Demo experience · no real money moves</p>
        </div>
      </div>
    );
  }

  if (stage === 'auth') {
    const signup = mode === 'signup';
    return (
      <div className="auth theme-light">
        <button className="back" aria-label="Back" onClick={() => go('welcome')}>
          <ArrowLeft size={20} />
        </button>
        <div className="auth-mark">
          <ApexMark size={46} />
        </div>
        <h1>{signup ? 'Create your Apex account' : 'Welcome back'}</h1>
        <p className="auth-sub">
          {signup
            ? 'Use a Nigerian number. We will send a six-digit code to confirm it.'
            : 'Sign in with the phone number registered on your Apex account. Demo: 803 555 0147 opens the shared demo account; any other number gets its own.'}
        </p>
        <form className="auth-form" onSubmit={submitAuth}>
          {signup && (
            <label className="field">
              <span>Full name</span>
              <input
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Chidera Okonkwo"
              />
            </label>
          )}
          {signup && (
            <label className="field">
              <span>Email</span>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </label>
          )}
          <label className="field">
            <span>Phone number</span>
            <div className="phone-field">
              <span className="cc">+234</span>
              <input
                inputMode="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="803 555 0147"
              />
            </div>
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
            {busy ? 'Sending code…' : signup ? 'Send code' : 'Continue'} <ArrowRight size={17} />
          </button>
        </form>
        {!signup && supportsPasskey && (
          <div className="passkey-block">
            <div className="passkey-rule">
              <span>or</span>
            </div>
            <button
              type="button"
              className="passkey-btn"
              onClick={handlePasskey}
              disabled={passkeyBusy}
            >
              <Fingerprint size={18} />
              {passkeyBusy
                ? 'Waiting for your device…'
                : passkey
                  ? 'Sign in with a passkey'
                  : 'Use a passkey'}
            </button>
            {passkeyNote && (
              <p className="passkey-note" role="status">
                {passkeyNote}
              </p>
            )}
            {askForPasskey ? (
              <div className="passkey-ask" role="dialog" aria-label="Set up a passkey">
                <b>Set up a passkey on this device?</b>
                <p>
                  Use your fingerprint, face or screen lock. In this demo the passkey opens the
                  demo account without a code.
                </p>
                <div>
                  <button
                    type="button"
                    className="passkey-create"
                    onClick={handleCreatePasskey}
                    disabled={passkeyBusy}
                  >
                    Create passkey
                  </button>
                  <button
                    type="button"
                    className="passkey-cancel"
                    onClick={() => setAskForPasskey(false)}
                  >
                    Not now
                  </button>
                </div>
              </div>
            ) : (
              !passkey && (
                <p className="passkey-hint">No passkey on this device yet. You can add one.</p>
              )
            )}
          </div>
        )}
        <p className="legal">
          By continuing you agree to the demo terms. Apex Finance is a portfolio concept, not a licensed financial
          institution.
        </p>
      </div>
    );
  }

  if (stage === 'otp') {
    return (
      <div className="auth theme-light">
        <button className="back" aria-label="Back" onClick={() => go('auth')}>
          <ArrowLeft size={20} />
        </button>
        <div className="auth-mark soft">
          <Smartphone size={26} />
        </div>
        <h1>Enter your code</h1>
        <p className="auth-sub">
          Sent to +234 {phone}.{' '}
          {devCode ? (
            <b className="demo-hint">Demo: the code is {devCode}.</b>
          ) : offline ? (
            <b className="demo-hint">Offline demo: any 6 digits work.</b>
          ) : null}
        </p>
        <form className="auth-form" onSubmit={submitCode}>
          <label className="field">
            <span>Six-digit code</span>
            <input
              className="code-input"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="••••••"
              autoFocus
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
            {busy ? 'Checking…' : 'Verify code'}
          </button>
          {devCode && (
            <button className="demo-link" type="button" onClick={() => setCode(devCode)}>
              Use demo code {devCode}
            </button>
          )}
        </form>
      </div>
    );
  }

  return (
    <div className="auth theme-light pin">
      <button className="back" aria-label="Back" onClick={() => go('otp')}>
        <ArrowLeft size={20} />
      </button>
      <div className="auth-mark soft">
        <Lock size={24} />
      </div>
      <h1>{mode === 'signup' ? 'Set a 4-digit PIN' : 'Enter your PIN'}</h1>
      <p className="auth-sub">
        {mode === 'signup'
          ? 'This PIN unlocks the app on this device. It is stored only as a demo preference.'
          : 'Enter the PIN you set on this device to open your account.'}
      </p>
      <div className="pin-dots" role="status" aria-label={`${pin.length} of 4 digits entered`}>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={pin.length > i ? 'filled' : ''} />
        ))}
      </div>
      <div className="keypad">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <button key={n} onClick={() => setPin((p) => (p + n).slice(0, 4))}>
            {n}
          </button>
        ))}
        <button className="ghost-key" onClick={() => setPin('')} aria-label="Clear">
          Clear
        </button>
        <button onClick={() => setPin((p) => (p + '0').slice(0, 4))}>0</button>
        <button className="ghost-key" onClick={() => setPin((p) => p.slice(0, -1))} aria-label="Delete digit">
          <Minus size={20} />
        </button>
      </div>
      <p className="pin-hint">
        {pin.length === 4
          ? mode === 'signup'
            ? 'Creating your account…'
            : 'Opening your workspace…'
          : 'Demo: choose any four digits'}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Overlays                                                            */
/* ------------------------------------------------------------------ */

function OverlayView({
  overlay,
  open,
  close,
  install,
  onSignOut,
}: {
  overlay: Overlay;
  open: (o: Overlay) => void;
  close: () => void;
  install: InstallCtx;
  onSignOut: () => void;
}) {
  switch (overlay.type) {
    case 'notifications':
      return <NotificationsSheet close={close} />;
    case 'activity':
      return <ActivitySheet close={close} open={open} />;
    case 'plan':
      return <PlanSheet id={overlay.id} close={close} open={open} />;
    case 'stock':
      return <StockSheet symbol={overlay.symbol} close={close} open={open} />;
    case 'order':
      return <OrderSheet symbol={overlay.symbol} side={overlay.side} close={close} open={open} />;
    case 'money':
      return <MoneySheet mode={overlay.mode} planId={overlay.planId} close={close} open={open} />;
    case 'newPlan':
      return <NewPlanSheet close={close} open={open} />;
    case 'receipt':
      return <ReceiptSheet txn={overlay.txn} close={close} />;
    case 'kyc':
      return <KycSheet close={close} />;
    case 'banks':
      return <BanksSheet close={close} />;
    case 'install':
      return <InstallSheet close={close} install={install} />;
    case 'account':
      return <AccountDetailsSheet close={close} open={open} onSignOut={onSignOut} />;
    case 'info':
      return <InfoSheet title={overlay.title} body={overlay.body} close={close} />;
    default:
      return null;
  }
}

function Sheet({
  title,
  subtitle,
  close,
  children,
  tall = false,
}: {
  title: string;
  subtitle?: string;
  close: () => void;
  children: React.ReactNode;
  tall?: boolean;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(close);
  closeRef.current = close;

  useEffect(() => {
    const focusables = () =>
      Array.from(
        sheetRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((el) => el.offsetParent !== null);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    const prev = document.activeElement as HTMLElement | null;
    document.addEventListener('keydown', onKey);
    document.body.classList.add('sheet-open');
    sheetRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('sheet-open');
      if (prev?.isConnected) prev.focus?.();
    };
  }, []);

  return (
    <div className="sheet-wrap">
      <button className="scrim" aria-label="Close" onClick={close} />
      <div ref={sheetRef} tabIndex={-1} className={`sheet ${tall ? 'tall' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <span className="grab" aria-hidden="true" />
        <header className="sheet-head">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button className="icon-btn" aria-label="Close" onClick={close}>
            <X size={19} />
          </button>
        </header>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}

function AccountDetailsSheet({
  close,
  open,
  onSignOut,
}: {
  close: () => void;
  open: (o: Overlay) => void;
  onSignOut: () => void;
}) {
  const s = useStore();
  const p = s.user;
  const note = (title: string, body: string) => open({ type: 'info', title, body });

  return (
    <Sheet title="Account Details" close={close} tall>
      <div className="account-top">
        <Avatar initials={p.initials} tint={p.avatarTint} size={82} ring />
        <button
          className="account-edit"
          onClick={() =>
            note(
              'Edit profile',
              'Name, email and address changes go through identity checks in the live product. This demo keeps the sample identity fixed.',
            )
          }
        >
          Edit
        </button>
      </div>

      <div className="account-group">
        <h3>Profile</h3>
        <div className="account-card">
          <div className="account-row">
            <span>Name</span>
            <b>{p.name}</b>
          </div>
          <button
            className="account-row"
            onClick={() =>
              note('Email', `${p.email} is the address on this demo account. Changing it needs re-verification in the live product.`)
            }
          >
            <span>Email</span>
            <b>{p.email}</b>
            <ChevronRight size={15} />
          </button>
          <div className="account-row">
            <span>Phone Number</span>
            <b>{p.phone}</b>
          </div>
        </div>
      </div>

      <div className="account-group">
        <h3>Account IDs</h3>
        <div className="account-card">
          <div className="account-row">
            <span>NIN</span>
            <b>{p.nin}</b>
          </div>
          <div className="account-row">
            <span>US Stocks Acct Num.</span>
            <b>{p.usStocksAccount}</b>
          </div>
          <button
            className="account-row"
            onClick={() =>
              note(
                'Updated Password',
                'Password changes send a one-time code to your registered email in the live product. This demo signs in with a PIN on this device.',
              )
            }
          >
            <span>Updated Password</span>
            <b>Last changed 2 months ago</b>
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      <div className="account-group">
        <h3>Address</h3>
        <div className="account-card">
          <div className="account-row block">
            <span>Residential Address</span>
            <b>{p.address}</b>
          </div>
        </div>
      </div>

      <div className="account-group">
        <h3>Next of Kin</h3>
        <div className="account-card">
          <button
            className="account-row"
            onClick={() =>
              note(
                'Beneficiary Details',
                'Next of kin details are collected during full verification. This demo does not store beneficiary records.',
              )
            }
          >
            <span>Beneficiary Details</span>
            <b>Not added</b>
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      <button
        className="account-logout"
        onClick={() => {
          close();
          onSignOut();
        }}
      >
        Log Out
      </button>
    </Sheet>
  );
}

function InfoSheet({ title, body, close }: { title: string; body: string; close: () => void }) {
  return (
    <Sheet title={title} close={close}>
      <p className="sheet-note">{body}</p>
      <button className="btn btn-primary btn-block" onClick={close}>
        Got it
      </button>
    </Sheet>
  );
}

function PlanSheet({ id, close, open }: { id: string; close: () => void; open: (o: Overlay) => void }) {
  const s = useStore();
  const hide = s.prefs.hideBalance;
  const [note, setNote] = useState('');
  const plan = s.plans.find((p) => p.id === id);
  if (!plan) return null;
  const progress = plan.targetKobo ? progressPct(plan.balanceKobo, plan.targetKobo) : 100;
  const remaining = plan.targetKobo ? sub(plan.targetKobo, plan.balanceKobo) : toMinor(0);
  const locked = plan.kind === 'fixed';

  return (
    <Sheet title={plan.name} subtitle={`${kindLabel(plan.kind)} savings plan`} close={close} tall>
      <div className="plan-hero" style={{ '--plan-tint': plan.pastel } as CSSProperties}>
        <span className="plan-icon big" style={{ background: plan.color, color: '#fff' }}>
          {planIcon(plan.icon, 22)}
        </span>
        <span>Plan balance</span>
        <b>{maskAmount(hide, formatNgn(plan.balanceKobo, 2))}</b>
        {plan.targetKobo ? (
          <>
            <div className="bar big">
              <span style={{ width: `${progress}%`, background: plan.color }} />
            </div>
            <p className="plan-hero-meta">
              {progress}% of {maskAmount(hide, formatNgn(plan.targetKobo))}
              {remaining > 0 ? ` · ${maskAmount(hide, formatNgn(remaining))} to go` : ' · target reached'}
            </p>
          </>
        ) : (
          <p className="plan-hero-meta">{plan.subtitle}</p>
        )}
      </div>

      <div className="stat-list">
        <div>
          <span>Interest rate</span>
          <b>{plan.rate}% p.a.</b>
        </div>
        <div>
          <span>Opened</span>
          <b>{longDate(plan.opened)}</b>
        </div>
        {plan.maturity && (
          <div>
            <span>{plan.kind === 'fixed' ? 'Matures' : 'Target date'}</span>
            <b>{longDate(plan.maturity)}</b>
          </div>
        )}
        {plan.monthlyKobo && (
          <div>
            <span>Auto-save</span>
            <b>{maskAmount(hide, formatNgn(plan.monthlyKobo))} monthly</b>
          </div>
        )}
        <div>
          <span>Early access</span>
          <b>{locked ? 'Locked until maturity' : 'Withdraw anytime'}</b>
        </div>
      </div>

      <div className="sheet-actions">
        <button className="btn btn-primary btn-block" onClick={() => open({ type: 'money', mode: 'plan-add', planId: plan.id })}>
          <Plus size={17} /> Add money
        </button>
        <button
          className="btn btn-ghost btn-block"
          onClick={() =>
            locked
              ? setNote('Fixed plans stay locked until their maturity date in this demo.')
              : open({ type: 'money', mode: 'plan-withdraw', planId: plan.id })
          }
        >
          {locked ? (
            <>
              <Lock size={16} /> Locked until maturity
            </>
          ) : (
            <>
              <ArrowUpRight size={16} /> Withdraw
            </>
          )}
        </button>
      </div>
      {note && <p className="form-error sheet-note">{note}</p>}
      <p className="foot-note">Rates are illustrative. Partner terms shown before any real deposit.</p>
    </Sheet>
  );
}

function StockSheet({ symbol, close, open }: { symbol: string; close: () => void; open: (o: Overlay) => void }) {
  const s = useStore();
  const stock = stockFor(symbol);
  if (!stock) return null;
  const holding = s.holdings.find((h) => h.symbol === symbol);
  const c = (value: Minor) => minorText(stock.currency, value);
  const pctChange = pct(stock.change, 2);

  return (
    <Sheet title={stock.name} subtitle={`${stock.exchange} · ${stock.sector}`} close={close} tall>
      <div className="stock-hero">
        <span className="tile big" style={{ background: stock.tint }}>
          {stock.symbol.slice(0, 2)}
        </span>
        <div className="stock-price">
          <b>{c(toMinor(stock.price))}</b>
          <span className={stock.change >= 0 ? 'delta up' : 'delta down'}>{pctChange} today</span>
        </div>
      </div>
      <div className="stock-chart">
        <Sparkline
          data={stock.spark}
          width={340}
          height={104}
          stroke={stock.change >= 0 ? '#0B8A13' : '#D92D20'}
          showDot
          strokeWidth={2.4}
        />
      </div>
      <div className="range-row">
        <span>Day low {c(toMinor(stock.price * 0.985))}</span>
        <span>Day high {c(toMinor(stock.price * 1.011))}</span>
      </div>

      <p className="stock-about">{stock.about}</p>

      <div className="stat-grid">
        <div>
          <span>Market cap</span>
          <b>{stock.marketCap}</b>
        </div>
        <div>
          <span>P/E ratio</span>
          <b>{stock.pe}</b>
        </div>
        <div>
          <span>Volume</span>
          <b>{stock.volume}</b>
        </div>
        <div>
          <span>Currency</span>
          <b>{stock.currency}</b>
        </div>
      </div>

      {holding && (
        <div className="holding-note">
          <span>You hold {holding.units} units</span>
          <b>{maskAmount(s.prefs.hideBalance, c(toMinor(holding.units * stock.price)))}</b>
        </div>
      )}

      <div className="sheet-actions row-actions">
        <button className="btn btn-primary" onClick={() => open({ type: 'order', symbol, side: 'buy' })}>
          Buy
        </button>
        <button
          className="btn btn-ghost"
          disabled={!holding}
          onClick={() => open({ type: 'order', symbol, side: 'sell' })}
        >
          Sell
        </button>
      </div>
      <p className="foot-note">Prices delayed at least 15 minutes. Orders are simulated in this demo.</p>
    </Sheet>
  );
}

function OrderSheet({
  symbol,
  side,
  close,
  open,
}: {
  symbol: string;
  side: 'buy' | 'sell';
  close: () => void;
  open: (o: Overlay) => void;
}) {
  const s = useStore();
  const stock = stockFor(symbol);
  const [units, setUnits] = useState(1);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (!stock) return null;
  const holding = s.holdings.find((h) => h.symbol === symbol);
  const gross = toMinor(units * stock.price);
  const fee = pctOf(gross, 1.5);
  const total = side === 'buy' ? add(gross, fee) : sub(gross, fee);
  const available = stock.currency === 'USD' ? s.walletUsdCents : s.walletNgnKobo;
  const c = (value: Minor) => minorText(stock.currency, value);
  const maxUnits = holding?.units ?? 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const result: MoneyResult = await s.trade(symbol, units, side);
    if (!result.ok) {
      setBusy(false);
      setError(result.error ?? 'Order could not be placed.');
      return;
    }
    if (result.txn) open({ type: 'receipt', txn: result.txn });
    else close();
  };

  return (
    <Sheet title={`${side === 'buy' ? 'Buy' : 'Sell'} ${symbol}`} subtitle={`${stock.name} · ${stock.exchange}`} close={close}>
      <form onSubmit={submit} className="order-form">
        <div className="order-price">
          <span>Market price</span>
          <b>{c(toMinor(stock.price))}</b>
        </div>
        <label className="field">
          <span>Units</span>
          <div className="stepper">
            <button type="button" aria-label="Fewer units" onClick={() => setUnits((u) => Math.max(1, u - 1))}>
              <Minus size={16} />
            </button>
            <input
              inputMode="numeric"
              value={units}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, '');
                setUnits(v ? Math.max(1, Number(v)) : 1);
              }}
            />
            <button type="button" aria-label="More units" onClick={() => setUnits((u) => u + 1)}>
              <Plus size={16} />
            </button>
          </div>
        </label>
        {side === 'sell' && <p className="help">You hold {maxUnits} units. Selling all closes the position.</p>}
        {side === 'buy' && (
          <p className="help">
            Available: {maskAmount(s.prefs.hideBalance, minorText(stock.currency, available))}
            {stock.currency === 'USD' ? ' · FX quoted at ₦1,600 / $1' : ''}
          </p>
        )}
        <div className="order-lines">
          <div>
            <span>Gross value</span>
            <b>{c(gross)}</b>
          </div>
          <div>
            <span>Fee (1.5%)</span>
            <b>{c(fee)}</b>
          </div>
          <div className="total">
            <span>{side === 'buy' ? 'Total debit' : 'Net proceeds'}</span>
            <b>{c(total)}</b>
          </div>
        </div>
        {error && <p className="form-error">{error}</p>}
        <button className="btn btn-primary btn-block" type="submit" disabled={busy} aria-busy={busy}>
          {side === 'buy' ? 'Confirm purchase' : 'Confirm sale'}
        </button>
        <p className="foot-note">Simulated order. No real shares are bought or sold.</p>
      </form>
    </Sheet>
  );
}

function MoneySheet({
  mode,
  planId,
  close,
  open,
}: {
  mode: MoneyMode;
  planId?: string;
  close: () => void;
  open: (o: Overlay) => void;
}) {
  const s = useStore();
  const plan = planId ? s.plans.find((p) => p.id === planId) : undefined;
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState(s.banks.find((b) => b.primary)?.name ?? s.banks[0]?.name ?? 'GTBank');
  const [recipient, setRecipient] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const value = parseNgn(amount) ?? toMinor(0);

  const config: Record<MoneyMode, { title: string; subtitle: string; cta: string; available: Minor; prefix: string }> = {
    add: { title: 'Add money', subtitle: 'Fund your naira wallet from a linked bank', cta: 'Add money', available: toMinor(10_000_000), prefix: '₦' },
    withdraw: { title: 'Withdraw', subtitle: 'Send from your wallet to a linked bank', cta: 'Withdraw', available: s.walletNgnKobo, prefix: '₦' },
    transfer: { title: 'Send money', subtitle: 'Instant transfer to an Apex tag or bank', cta: 'Send money', available: s.walletNgnKobo, prefix: '₦' },
    'plan-add': {
      title: plan ? `Add to ${plan.name}` : 'Add to plan',
      subtitle: 'Move money from your wallet into this plan',
      cta: 'Confirm top-up',
      available: s.walletNgnKobo,
      prefix: '₦',
    },
    'plan-withdraw': {
      title: plan ? `Withdraw from ${plan.name}` : 'Withdraw from plan',
      subtitle: 'Move this money back to your wallet',
      cta: 'Confirm withdrawal',
      available: plan?.balanceKobo ?? toMinor(0),
      prefix: '₦',
    },
  };
  const cfg = config[mode];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    let result: MoneyResult;
    if (mode === 'add') result = await s.addMoney(value, source);
    else if (mode === 'withdraw') result = s.withdraw(value, source);
    else if (mode === 'transfer') result = s.transfer(value, recipient);
    else if (mode === 'plan-add' && plan) result = await s.planDeposit(plan.id, value);
    else if (mode === 'plan-withdraw' && plan) result = s.planWithdraw(plan.id, value);
    else result = { ok: false, error: 'Plan not found.' };

    if (!result.ok) {
      setBusy(false);
      setError(result.error ?? 'That did not work.');
      return;
    }
    if (result.txn) open({ type: 'receipt', txn: result.txn });
    else close();
  };

  return (
    <Sheet title={cfg.title} subtitle={cfg.subtitle} close={close}>
      <form className="money-form" onSubmit={submit}>
        <label className="amount-field">
          <span>{cfg.prefix}</span>
          <input
            inputMode="decimal"
            placeholder="0"
            value={amount}
            autoFocus
            onChange={(e) => {
              const raw = e.target.value.replace(/[^\d.]/g, '');
              const [whole, ...rest] = raw.split('.');
              setAmount(rest.length ? `${whole}.${rest.join('').slice(0, 2)}` : whole);
            }}
          />
        </label>
        <div className="quick-chips">
          {[5000, 10000, 25000, 50000].map((n) => (
            <button key={n} type="button" className="chip" onClick={() => setAmount(String(n))}>
              {compactNgn(toMinor(n))}
            </button>
          ))}
          <button type="button" className="chip" onClick={() => setAmount(formatPlain(cfg.available))}>
            Max
          </button>
        </div>
        <p className="help">
          Available {mode === 'add' ? 'limit' : 'balance'}: {maskAmount(s.prefs.hideBalance, formatNgn(cfg.available))}
        </p>

        {mode === 'transfer' ? (
          <label className="field">
            <span>Recipient</span>
            <input
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="@chinedu or full name"
            />
          </label>
        ) : (
          <label className="field">
            <span>{mode === 'add' ? 'Fund from' : 'Send to'}</span>
            <div className="select-wrap">
              <select value={source} onChange={(e) => setSource(e.target.value)}>
                {s.banks.length > 0 ? (
                  s.banks.map((b) => (
                    <option key={b.id} value={b.name}>
                      {b.name} · {b.account}
                    </option>
                  ))
                ) : (
                  <option value="GTBank">GTBank · demo rails</option>
                )}
              </select>
              <ChevronRight size={16} className="select-chevron" />
            </div>
          </label>
        )}

        <div className="order-lines">
          <div>
            <span>Fee</span>
            <b>₦0.00</b>
          </div>
          <div>
            <span>Settlement</span>
            <b>Instant in demo</b>
          </div>
        </div>

        {error && <p className="form-error">{error}</p>}
        <button className="btn btn-primary btn-block" type="submit" disabled={value <= 0 || busy} aria-busy={busy}>
          {cfg.cta}
        </button>
        <p className="foot-note">Demo only. No real funds move and no bank is contacted.</p>
      </form>
    </Sheet>
  );
}

function NewPlanSheet({ close, open }: { close: () => void; open: (o: Overlay) => void }) {
  const s = useStore();
  const [kind, setKind] = useState<PlanKind>('flexible');
  const [name, setName] = useState('');
  const [initial, setInitial] = useState('50000');
  const [target, setTarget] = useState('500000');
  const [monthly, setMonthly] = useState('25000');
  const [error, setError] = useState('');
  const kinds: { kind: PlanKind; title: string; body: string; icon: typeof Zap; color: string; pastel: string }[] = [
    { kind: 'flexible', title: 'Flexible', body: 'Withdraw anytime, interest monthly', icon: Zap, color: '#1D52CE', pastel: '#DCE9FF' },
    { kind: 'fixed', title: 'Fixed', body: 'Lock for 90 days at a higher rate', icon: Lock, color: '#760A81', pastel: '#F4CCF9' },
    { kind: 'target', title: 'Target', body: 'Save toward a date and amount', icon: Target, color: '#06720C', pastel: '#C3F3C6' },
  ];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = s.createPlan({
      name,
      kind,
      initial: parseNgn(initial) ?? toMinor(0),
      target: kind === 'target' ? (parseNgn(target) ?? toMinor(0)) : undefined,
      monthly: kind === 'target' ? (parseNgn(monthly) ?? toMinor(0)) : undefined,
    });
    if (!result.ok) {
      setError(result.error ?? 'Could not create the plan.');
      return;
    }
    if (result.txn) open({ type: 'receipt', txn: result.txn });
    else close();
  };

  return (
    <Sheet title="New savings plan" subtitle="Choose the behaviour that fits your goal" close={close} tall>
      <form className="newplan-form" onSubmit={submit}>
        <div className="kind-grid">
          {kinds.map(({ kind: k, title, body, icon: Icon, color, pastel }) => (
            <button
              key={k}
              type="button"
              className={`kind-card ${kind === k ? 'active' : ''}`}
              style={{ '--plan-tint': pastel } as CSSProperties}
              onClick={() => setKind(k)}
              aria-pressed={kind === k}
            >
              <span className="plan-icon" style={{ background: kind === k ? color : pastel, color: kind === k ? '#fff' : color }}>
                <Icon size={17} />
              </span>
              <b>{title}</b>
              <em>{body}</em>
            </button>
          ))}
        </div>

        <label className="field">
          <span>Plan name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. July rent" maxLength={32} />
        </label>
        <label className="field">
          <span>Start with</span>
          <div className="money-inline">
            <span>₦</span>
            <input
              inputMode="numeric"
              value={initial}
              onChange={(e) => setInitial(e.target.value.replace(/\D/g, ''))}
              placeholder="50000"
            />
          </div>
        </label>
        {kind === 'target' && (
          <div className="two-fields">
            <label className="field">
              <span>Target amount</span>
              <div className="money-inline">
                <span>₦</span>
                <input
                  inputMode="numeric"
                  value={target}
                  onChange={(e) => setTarget(e.target.value.replace(/\D/g, ''))}
                  placeholder="500000"
                />
              </div>
            </label>
            <label className="field">
              <span>Monthly auto-save</span>
              <div className="money-inline">
                <span>₦</span>
                <input
                  inputMode="numeric"
                  value={monthly}
                  onChange={(e) => setMonthly(e.target.value.replace(/\D/g, ''))}
                  placeholder="25000"
                />
              </div>
            </label>
          </div>
        )}
        <p className="help">
          Wallet balance: {maskAmount(s.prefs.hideBalance, formatNgn(s.walletNgnKobo))}. The starting amount moves from your
          wallet.
        </p>
        {error && <p className="form-error">{error}</p>}
        <button className="btn btn-primary btn-block" type="submit">
          Create plan
        </button>
      </form>
    </Sheet>
  );
}

function ReceiptSheet({ txn, close }: { txn: TxnDto; close: () => void }) {
  const s = useStore();
  const hide = s.prefs.hideBalance;
  const failed = txn.status === 'Failed';
  const positive = txn.amountKobo > 0 && !failed;
  return (
    <Sheet title="Receipt" subtitle="Saved to your demo activity" close={close}>
      <div className="receipt">
        <span className={`receipt-check ${failed ? 'failed' : ''}`}>
          {failed ? <X size={26} /> : <Check size={28} />}
        </span>
        <h3>{failed ? 'Payment failed' : positive ? 'Money received' : 'Payment sent'}</h3>
        <b className={positive ? 'receipt-amount up' : `receipt-amount${failed ? ' void' : ''}`}>
          {maskAmount(hide, `${failed ? '' : positive ? '+' : '−'}${formatNgn(abs(txn.amountKobo), 2)}`)}
        </b>
        <p className="receipt-meta">{txn.title}</p>
        <div className="receipt-lines">
          <div>
            <span>Status</span>
            <b>{txn.status}</b>
          </div>
          <div>
            <span>Date</span>
            <b>{longDate(txn.date)}</b>
          </div>
          <div>
            <span>Reference</span>
            <b className="mono">{txn.ref}</b>
          </div>
          <div>
            <span>Type</span>
            <b>{txn.meta}</b>
          </div>
        </div>
      </div>
      <button className="btn btn-primary btn-block" onClick={close}>
        Done
      </button>
      <p className="foot-note">Demo receipt. Not a bank statement or tax document.</p>
    </Sheet>
  );
}

function NotificationsSheet({ close }: { close: () => void }) {
  const s = useStore();
  const unread = s.notifications.filter((n) => n.unread).length;
  const icon = (kind: string) => {
    if (kind === 'security') return <ShieldCheck size={18} />;
    if (kind === 'savings') return <PiggyBank size={18} />;
    if (kind === 'invest') return <TrendingUp size={18} />;
    return <BadgeCheck size={18} />;
  };
  return (
    <Sheet title="Notifications" subtitle={unread ? `${unread} unread` : 'You are all caught up'} close={close} tall>
      {unread > 0 && (
        <button className="mark-read" onClick={s.markAllRead}>
          Mark all as read
        </button>
      )}
      <div className="notif-list">
        {s.notifications.map((n) => (
          <article key={n.id} className={`notif ${n.unread ? 'unread' : ''}`}>
            <span className={`notif-icon ${n.kind}`}>{icon(n.kind)}</span>
            <div>
              <b>{n.title}</b>
              <p>{n.body}</p>
              <em>{relativeTime(n.time)}</em>
            </div>
          </article>
        ))}
      </div>
    </Sheet>
  );
}

function ActivitySheet({ close, open }: { close: () => void; open: (o: Overlay) => void }) {
  const s = useStore();
  const hide = s.prefs.hideBalance;
  const [filter, setFilter] = useState<'all' | 'in' | 'out' | 'savings' | 'invest'>('all');
  const list = s.txns.filter((t) => {
    if (filter === 'all') return true;
    const settled = t.status !== 'Failed';
    if (filter === 'in') return settled && t.amountKobo > 0 && t.type !== 'savings' && t.type !== 'invest';
    if (filter === 'out') return settled && t.amountKobo < 0 && t.type !== 'savings' && t.type !== 'invest';
    return t.type === filter;
  });

  return (
    <Sheet title="Activity" subtitle={`${s.txns.length} records · demo ledger`} close={close} tall>
      <div className="chips sticky-chips">
        {(
          [
            ['all', 'All'],
            ['in', 'Money in'],
            ['out', 'Money out'],
            ['savings', 'Savings'],
            ['invest', 'Invest'],
          ] as const
        ).map(([key, label]) => (
          <button key={key} className={filter === key ? 'chip active' : 'chip'} onClick={() => setFilter(key)}>
            {label}
          </button>
        ))}
      </div>
      <div className="rows card">
        {list.map((t) => {
          const credited = t.amountKobo > 0 && t.status !== 'Failed';
          return (
            <button key={t.id} className="row txn-row" onClick={() => open({ type: 'receipt', txn: t })}>
              <span className={`row-icon ${credited ? 'in' : 'out'} ${t.status === 'Failed' ? 'failed' : ''}`}>
                {credited ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
              </span>
              <span className="row-main">
                <span className="row-title">{t.title}</span>
                <span className="row-sub">
                  {shortDate(t.date)} · {t.ref}
                </span>
              </span>
              <span className="row-end">
                <b className={credited ? 'green' : t.status === 'Failed' ? 'void' : ''}>
                  {maskAmount(hide, t.status === 'Failed' ? formatNgn(abs(t.amountKobo)) : `${credited ? '+' : '−'}${formatNgn(abs(t.amountKobo))}`)}
                </b>
                <span className={t.status === 'Failed' ? 'delta down' : 'delta muted'}>{t.status}</span>
              </span>
            </button>
          );
        })}
      </div>
      <p className="foot-note">Every figure here is sample data. Withdrawals do not reach a real bank.</p>
    </Sheet>
  );
}

function KycSheet({ close }: { close: () => void }) {
  const s = useStore();
  const levels = [
    {
      level: 0,
      title: 'Level 0 · Phone only',
      body: 'Browse products, no money movement.',
    },
    {
      level: 1,
      title: 'Level 1 · Phone + email',
      body: 'Small wallet limits and savings top-ups.',
    },
    {
      level: 2,
      title: 'Level 2 · BVN + NIN',
      body: 'Full wallet, savings and investing. Daily limits raised.',
    },
    {
      level: 3,
      title: 'Level 3 · Address + income',
      body: 'Higher limits after a short manual review.',
    },
  ].map((l) => ({
    ...l,
    state: l.level < s.user.kycLevel ? 'Complete' : l.level === s.user.kycLevel ? 'Current' : 'Optional',
  }));
  return (
    <Sheet title="Verification" subtitle={s.user.kycLabel} close={close} tall>
      <div className="kyc-user">
        <Avatar initials={s.user.initials} tint={s.user.avatarTint} size={46} />
        <div>
          <b>{s.user.name}</b>
          <span>BVN {s.user.bvn} · NIN {s.user.nin}</span>
        </div>
      </div>
      <div className="kyc-list">
        {levels.map((l) => (
          <div key={l.title} className={`kyc-level ${l.state === 'Current' ? 'current' : ''}`}>
            <span className={`kyc-dot ${l.state === 'Complete' ? 'done' : l.state === 'Current' ? 'now' : ''}`}>
              {l.state === 'Complete' ? <Check size={13} /> : l.state === 'Current' ? <ShieldCheck size={13} /> : null}
            </span>
            <div>
              <b>{l.title}</b>
              <p>{l.body}</p>
            </div>
            <em>{l.state}</em>
          </div>
        ))}
      </div>
      <p className="foot-note">
        KYC tiers follow CBN expectations in this concept. Documents are never uploaded in the demo.
      </p>
    </Sheet>
  );
}

function BanksSheet({ close }: { close: () => void }) {
  const s = useStore();
  const [note, setNote] = useState('');
  return (
    <Sheet title="Linked banks" subtitle="Accounts used for funding and withdrawals" close={close}>
      <div className="bank-list">
        {s.banks.map((b) => (
          <div key={b.id} className="bank-row">
            <span className="menu-icon blue">
              <Landmark size={18} />
            </span>
            <div>
              <b>{b.name}</b>
              <span>{b.account}</span>
            </div>
            {b.primary && <em className="primary-pill">Primary</em>}
          </div>
        ))}
      </div>
      <button
        className="btn btn-ghost btn-block"
        onClick={() => setNote('Adding a bank needs a partner verification step, which this demo does not include.')}
      >
        Add another bank
      </button>
      {note && <p className="help">{note}</p>}
      <p className="foot-note">Demo accounts only. Real funding uses a partner bank or payment processor.</p>
    </Sheet>
  );
}

function InstallSheet({ close, install }: { close: () => void; install: InstallCtx }) {
  const [note, setNote] = useState('');
  const tryInstall = async () => {
    const installed = await install.prompt();
    setNote(installed ? 'Apex is installing. Check your home screen.' : 'Install was dismissed. You can try again from the browser menu.');
  };

  return (
    <Sheet title="Install Apex" subtitle="A full-screen app with its own icon" close={close} tall>
      <div className="install-hero">
        <span className="install-phone">
          <span className="install-notch" />
          <ApexMark size={52} />
          <b>Apex</b>
          <em>Save · Invest · Move</em>
        </span>
      </div>

      {install.installed ? (
        <div className="installed-note">
          <BadgeCheck size={20} />
          <div>
            <b>Already installed</b>
            <p>You are running Apex in standalone mode. Everything works offline after the first load.</p>
          </div>
        </div>
      ) : install.isIos ? (
        <ol className="install-steps">
          <li>
            <span>1</span> Open this page in Safari.
          </li>
          <li>
            <span>2</span> Tap the Share button in the toolbar.
          </li>
          <li>
            <span>3</span> Choose “Add to Home Screen”, then Add.
          </li>
        </ol>
      ) : install.available ? (
        <button className="btn btn-primary btn-block" onClick={tryInstall}>
          <Download size={17} /> Install Apex
        </button>
      ) : (
        <ol className="install-steps">
          <li>
            <span>1</span> Open the browser menu.
          </li>
          <li>
            <span>2</span> Choose “Install app” or “Add to Home screen”.
          </li>
          <li>
            <span>3</span> Confirm — Apex opens without browser chrome.
          </li>
        </ol>
      )}

      {note && <p className="help">{note}</p>}

      <div className="install-facts">
        <div>
          <Check size={16} />
          <span>Works full screen, like a native app</span>
        </div>
        <div>
          <Check size={16} />
          <span>Offline shell after the first visit</span>
        </div>
        <div>
          <Check size={16} />
          <span>Balances and toggles stay on this device</span>
        </div>
      </div>
      <p className="foot-note">
        Installing never grants access to real money. This is a portfolio demo of the Apex concept.
      </p>
    </Sheet>
  );
}
