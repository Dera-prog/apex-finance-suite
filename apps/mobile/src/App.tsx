import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Bell,
  BellRing,
  ChartNoAxesCombined,
  Check,
  ChevronRight,
  Download,
  Eye,
  EyeOff,
  FileText,
  Fingerprint,
  Home,
  Info,
  Landmark,
  Lock,
  LogOut,
  Minus,
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
import { Avatar, ApexMark, Logo, Sparkline } from '@shared/ui';
import {
  compactNaira,
  longDate,
  marketMovers,
  ngn,
  pct,
  relativeTime,
  shortDate,
  stocks,
  usd,
} from '@shared/data';
import type { Plan, PlanKind, Txn } from '@shared/data';
import { links, isLive } from '@shared/links';
import { stockFor, useStore } from './store';
import type { MoneyResult } from './store';

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
  | { type: 'receipt'; txn: Txn }
  | { type: 'kyc' }
  | { type: 'banks' }
  | { type: 'install' };

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

const SESSION_KEY = 'apex.mobile.session';
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
const holdingGain = (avg: number, price: number) => ((price - avg) / avg) * 100;
const priceText = (currency: 'NGN' | 'USD', value: number) =>
  currency === 'USD' ? usd(value) : ngn(value, 2);
const progressPct = (balance: number, target: number) => Math.min(100, Math.floor((balance / target) * 100));

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

export default function App() {
  const [stage, setStage] = useState<Stage>(() => (localStorage.getItem(SESSION_KEY) === 'on' ? 'app' : 'welcome'));
  const install = useInstall();

  const begin = () => {
    localStorage.setItem(SESSION_KEY, 'on');
    setStage('app');
  };
  const signOut = () => {
    localStorage.removeItem(SESSION_KEY);
    setStage('welcome');
  };

  return (
    <div className="app">
      {stage === 'app' ? (
        <Main install={install} onSignOut={signOut} />
      ) : (
        <AuthFlow stage={stage} setStage={setStage} onDone={begin} />
      )}
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

  const open = (next: Overlay) => setOverlay(next);
  const close = () => setOverlay(null);
  const goTab = (next: Tab) => {
    setOverlay(null);
    setTab(next);
  };

  const dismissBanner = () => {
    localStorage.setItem('apex.mobile.installDismissed', 'on');
    setBannerDismissed(true);
  };

  return (
    <>
      {tab === 'home' && (
        <HomeScreen
          open={open}
          goTab={goTab}
          install={install}
          showBanner={!bannerDismissed && !install.installed && (install.available || install.isIos)}
          dismissBanner={dismissBanner}
        />
      )}
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

      {overlay && <OverlayView overlay={overlay} open={open} close={close} install={install} />}
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
        <div className="hero-amount">{maskAmount(hide, ngn(s.total, 2))}</div>
        <div className="hero-meta">
          <span className="hero-chip">
            <TrendingUp size={13} /> {pct(4.8)} · {maskAmount(hide, `+${ngn(73000)}`)}
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
            <b>{maskAmount(hide, ngn(s.walletNgn))}</b>
          </div>
          <div>
            <span>Savings</span>
            <b>{maskAmount(hide, ngn(s.savings))}</b>
          </div>
          <div>
            <span>Invest</span>
            <b>{maskAmount(hide, ngn(s.investNgn))}</b>
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
            const pctDone = plan.target ? progressPct(plan.balance, plan.target) : 100;
            return (
              <button
                key={plan.id}
                className="plan-mini"
                style={{ background: `linear-gradient(160deg, ${plan.pastel} 0%, #fff 62%)` }}
                onClick={() => open({ type: 'plan', id: plan.id })}
              >
                <span className="plan-mini-top">
                  <span className="plan-icon" style={{ background: '#fff', color: plan.color }}>
                    {planIcon(plan.icon, 16)}
                  </span>
                  <span className="mini-rate">{plan.rate}% p.a.</span>
                </span>
                <span className="plan-mini-name">{plan.name}</span>
                <span className="plan-mini-balance">{maskAmount(hide, ngn(plan.balance))}</span>
                <span className="bar" aria-hidden="true">
                  <span style={{ width: `${pctDone}%`, background: plan.color }} />
                </span>
                <span className="plan-mini-foot">
                  {plan.target ? `${pctDone}% of ${compactNaira(plan.target)}` : 'Withdraw anytime'}
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
            const positive = t.amount > 0;
            return (
              <button key={t.id} className="row txn-row" onClick={() => open({ type: 'receipt', txn: t })}>
                <span className={`row-icon ${positive ? 'in' : 'out'} ${t.status === 'Failed' ? 'failed' : ''}`}>
                  {t.status === 'Failed' ? <X size={16} /> : positive ? <ArrowDownLeft size={17} /> : <ArrowUpRight size={17} />}
                </span>
                <span className="row-main">
                  <span className="row-title">{t.title}</span>
                  <span className="row-sub">
                    {t.status === 'Failed' ? <em className="failed-text">Failed</em> : shortDate(t.date)} · {t.meta}
                  </span>
                </span>
                <span className={`txn-amount ${positive ? 'up' : ''}`}>{positive ? '+' : '−'}{ngn(Math.abs(t.amount))}</span>
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
/* Save                                                                */
/* ------------------------------------------------------------------ */

function SaveScreen({ open }: { open: (o: Overlay) => void }) {
  const s = useStore();
  const hide = s.prefs.hideBalance;
  const [filter, setFilter] = useState<'all' | PlanKind>('all');
  const plans = filter === 'all' ? s.plans : s.plans.filter((p) => p.kind === filter);
  const projected = Math.round(s.plans.reduce((sum, p) => sum + (p.balance * p.rate) / 100, 0));

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
          <b>{maskAmount(hide, ngn(s.savings))}</b>
        </div>
        <div className="sum-side">
          <span>Projected interest</span>
          <b className="green">{maskAmount(hide, ngn(projected))}</b>
          <em>annualised, illustrative</em>
        </div>
      </section>

      <div className="segmented" role="tablist" aria-label="Plan type">
        {(['all', 'flexible', 'fixed', 'target'] as const).map((k) => (
          <button
            key={k}
            role="tab"
            aria-selected={filter === k}
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

function PlanCard({ plan, hide, onOpen }: { plan: Plan; hide: boolean; onOpen: () => void }) {
  const progress = plan.target ? progressPct(plan.balance, plan.target) : 100;
  return (
    <article className="plan-card" style={{ background: `linear-gradient(155deg, ${plan.pastel}66 0%, #fff 48%)` }}>
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
      <div className="plan-card-balance">{maskAmount(hide, ngn(plan.balance, 2))}</div>
      {plan.target ? (
        <>
          <div className="bar big">
            <span style={{ width: `${progress}%`, background: plan.color }} />
          </div>
          <div className="bar-meta">
            <span>{progress}% of {ngn(plan.target)}</span>
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
          <span>Portfolio value</span>
          <span className="hero-chip dark">
            <TrendingUp size={13} /> {pct(4.8)}
          </span>
        </div>
        <b className="invest-total">{maskAmount(hide, ngn(s.investNgn))}</b>
        <div className="invest-split">
          <div>
            <span>NGX</span>
            <b>{maskAmount(hide, ngn(s.investNgn))}</b>
          </div>
          <div>
            <span>US shares</span>
            <b>{maskAmount(hide, usd(s.investUsd))}</b>
          </div>
          <div>
            <span>USD wallet</span>
            <b>{maskAmount(hide, usd(s.walletUsd))}</b>
          </div>
        </div>
      </section>

      <div className="segmented">
        <button className={view === 'portfolio' ? 'seg active' : 'seg'} onClick={() => setView('portfolio')}>
          Portfolio
        </button>
        <button className={view === 'market' ? 'seg active' : 'seg'} onClick={() => setView('market')}>
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
              const value = h.units * stock.price;
              const gain = holdingGain(h.avgCost, stock.price);
              return (
                <button key={h.symbol} className="row" onClick={() => open({ type: 'stock', symbol: h.symbol })}>
                  <span className="tile" style={{ background: stock.tint }}>
                    {h.symbol.slice(0, 2)}
                  </span>
                  <span className="row-main">
                    <span className="row-title">{stock.name}</span>
                    <span className="row-sub">
                      {h.units} units · avg {priceText(stock.currency, h.avgCost)}
                    </span>
                  </span>
                  <span className="row-end">
                    <b>{maskAmount(hide, stock.currency === 'USD' ? usd(value) : ngn(value))}</b>
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
  const explore = [
    { label: 'Marketing website', href: links.website },
    { label: 'Desktop workspace', href: links.desktop },
    { label: 'Case study', href: links.caseStudy },
  ].filter((l) => isLive(l.href));

  const toggle = (key: 'biometric' | 'priceAlerts' | 'hideBalance' | 'productNews') => (
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

  return (
    <div className="screen">
      <header className="screen-head">
        <h1 className="screen-title">Profile</h1>
        <button className="icon-btn" aria-label="Notifications" onClick={() => open({ type: 'notifications' })}>
          <Bell size={20} />
        </button>
      </header>

      <section className="profile-card">
        <Avatar initials={s.user.initials} tint={s.user.avatarTint} size={58} ring />
        <div>
          <b>{s.user.name}</b>
          <span>{s.user.phone}</span>
          <span className="verified">
            <BadgeCheck size={14} /> {s.user.kycLabel}
          </span>
        </div>
      </section>

      <div className="points-strip">
        <span className="points-icon">
          <Sparkles size={18} />
        </span>
        <div>
          <b>{s.user.kycLevel === 2 ? 'Level 2 account' : 'Apex account'}</b>
          <span>Full wallet, savings and investing enabled</span>
        </div>
        <button className="link-btn" onClick={() => open({ type: 'kyc' })}>
          View
        </button>
      </div>

      <div className="menu-group">
        <h3>Account</h3>
        <div className="menu">
          <button className="menu-row" onClick={() => open({ type: 'kyc' })}>
            <span className="menu-icon blue">
              <ShieldCheck size={18} />
            </span>
            <span className="menu-main">
              <b>Identity verification</b>
              <em>Level 2 · limits raised</em>
            </span>
            <ChevronRight size={17} />
          </button>
          <button className="menu-row" onClick={() => open({ type: 'banks' })}>
            <span className="menu-icon purple">
              <Landmark size={18} />
            </span>
            <span className="menu-main">
              <b>Linked banks</b>
              <em>{s.banks.length} accounts · {s.user.bankAccount} primary</em>
            </span>
            <ChevronRight size={17} />
          </button>
          <button className="menu-row" onClick={() => open({ type: 'activity' })}>
            <span className="menu-icon green">
              <FileText size={18} />
            </span>
            <span className="menu-main">
              <b>Activity & receipts</b>
              <em>Every movement and reference</em>
            </span>
            <ChevronRight size={17} />
          </button>
        </div>
      </div>

      <div className="menu-group">
        <h3>Security & preferences</h3>
        <div className="menu">
          <div className="menu-row static">
            <span className="menu-icon blue">
              <Fingerprint size={18} />
            </span>
            <span className="menu-main">
              <b>Biometric confirmation</b>
              <em>Face or fingerprint before money moves</em>
            </span>
            {toggle('biometric')}
          </div>
          <div className="menu-row static">
            <span className="menu-icon peach">
              <BellRing size={18} />
            </span>
            <span className="menu-main">
              <b>Price alerts</b>
              <em>Notify me when a holding moves 3%</em>
            </span>
            {toggle('priceAlerts')}
          </div>
          <div className="menu-row static">
            <span className="menu-icon purple">
              <EyeOff size={18} />
            </span>
            <span className="menu-main">
              <b>Hide balances</b>
              <em>Mask amounts across the app</em>
            </span>
            {toggle('hideBalance')}
          </div>
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

      <div className="menu-group">
        <h3>About</h3>
        <div className="menu">
          <div className="menu-row static">
            <span className="menu-icon blue">
              <Info size={18} />
            </span>
            <span className="menu-main">
              <b>Apex Finance demo</b>
              <em>Not a licensed product. Sample balances and delayed prices.</em>
            </span>
          </div>
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
          <button className="menu-row danger" onClick={onSignOut}>
            <span className="menu-icon red">
              <LogOut size={18} />
            </span>
            <span className="menu-main">
              <b>Sign out</b>
              <em>Return to the welcome screens</em>
            </span>
            <ChevronRight size={17} />
          </button>
        </div>
      </div>

      <p className="version">Apex Finance · Mobile demo · v1.0</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Onboarding and auth                                                 */
/* ------------------------------------------------------------------ */

const SLIDES = [
  {
    icon: PiggyBank,
    tone: 'blue',
    title: 'Save with a plan, not a promise',
    body: 'Flexible, fixed and target savings in one place. Watch every naira move toward what matters.',
    art: 'save',
  },
  {
    icon: TrendingUp,
    tone: 'green',
    title: 'Own a slice of the market',
    body: 'Buy NGX and US shares from ₦5,000, with prices, fees and FX shown before you confirm.',
    art: 'invest',
  },
  {
    icon: Wallet,
    tone: 'purple',
    title: 'Money that moves with you',
    body: 'Fund your wallet, pay a tag, or withdraw to your bank. Receipts and limits stay clear.',
    art: 'wallet',
  },
] as const;

function AuthFlow({
  stage,
  setStage,
  onDone,
}: {
  stage: Stage;
  setStage: (s: Stage) => void;
  onDone: () => void;
}) {
  const [slide, setSlide] = useState(0);
  const [phone, setPhone] = useState('803 555 0147');
  const [code, setCode] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (pin.length === 4) {
      const timer = window.setTimeout(onDone, 260);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [pin, onDone]);

  if (stage === 'welcome') {
    const current = SLIDES[slide];
    const Icon = current.icon;
    return (
      <div className="welcome">
        <div className="welcome-glow one" />
        <div className="welcome-glow two" />
        <header className="welcome-brand">
          <Logo tone="light" size={36} />
          <button className="skip" onClick={() => setStage('auth')}>
            Skip
          </button>
        </header>

        <div className={`welcome-art ${current.tone}`}>
          <span className="art-ring" />
          <span className="art-icon">
            <Icon size={54} strokeWidth={1.6} />
          </span>
          {current.art === 'save' && (
            <span className="art-tag">Target · 49%</span>
          )}
          {current.art === 'invest' && (
            <span className="art-chip">
              <span className="tile" style={{ background: '#FFDCCE' }}>DA</span>
              <span>
                <b>Dangote Cement</b>
                <em>+1.24% today</em>
              </span>
            </span>
          )}
          {current.art === 'wallet' && (
            <span className="art-chip">
              <span className="tile" style={{ background: '#C3F3C6' }}>AO</span>
              <span>
                <b>Sent to Chinedu</b>
                <em>₦25,000 · instant</em>
              </span>
            </span>
          )}
        </div>

        <div className="welcome-copy">
          <h1>{current.title}</h1>
          <p>{current.body}</p>
        </div>

        <div className="dots" aria-hidden="true">
          {SLIDES.map((_, i) => (
            <span key={i} className={i === slide ? 'on' : ''} />
          ))}
        </div>

        <div className="welcome-actions">
          <button
            className="btn btn-white btn-block"
            onClick={() => (slide < SLIDES.length - 1 ? setSlide(slide + 1) : setStage('auth'))}
          >
            {slide < SLIDES.length - 1 ? 'Next' : 'Get started'} <ArrowRight size={17} />
          </button>
          <button className="welcome-link" onClick={() => setStage('auth')}>
            I already have an account
          </button>
          <p className="welcome-note">Demo experience · no real money moves</p>
        </div>
      </div>
    );
  }

  if (stage === 'auth') {
    return (
      <div className="auth">
        <button className="back" aria-label="Back" onClick={() => setStage('welcome')}>
          <ArrowLeft size={20} />
        </button>
        <div className="auth-mark">
          <ApexMark size={46} />
        </div>
        <h1>Create your Apex account</h1>
        <p className="auth-sub">Use a Nigerian number. We will send a six-digit code to confirm it.</p>
        <form
          className="auth-form"
          onSubmit={(e) => {
            e.preventDefault();
            const digits = phone.replace(/\D/g, '');
            if (digits.length < 10) {
              setError('Enter a valid Nigerian phone number.');
              return;
            }
            setError('');
            setStage('otp');
          }}
        >
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
          <button className="btn btn-primary btn-block" type="submit">
            Send code <ArrowRight size={17} />
          </button>
          <button className="demo-link" type="button" onClick={onDone}>
            Skip and open the demo account
          </button>
        </form>
        <p className="legal">
          By continuing you agree to the demo terms. Apex Finance is a portfolio concept, not a licensed financial
          institution.
        </p>
      </div>
    );
  }

  if (stage === 'otp') {
    return (
      <div className="auth">
        <button className="back" aria-label="Back" onClick={() => setStage('auth')}>
          <ArrowLeft size={20} />
        </button>
        <div className="auth-mark soft">
          <Smartphone size={26} />
        </div>
        <h1>Enter your code</h1>
        <p className="auth-sub">
          Sent to +234 {phone}. <b className="demo-hint">Demo: any 6 digits work.</b>
        </p>
        <form
          className="auth-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (code.length < 6) {
              setError('Enter all six digits.');
              return;
            }
            setError('');
            setStage('pin');
          }}
        >
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
          <button className="btn btn-primary btn-block" type="submit">
            Verify code
          </button>
          <button className="demo-link" type="button" onClick={() => setCode('123456')}>
            Use demo code 123456
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="auth pin">
      <button className="back" aria-label="Back" onClick={() => setStage('otp')}>
        <ArrowLeft size={20} />
      </button>
      <div className="auth-mark soft">
        <Lock size={24} />
      </div>
      <h1>Set a 4-digit PIN</h1>
      <p className="auth-sub">This PIN unlocks the app on this device. It is stored only as a demo preference.</p>
      <div className="pin-dots" aria-label={`${pin.length} of 4 digits entered`}>
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
      <p className="pin-hint">{pin.length === 4 ? 'Opening your workspace…' : 'Demo: choose any four digits'}</p>
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
}: {
  overlay: Overlay;
  open: (o: Overlay) => void;
  close: () => void;
  install: InstallCtx;
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
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    document.body.classList.add('sheet-open');
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('sheet-open');
    };
  }, [close]);

  return (
    <div className="sheet-wrap">
      <button className="scrim" aria-label="Close" onClick={close} />
      <div className={`sheet ${tall ? 'tall' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
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

function PlanSheet({ id, close, open }: { id: string; close: () => void; open: (o: Overlay) => void }) {
  const s = useStore();
  const [note, setNote] = useState('');
  const plan = s.plans.find((p) => p.id === id);
  if (!plan) return null;
  const progress = plan.target ? progressPct(plan.balance, plan.target) : 100;
  const locked = plan.kind === 'fixed';

  return (
    <Sheet title={plan.name} subtitle={`${kindLabel(plan.kind)} savings plan`} close={close} tall>
      <div className="plan-hero" style={{ background: `linear-gradient(150deg, ${plan.pastel} 0%, #fff 90%)` }}>
        <span className="plan-icon big" style={{ background: plan.color, color: '#fff' }}>
          {planIcon(plan.icon, 22)}
        </span>
        <span>Plan balance</span>
        <b>{ngn(plan.balance, 2)}</b>
        {plan.target ? (
          <>
            <div className="bar big">
              <span style={{ width: `${progress}%`, background: plan.color }} />
            </div>
            <p className="plan-hero-meta">
              {progress}% of {ngn(plan.target)} · {ngn(plan.target - plan.balance)} to go
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
        {plan.monthly && (
          <div>
            <span>Auto-save</span>
            <b>{ngn(plan.monthly)} monthly</b>
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
  const c = (value: number) => priceText(stock.currency, value);
  const pctChange = pct(stock.change, 2);

  return (
    <Sheet title={stock.name} subtitle={`${stock.exchange} · ${stock.sector}`} close={close} tall>
      <div className="stock-hero">
        <span className="tile big" style={{ background: stock.tint }}>
          {stock.symbol.slice(0, 2)}
        </span>
        <div className="stock-price">
          <b>{c(stock.price)}</b>
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
        <span>Day low {c(stock.price * 0.985)}</span>
        <span>Day high {c(stock.price * 1.011)}</span>
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
          <b>{c(holding.units * stock.price)}</b>
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
  if (!stock) return null;
  const holding = s.holdings.find((h) => h.symbol === symbol);
  const gross = units * stock.price;
  const fee = gross * 0.015;
  const total = side === 'buy' ? gross + fee : gross - fee;
  const available = stock.currency === 'USD' ? s.walletUsd : s.walletNgn;
  const c = (value: number) => priceText(stock.currency, value);
  const maxUnits = holding?.units ?? 0;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const result: MoneyResult = s.trade(symbol, units, side);
    if (!result.ok) {
      setError(result.error ?? 'Order could not be placed.');
      return;
    }
    close();
    if (result.txn) open({ type: 'receipt', txn: result.txn });
  };

  return (
    <Sheet title={`${side === 'buy' ? 'Buy' : 'Sell'} ${symbol}`} subtitle={`${stock.name} · ${stock.exchange}`} close={close}>
      <form onSubmit={submit} className="order-form">
        <div className="order-price">
          <span>Market price</span>
          <b>{c(stock.price)}</b>
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
            Available: {stock.currency === 'USD' ? usd(available) : ngn(available)}
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
        <button className="btn btn-primary btn-block" type="submit">
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
  const value = Number(amount.replace(/,/g, '')) || 0;

  const config: Record<MoneyMode, { title: string; subtitle: string; cta: string; available: number; prefix: string }> = {
    add: { title: 'Add money', subtitle: 'Fund your naira wallet from a linked bank', cta: 'Add money', available: 10_000_000, prefix: '₦' },
    withdraw: { title: 'Withdraw', subtitle: 'Send from your wallet to a linked bank', cta: 'Withdraw', available: s.walletNgn, prefix: '₦' },
    transfer: { title: 'Send money', subtitle: 'Instant transfer to an Apex tag or bank', cta: 'Send money', available: s.walletNgn, prefix: '₦' },
    'plan-add': {
      title: plan ? `Add to ${plan.name}` : 'Add to plan',
      subtitle: 'Move money from your wallet into this plan',
      cta: 'Confirm top-up',
      available: s.walletNgn,
      prefix: '₦',
    },
    'plan-withdraw': {
      title: plan ? `Withdraw from ${plan.name}` : 'Withdraw from plan',
      subtitle: 'Move this money back to your wallet',
      cta: 'Confirm withdrawal',
      available: plan?.balance ?? 0,
      prefix: '₦',
    },
  };
  const cfg = config[mode];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    let result: MoneyResult;
    if (mode === 'add') result = s.addMoney(value, source);
    else if (mode === 'withdraw') result = s.withdraw(value, source);
    else if (mode === 'transfer') result = s.transfer(value, recipient);
    else if (mode === 'plan-add' && plan) result = s.planDeposit(plan.id, value);
    else if (mode === 'plan-withdraw' && plan) result = s.planWithdraw(plan.id, value);
    else result = { ok: false, error: 'Plan not found.' };

    if (!result.ok) {
      setError(result.error ?? 'That did not work.');
      return;
    }
    close();
    if (result.txn) open({ type: 'receipt', txn: result.txn });
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
              {compactNaira(n)}
            </button>
          ))}
          <button type="button" className="chip" onClick={() => setAmount(String(Math.floor(cfg.available)))}>
            Max
          </button>
        </div>
        <p className="help">Available {mode === 'add' ? 'limit' : 'balance'}: {ngn(cfg.available)}</p>

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
                {s.banks.map((b) => (
                  <option key={b.id} value={b.name}>
                    {b.name} · {b.account}
                  </option>
                ))}
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
        <button className="btn btn-primary btn-block" type="submit" disabled={value <= 0}>
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
      initial: Number(initial) || 0,
      target: kind === 'target' ? Number(target) || 0 : undefined,
      monthly: kind === 'target' ? Number(monthly) || 0 : undefined,
    });
    if (!result.ok) {
      setError(result.error ?? 'Could not create the plan.');
      return;
    }
    close();
    if (result.txn) open({ type: 'receipt', txn: result.txn });
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
              style={kind === k ? { borderColor: color, background: `${pastel}77` } : undefined}
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
        <p className="help">Wallet balance: {ngn(s.walletNgn)}. The starting amount moves from your wallet.</p>
        {error && <p className="form-error">{error}</p>}
        <button className="btn btn-primary btn-block" type="submit">
          Create plan
        </button>
      </form>
    </Sheet>
  );
}

function ReceiptSheet({ txn, close }: { txn: Txn; close: () => void }) {
  const positive = txn.amount > 0;
  return (
    <Sheet title="Receipt" subtitle="Saved to your demo activity" close={close}>
      <div className="receipt">
        <span className={`receipt-check ${txn.status === 'Failed' ? 'failed' : ''}`}>
          {txn.status === 'Failed' ? <X size={26} /> : <Check size={28} />}
        </span>
        <h3>{txn.status === 'Failed' ? 'Payment failed' : positive ? 'Money received' : 'Payment sent'}</h3>
        <b className={positive ? 'receipt-amount up' : 'receipt-amount'}>
          {positive ? '+' : '−'}
          {ngn(Math.abs(txn.amount), 2)}
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
  const [filter, setFilter] = useState<'all' | 'in' | 'out' | 'savings' | 'invest'>('all');
  const list = s.txns.filter((t) => {
    if (filter === 'all') return true;
    if (filter === 'in') return t.amount > 0 && t.type !== 'savings' && t.type !== 'invest';
    if (filter === 'out') return t.amount < 0 && t.type !== 'savings' && t.type !== 'invest';
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
          const positive = t.amount > 0;
          return (
            <button key={t.id} className="row txn-row" onClick={() => open({ type: 'receipt', txn: t })}>
              <span className={`row-icon ${positive ? 'in' : 'out'} ${t.status === 'Failed' ? 'failed' : ''}`}>
                {positive ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
              </span>
              <span className="row-main">
                <span className="row-title">{t.title}</span>
                <span className="row-sub">
                  {shortDate(t.date)} · {t.ref}
                </span>
              </span>
              <span className="row-end">
                <b className={positive ? 'green' : ''}>{positive ? '+' : '−'}{ngn(Math.abs(t.amount))}</b>
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
      title: 'Level 0 · Phone only',
      body: 'Browse products, no money movement.',
      state: 'Complete',
    },
    {
      title: 'Level 1 · Phone + email',
      body: 'Small wallet limits and savings top-ups.',
      state: 'Complete',
    },
    {
      title: 'Level 2 · BVN + NIN',
      body: 'Full wallet, savings and investing. Daily limits raised.',
      state: 'Current',
    },
    {
      title: 'Level 3 · Address + income',
      body: 'Higher limits after a short manual review.',
      state: 'Optional',
    },
  ];
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
      <button className="btn btn-ghost btn-block" onClick={close}>
        Add another bank
      </button>
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
