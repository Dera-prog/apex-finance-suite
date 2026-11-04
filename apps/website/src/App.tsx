import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import QRCode from 'qrcode';
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Check,
  ChevronDown,
  CircleAlert,
  Download,
  Fingerprint,
  Landmark,
  LineChart,
  Lock,
  Menu,
  Monitor,
  RefreshCw,
  Send,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Target,
  Wallet,
  X,
  Zap,
} from 'lucide-react';
import { Logo, Sparkline } from '@shared/ui';
import { holdings, ngn, stocks } from '@shared/data';
import { links, isLive } from '@shared/links';
import './styles.css';

const mobileHref = isLive(links.mobile) ? links.mobile : '#install';
const desktopHref = isLive(links.desktop) ? links.desktop : '#install';

function useScrolled(offset = 24) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > offset);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [offset]);
  return scrolled;
}

function useReveal() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('.reveal'));
    if (!('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('in'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px -6% 0px', threshold: 0.08 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

const navLinks = [
  { href: '#products', label: 'Products' },
  { href: '#how', label: 'How it works' },
  { href: '#security', label: 'Security' },
  { href: '#pricing', label: 'Pricing' },
  { href: '#faq', label: 'FAQ' },
];

function Nav() {
  const scrolled = useScrolled();
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className={`nav${scrolled ? ' scrolled' : ''}`}>
        <div className="nav-inner">
          <a className="nav-brand" href="#top" aria-label="Apex Finance home">
            <Logo tone={scrolled ? 'dark' : 'light'} size={30} />
          </a>
          <nav className="nav-links" aria-label="Primary">
            {navLinks.map((l) => (
              <a key={l.href} href={l.href}>
                {l.label}
              </a>
            ))}
          </nav>
          <div className="nav-actions">
            <a className="btn btn-ghost btn-sm" href={desktopHref} {...(isLive(links.desktop) ? { target: '_blank', rel: 'noreferrer' } : {})}>
              <Monitor size={15} /> Desktop
            </a>
            <a className="btn btn-primary btn-sm" href={mobileHref} {...(isLive(links.mobile) ? { target: '_blank', rel: 'noreferrer' } : {})}>
              Get the app <ArrowRight size={15} />
            </a>
            <button
              type="button"
              className="nav-burger"
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? 'Close menu' : 'Open menu'}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X size={19} /> : <Menu size={19} />}
            </button>
          </div>
        </div>
      </header>
      {open && (
        <div className="mobile-menu" id="mobile-menu">
          {navLinks.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setOpen(false)}>
              {l.label}
            </a>
          ))}
          <a
            className="btn btn-primary btn-block"
            href={mobileHref}
            onClick={() => setOpen(false)}
            {...(isLive(links.mobile) ? { target: '_blank', rel: 'noreferrer' } : {})}
          >
            Get the app <ArrowRight size={16} />
          </a>
        </div>
      )}
    </>
  );
}

function PhoneArt() {
  const movers = stocks.filter((s) => s.exchange === 'NGX').slice(0, 2);
  return (
    <div className="phone-shell" aria-hidden="true">
      <div className="phone-screen">
        <div className="ps-island" />
        <div className="ps-status">
          <span>9:41</span>
          <span>5G ▮▮▮</span>
        </div>
        <div className="ps-head">
          <div>
            <small>Good morning,</small>
            <b>Ada Okafor</b>
          </div>
          <span className="ps-bell">
            <ShieldCheck size={15} />
          </span>
        </div>
        <div className="ps-balance">
          <span>Total balance</span>
          <strong className="money">₦1,240,400.00</strong>
          <div className="ps-split">
            <div>
              <span>Wallet</span>
              <b>₦268,400</b>
            </div>
            <div>
              <span>Savings</span>
              <b>₦807,500</b>
            </div>
            <div>
              <span>Investments</span>
              <b>₦164,500</b>
            </div>
          </div>
        </div>
        <div className="ps-actions">
          <span className="outline">
            <ArrowDownLeft size={12} /> Add money
          </span>
          <span style={{ background: '#003ec5', color: '#fff' }}>
            <Send size={12} /> Withdraw
          </span>
        </div>
        <div className="ps-tiles">
          <span>
            <i style={{ background: '#FFDCCE' }}>
              <Landmark size={14} />
            </i>
            Bank
          </span>
          <span>
            <i style={{ background: '#FFF0C2' }}>
              <Wallet size={14} />
            </i>
            USD
          </span>
          <span>
            <i style={{ background: '#CCF4F9' }}>
              <LineChart size={14} />
            </i>
            Stocks
          </span>
          <span>
            <i style={{ background: '#C3F3C6' }}>
              <Target size={14} />
            </i>
            Goals
          </span>
        </div>
        <div className="ps-card">
          <div className="ps-card-head">
            <b>Portfolio return</b>
            <span style={{ color: 'var(--green-600)' }}>+4.8%</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 6 }}>
            <b className="money" style={{ fontFamily: 'var(--font-display)', fontSize: 16, letterSpacing: '-0.03em' }}>
              ₦73,000
            </b>
            <span style={{ fontSize: 8, color: 'var(--site-muted)', fontWeight: 700 }}>All time</span>
          </div>
        </div>
        <div className="ps-card">
          <div className="ps-card-head">
            <b>Top movers</b>
            <span>See all</span>
          </div>
          {movers.map((s) => (
            <div className="ps-row" key={s.symbol}>
              <i style={{ background: s.tint }}>{s.symbol.slice(0, 2)}</i>
              <div>
                <b>{s.name}</b>
                <em>{s.symbol}</em>
              </div>
              <Sparkline data={s.spark} width={46} height={18} fill={false} stroke={s.change >= 0 ? '#12B76A' : '#d92d20'} strokeWidth={1.4} />
              <div className="num">
                {ngn(s.price, 2)}
                <small style={{ color: s.change >= 0 ? 'var(--green-600)' : 'var(--red-600)' }}>
                  {s.change >= 0 ? '+' : ''}
                  {s.change}%
                </small>
              </div>
            </div>
          ))}
        </div>
        <div className="ps-nav">
          <span className="on">
            <Wallet size={15} /> Home
          </span>
          <span>
            <Target size={15} /> Save
          </span>
          <span>
            <LineChart size={15} /> Invest
          </span>
          <span>
            <Fingerprint size={15} /> Profile
          </span>
        </div>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section className="hero" id="top">
      <div className="hero-sky" />
      <div className="wrap hero-inner">
        <div className="hero-copy">
          <span className="hero-badge">
            <i /> Nigeria-first · Concept product
          </span>
          <h1>
            Save. Access.
            <br />
            Invest. <em>Grow.</em>
          </h1>
          <p className="hero-lede">
            One account for everyday money and long-term goals. Flexible, fixed and target savings,
            instant transfers, and shares on the NGX and NASDAQ — with every fee and risk shown before
            you confirm.
          </p>
          <div className="hero-actions">
            <a className="btn btn-primary" href={mobileHref} {...(isLive(links.mobile) ? { target: '_blank', rel: 'noreferrer' } : {})}>
              <Smartphone size={17} /> Get Apex on your phone
            </a>
            <a className="btn btn-ghost" href="#products">
              Explore the products <ArrowRight size={16} />
            </a>
          </div>
          <div className="hero-proof">
            <div>
              <b>3</b>
              <span>savings products</span>
            </div>
            <div>
              <b>NGX + US</b>
              <span>share markets</span>
            </div>
            <div>
              <b>Level 2</b>
              <span>KYC inside the app</span>
            </div>
          </div>
          <p className="hero-note">
            <CircleAlert size={12} /> Illustrative product demo. Balances and prices are sample data.
          </p>
        </div>
        <div className="hero-visual">
          <div className="hero-halo" />
          <div className="hero-spheres" />
          <div className="float-card float-a">
            <i style={{ background: '#C3F3C6', color: '#06720C' }}>
              <RefreshCw size={16} />
            </i>
            <div>
              <small>Auto-save is on</small>
              <b>₦50,000 / month</b>
            </div>
          </div>
          <div className="float-card float-b">
            <i style={{ background: '#DCE9FF', color: '#0034A8' }}>
              <LineChart size={16} />
            </i>
            <div>
              <small>NVDA · NASDAQ</small>
              <b>$138.25</b>
            </div>
            <em>+2.34%</em>
          </div>
          <div className="float-card float-c">
            <i style={{ background: '#F4CCF9', color: '#760A81' }}>
              <Lock size={16} />
            </i>
            <div>
              <small>Fixed deposit</small>
              <b>16% p.a.</b>
            </div>
          </div>
          <PhoneArt />
        </div>
      </div>
    </section>
  );
}

function Strip() {
  return (
    <div className="strip">
      <div className="strip-inner">
        <span>Built for licensed rails</span>
        <div className="strip-items">
          <span>
            <Landmark size={15} /> Partner-bank deposits
          </span>
          <span>
            <LineChart size={15} /> SEC-registered broker
          </span>
          <span>
            <ShieldCheck size={15} /> CBN-licensed payments
          </span>
          <span>
            <Fingerprint size={15} /> NDPC-aligned data
          </span>
        </div>
      </div>
    </div>
  );
}

function SectionHead({
  eyebrow,
  title,
  copy,
  center,
}: {
  eyebrow: string;
  title: ReactNode;
  copy?: ReactNode;
  center?: boolean;
}) {
  return (
    <div className={`section-head${center ? ' center' : ''}`}>
      <span className="eyebrow">
        <Sparkles size={13} /> {eyebrow}
      </span>
      <h2>{title}</h2>
      {copy && <p>{copy}</p>}
    </div>
  );
}

function PlansVisual() {
  return (
    <div className="mini-stack" aria-hidden="true">
      <div className="mini-plan">
        <div className="mini-plan-top">
          <b>Everyday Fund</b>
          <span>12% p.a.</span>
        </div>
        <strong className="money">₦185,000</strong>
        <small>Withdraw anytime · interest monthly</small>
      </div>
      <div className="mini-plan">
        <div className="mini-plan-top">
          <b>Rent Reserve</b>
          <span style={{ color: 'var(--purple-700)' }}>Fixed</span>
        </div>
        <strong className="money">₦120,000</strong>
        <div className="bar">
          <i style={{ width: '100%', background: 'var(--purple-700)' }} />
        </div>
        <small>16% p.a. · matures 18 Jan 2027</small>
      </div>
      <div className="mini-plan">
        <div className="mini-plan-top">
          <b>New Laptop Fund</b>
          <span style={{ color: 'var(--green-700)' }}>48%</span>
        </div>
        <strong className="money">₦412,500</strong>
        <div className="bar">
          <i style={{ width: '48%', background: 'var(--green-700)' }} />
        </div>
        <small>of ₦850,000 · auto-save ₦50,000</small>
      </div>
    </div>
  );
}

function TransferVisual() {
  return (
    <div className="mini-transfer" aria-hidden="true">
      <div className="mini-transfer-top">
        <b>Transfer</b>
        <span>Wallet · ₦268,400</span>
      </div>
      <div className="mini-amount">
        <span>Amount</span>
        <b className="money">₦25,000.00</b>
        <em>No Apex fee · arrives instantly</em>
      </div>
      <div className="mini-contact">
        <i>CO</i>
        <div>
          Chinedu Okafor
          <small>@chinedu · Apex wallet</small>
        </div>
        <BadgeCheck size={14} color="#1D52CE" style={{ marginLeft: 'auto' }} />
      </div>
      <div className="mini-btn">Send ₦25,000</div>
    </div>
  );
}

function InvestVisual() {
  const rows = stocks.filter((s) => ['DANGCEM', 'AIRTELAFRI', 'NVDA'].includes(s.symbol));
  return (
    <div className="mini-stock" aria-hidden="true">
      {rows.map((s) => (
        <div className="mini-stock-row" key={s.symbol}>
          <i style={{ background: s.tint }}>{s.symbol.slice(0, 2)}</i>
          <div>
            <b>{s.name}</b>
            <small>
              {s.symbol} · {s.exchange}
            </small>
          </div>
          <div className="spark">
            <Sparkline data={s.spark} width={40} height={16} fill={false} stroke={s.change >= 0 ? '#12B76A' : '#d92d20'} strokeWidth={1.4} />
          </div>
          <div className="price">
            {s.currency === 'NGN' ? ngn(s.price, 2) : `$${s.price.toFixed(2)}`}
            <em style={{ color: s.change >= 0 ? 'var(--green-600)' : 'var(--red-600)' }}>
              {s.change >= 0 ? '+' : ''}
              {s.change}%
            </em>
          </div>
        </div>
      ))}
    </div>
  );
}

function Products() {
  const products = [
    {
      tone: 'blue',
      icon: <Zap size={22} />,
      title: 'Savings with a job',
      copy: 'Flexible money you can reach, fixed money that earns more, and target plans that keep a goal moving with auto-save.',
      points: ['Flexible · withdraw anytime', 'Fixed · 16% p.a. illustrative', 'Target · progress you can see'],
      visual: <PlansVisual />,
    },
    {
      tone: 'purple',
      icon: <Send size={22} />,
      title: 'A wallet that moves',
      copy: 'Fund from any Nigerian bank, send to an Apex tag or account number, and keep a receipt for every naira that leaves.',
      points: ['Bank funding and withdrawals', 'Instant Apex-to-Apex transfers', 'Pending and failed states, never hidden'],
      visual: <TransferVisual />,
    },
    {
      tone: 'green',
      icon: <LineChart size={22} />,
      title: 'Shares without the fog',
      copy: 'Buy Nigerian and US shares in small amounts. Company context, order preview and risk labels come before the trade.',
      points: ['NGX + NASDAQ access', 'Prices delayed at least 15 min', 'Brokerage fees quoted up front'],
      visual: <InvestVisual />,
    },
  ];

  return (
    <section className="section" id="products">
      <div className="wrap">
        <div className="section-head-row">
          <SectionHead
            eyebrow="Products"
            title={
              <>
                Three money habits. <em>One balance.</em>
              </>
            }
            copy="Most people juggle a savings app, a bank app, a broker and a notes file. Apex puts the four jobs in one place — without pretending they carry the same risk."
          />
        </div>
        <div className="products">
          {products.map((p) => (
            <article className={`product ${p.tone} reveal`} key={p.title}>
              <span className="product-icon">{p.icon}</span>
              <h3>{p.title}</h3>
              <p>{p.copy}</p>
              <ul>
                {p.points.map((point) => (
                  <li key={point}>
                    <Check size={14} /> {point}
                  </li>
                ))}
              </ul>
              <div className="product-visual">{p.visual}</div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function DesktopBand() {
  const chart = [18, 22, 20, 26, 24, 30, 28, 34, 31, 38, 36, 44, 41, 48, 46, 54, 52, 60];
  const line = chart
    .map((v, i) => `${i === 0 ? 'M' : 'L'}${(i / (chart.length - 1)) * 320} ${96 - (v / 64) * 88}`)
    .join(' ');
  return (
    <section className="band-dark" id="desktop">
      <div className="wrap band-grid">
        <div>
          <span className="eyebrow">
            <Monitor size={13} /> Desktop workspace
          </span>
          <h2 style={{ marginTop: 14 }}>
            Your money, with <em>more room.</em>
          </h2>
          <p className="lede">
            Review a full portfolio, compare savings plans, filter a year of activity and export a
            statement — without squinting at a phone. The same ledger, the same limits, a wider view.
          </p>
          <div className="band-stats">
            <div className="band-stat">
              <b>12 mo</b>
              <span>Filterable transaction history</span>
            </div>
            <div className="band-stat">
              <b>15 min</b>
              <span>Minimum delay on quoted share prices</span>
            </div>
            <div className="band-stat">
              <b>2-step</b>
              <span>Authentication on every money movement</span>
            </div>
            <div className="band-stat">
              <b>1 ledger</b>
              <span>Wallet, savings and invest in one place</span>
            </div>
          </div>
          <div style={{ marginTop: 26 }}>
            <a className="btn btn-white" href={desktopHref} {...(isLive(links.desktop) ? { target: '_blank', rel: 'noreferrer' } : {})}>
              Open the desktop app <ArrowUpRight size={16} />
            </a>
          </div>
        </div>
        <div className="band-mock" aria-hidden="true">
          <div className="band-mock-bar">
            <i />
            <i />
            <i />
            <span>app.apexfinance.ng/overview</span>
          </div>
          <div className="band-app">
            <div className="band-side">
              <div className="brandline">
                <ShieldCheck size={16} /> Apex
              </div>
              <span className="on">
                <Wallet size={13} /> Overview
              </span>
              <span>
                <Landmark size={13} /> Wallet
              </span>
              <span>
                <Target size={13} /> Savings
              </span>
              <span>
                <LineChart size={13} /> Invest
              </span>
              <span>
                <RefreshCw size={13} /> Activity
              </span>
            </div>
            <div className="band-main">
              <div className="band-main-head">
                <div>
                  <small>Good morning, Ada</small>
                  <h4>Portfolio overview</h4>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <small>Total return</small>
                  <div style={{ color: '#6df0a5', fontWeight: 800, fontSize: 12 }}>+4.8% · ₦73,000</div>
                </div>
              </div>
              <div className="band-kpis">
                <div className="band-kpi">
                  <span>Wallet</span>
                  <b>₦268,400</b>
                </div>
                <div className="band-kpi">
                  <span>Savings</span>
                  <b>₦807,500</b>
                </div>
                <div className="band-kpi">
                  <span>Investments</span>
                  <b>₦164,500</b>
                </div>
              </div>
              <div className="band-chart">
                <div className="band-chart-head">
                  <b>Portfolio performance</b>
                  <span>Last 3 months</span>
                </div>
                <svg viewBox="0 0 320 96" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="wchart" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0" stopColor="#6df0a5" stopOpacity=".28" />
                      <stop offset="1" stopColor="#6df0a5" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d={`${line} L320 96 L0 96 Z`} fill="url(#wchart)" />
                  <path d={line} fill="none" stroke="#6df0a5" strokeWidth="2" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="band-rows">
                {holdings.slice(0, 3).map((h) => {
                  const s = stocks.find((x) => x.symbol === h.symbol)!;
                  return (
                    <div className="band-row" key={h.symbol}>
                      <i style={{ background: s.tint, color: '#21304f' }}>{h.symbol.slice(0, 2)}</i>
                      <b>{s.name}</b>
                      <span style={{ color: h.change >= 0 ? '#6df0a5' : '#ff9b9b' }}>
                        {h.change >= 0 ? '+' : ''}
                        {h.change}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function How() {
  const steps = [
    {
      icon: <Fingerprint size={20} />,
      title: 'Open an account in minutes',
      copy: 'Phone and email first. Add BVN and NIN when you are ready for full limits — the app explains exactly what each level unlocks.',
    },
    {
      icon: <Target size={20} />,
      title: 'Give every naira a job',
      copy: 'Keep spending money flexible, lock a fixed deposit for a higher rate, or set a target with an automatic monthly transfer.',
    },
    {
      icon: <LineChart size={20} />,
      title: 'Move it or invest it',
      copy: 'Send from your wallet, withdraw to your bank, or preview a share order with price, fees and risk before you confirm.',
    },
  ];

  return (
    <section className="section" id="how">
      <div className="wrap">
        <SectionHead
          eyebrow="How it works"
          title={
            <>
              Set up once. <em>Use it daily.</em>
            </>
          }
          copy="No branch visit, no waiting on a support ticket to understand your own balance. Each step shows what is happening and what it costs."
          center
        />
        <div className="steps">
          {steps.map((s, i) => (
            <article className="step reveal" key={s.title}>
              <span className="step-num">{i + 1}</span>
              <span className="step-badge">{s.icon}</span>
              <h3>{s.title}</h3>
              <p>{s.copy}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Security() {
  const cards = [
    {
      icon: <Lock size={20} />,
      title: 'One ledger you can read',
      copy: 'Every deposit, transfer, plan and trade lands in the same activity list with a reference, status and receipt. Pending money is never shown as spendable.',
    },
    {
      icon: <Fingerprint size={20} />,
      title: 'Step-up before money moves',
      copy: 'PIN or device confirmation is required for withdrawals, transfers and share orders. A new device sign-in triggers a security alert.',
    },
    {
      icon: <Landmark size={20} />,
      title: 'Licensed partners hold the risk',
      copy: 'Deposits sit with partner banks, payments run on licensed rails and share orders are routed to an SEC-registered broker — not executed by Apex itself.',
    },
    {
      icon: <ShieldCheck size={20} />,
      title: 'Terms before the tap',
      copy: 'Fixed-deposit early access, FX conversion and share-order fees are quoted on screen before confirmation. No return is ever promised.',
    },
  ];

  return (
    <section className="section" id="security">
      <div className="wrap">
        <SectionHead
          eyebrow="Trust & security"
          title={
            <>
              Trust is a <em>receipt</em>, not a slogan.
            </>
          }
          copy="The PRD made trust the primary product constraint. That means clear states, tiered verification and a plain explanation of who holds what."
        />
        <div className="security-grid">
          {cards.map((c) => (
            <article className="trust-card reveal" key={c.title}>
              <i>{c.icon}</i>
              <div>
                <h3>{c.title}</h3>
                <p>{c.copy}</p>
              </div>
            </article>
          ))}
        </div>
        <div className="kyc-levels">
          {[
            { level: 'Level 1', title: 'Phone + email', items: ['Browse products', 'Small wallet limits', 'Upgrade any time'] },
            { level: 'Level 2', title: 'BVN + NIN', items: ['Full wallet limits', 'Savings and transfers', 'NGX + US share investing'] },
            { level: 'Level 3', title: 'Address + income', items: ['Higher limits', 'Higher FX allowance', 'Reviewed manually'] },
          ].map((k) => (
            <div className="kyc reveal" key={k.level}>
              <div className="kyc-top">
                <span>{k.level}</span>
                <BadgeCheck size={14} color="#1D52CE" />
              </div>
              <b>{k.title}</b>
              <ul>
                {k.items.map((item) => (
                  <li key={item}>
                    <Check size={11} style={{ marginTop: 3, flexShrink: 0 }} /> {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const fees = [
  { what: 'Account opening', how: 'No Apex fee', launch: 'Free' },
  { what: 'Apex-to-Apex transfer', how: 'Instant, by Apex tag or phone number', launch: 'Free' },
  { what: 'Bank withdrawal', how: 'Network fee passed through, shown before confirmation', launch: 'Pass-through' },
  { what: 'Savings plans', how: 'No maintenance fee; early-access rules on each plan', launch: 'Free' },
  { what: 'Share orders', how: 'Brokerage fee + statutory levies, quoted up front', launch: 'Quoted' },
  { what: 'US shares', how: 'FX rate and conversion fee shown before the order', launch: 'Quoted' },
];

function Pricing() {
  return (
    <section className="section pricing" id="pricing">
      <div className="wrap">
        <SectionHead
          eyebrow="Pricing"
          title={
            <>
              Know the cost <em>before</em> you commit.
            </>
          }
          copy="Apex is designed around one rule: the amount that leaves your balance is the amount you agreed to. These are the intended fee surfaces, not a final tariff."
        />
        <div className="fee-grid">
          <div className="fee-table reveal">
            <div className="fee-row">
              <span>What</span>
              <span>How it works</span>
              <span style={{ textAlign: 'right' }}>At launch</span>
            </div>
            {fees.map((f) => (
              <div className="fee-row" key={f.what}>
                <b>{f.what}</b>
                <span>{f.how}</span>
                <em>{f.launch}</em>
              </div>
            ))}
          </div>
          <aside className="fee-note reveal">
            <h3>No surprise deductions</h3>
            <p>
              Final rates, tenors and fees are set with licensed partners and shown inside the app
              before a plan or order is confirmed. Numbers in this concept are illustrative.
            </p>
            <ul>
              <li>
                <Check size={13} /> Fee preview on every money movement
              </li>
              <li>
                <Check size={13} /> Interest credited on a visible schedule
              </li>
              <li>
                <Check size={13} /> Early-access rules printed on the plan card
              </li>
              <li>
                <Check size={13} /> Share prices delayed at least 15 minutes
              </li>
            </ul>
          </aside>
        </div>
      </div>
    </section>
  );
}

const faqs = [
  {
    q: 'Is my money safe with Apex?',
    a: 'In this concept, deposits are described as held with licensed partner banks and payments run on licensed rails. Deposit insurance only applies where a partner bank’s cover applies — it does not protect share prices. A live product would publish the exact partner, custody and coverage terms before accepting deposits.',
  },
  {
    q: 'Can I withdraw a fixed savings plan early?',
    a: 'Fixed plans are time-bound for a higher rate. The early-access rule — including any loss of accrued interest or fee — is shown on the plan card before you open it, and again before you confirm an early withdrawal.',
  },
  {
    q: 'How does share investing work?',
    a: 'Orders are routed to an SEC-registered broker. You see the delayed price, estimated units, brokerage fee and levies before submitting. Shares can fall as well as rise, and Apex does not promise a return.',
  },
  {
    q: 'Do I need my BVN or NIN to start?',
    a: 'No. Level 1 lets you open an account with a phone number and email and explore the products. Level 2 adds BVN and NIN for full wallet, savings and investing limits. Level 3 raises limits after address and income checks.',
  },
  {
    q: 'Is this a real financial product?',
    a: 'No. This site and the connected apps are a design and engineering prototype built from a product requirements document and a Figma design. All balances, plans, prices and transactions are demo data, and no real money moves.',
  },
];

function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="section" id="faq">
      <div className="wrap faq-grid">
        <div>
          <SectionHead eyebrow="FAQ" title={<>The questions people actually ask.</>} />
          <p style={{ marginTop: 18, fontSize: 13, lineHeight: 1.7, color: 'var(--site-muted)', maxWidth: 320 }}>
            Can’t find an answer? A live support thread would connect from the app’s Profile tab, with the
            transaction reference attached automatically.
          </p>
        </div>
        <div className="faq">
          {faqs.map((f, i) => (
            <div className={`faq-item${open === i ? ' open' : ''}`} key={f.q}>
              <button
                type="button"
                className="faq-q"
                id={`faq-q-${i}`}
                aria-expanded={open === i}
                aria-controls={`faq-${i}`}
                onClick={() => setOpen(open === i ? null : i)}
              >
                {f.q}
                <ChevronDown size={18} />
              </button>
              <div
                className="faq-a"
                id={`faq-${i}`}
                role="region"
                aria-labelledby={`faq-q-${i}`}
                aria-hidden={open !== i}
              >
                <div>
                  <p>{f.a}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Install() {
  const [qr, setQr] = useState<string | null>(null);
  const live = isLive(links.mobile);

  useEffect(() => {
    if (!live) return;
    QRCode.toDataURL(links.mobile, {
      margin: 1,
      width: 320,
      color: { dark: '#0c1633', light: '#ffffff' },
    })
      .then(setQr)
      .catch(() => setQr(null));
  }, [live]);

  return (
    <section className="section" id="install" style={{ paddingTop: 0 }}>
      <div className="wrap">
        <div className="install reveal">
          <div>
            <span className="eyebrow" style={{ color: 'rgba(255,255,255,.78)' }}>
              <Smartphone size={13} /> Installable web app
            </span>
            <h2>
              Put Apex on your <em>home screen.</em>
            </h2>
            <p>
              The mobile app is a progressive web app: open the link on your phone, choose “Add to Home
              Screen”, and it runs full-screen like a native app — no app store required. Desktop users
              can open the same account in the browser.
            </p>
            <div className="install-actions">
              <a className="btn btn-primary" href={mobileHref} {...(live ? { target: '_blank', rel: 'noreferrer' } : {})}>
                <Download size={16} /> Open the mobile app
              </a>
              <a className="btn btn-ghost" href={desktopHref} {...(isLive(links.desktop) ? { target: '_blank', rel: 'noreferrer' } : {})}>
                <Monitor size={16} /> Open desktop
              </a>
            </div>
            <p style={{ fontSize: 11, marginTop: 16, color: 'rgba(255,255,255,.72)' }}>
              <CircleAlert size={11} style={{ display: 'inline', marginRight: 5 }} />
              Demo build · no real money · not a licensed financial institution.
            </p>
          </div>
          <div className="install-qr">
            {qr ? <img src={qr} alt="QR code to open the Apex mobile app" /> : <div className="qr-placeholder" />}
            <b>{live ? 'Scan to install' : 'Install link opens with launch'}</b>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer-top">
          <div className="footer-brand">
            <Logo size={32} />
            <p>
              A Nigeria-first savings, wallet and share-investing concept — designed from a 10-page PRD
              and a two-flow Figma file, then built as four working surfaces.
            </p>
          </div>
          <div className="footer-col">
            <h3>Product</h3>
            <a href="#products">Savings</a>
            <a href="#products">Wallet &amp; transfers</a>
            <a href="#products">Invest</a>
            <a href="#pricing">Pricing</a>
          </div>
          <div className="footer-col">
            <h3>Surfaces</h3>
            <a href={mobileHref} {...(isLive(links.mobile) ? { target: '_blank', rel: 'noreferrer' } : {})}>
              Mobile app
            </a>
            <a href={desktopHref} {...(isLive(links.desktop) ? { target: '_blank', rel: 'noreferrer' } : {})}>
              Desktop app
            </a>
            {isLive(links.caseStudy) ? (
              <a href={links.caseStudy} target="_blank" rel="noreferrer">
                Case study
              </a>
            ) : (
              <a href="#top">Case study</a>
            )}
          </div>
          <div className="footer-col">
            <h3>Trust</h3>
            <a href="#security">Security</a>
            <a href="#security">KYC levels</a>
            <a href="#faq">FAQ</a>
            <a href="#pricing">Disclosures</a>
          </div>
        </div>
        <div className="footer-bottom">
          <p>
            © 2026 Apex Finance — concept product. Apex Finance is a design and engineering concept, not a
            licensed financial institution. Nothing here is an offer to accept deposits, provide payment
            services, deal in securities or give investment advice. Balances, prices, plans and
            transactions shown in the apps are illustrative demo data. Real products, rates, fees, limits
            and protections must be confirmed with licensed partners and qualified Nigerian legal and
            compliance advisers. Share prices can fall as well as rise.
          </p>
          <span>Lagos · Nigeria</span>
        </div>
      </div>
    </footer>
  );
}

export default function App() {
  useReveal();
  return (
    <div className="site">
      <a className="skip-link" href="#products">
        Skip to products
      </a>
      <Nav />
      <main>
        <Hero />
        <Strip />
        <Products />
        <DesktopBand />
        <How />
        <Security />
        <Pricing />
        <Faq />
        <Install />
      </main>
      <Footer />
    </div>
  );
}
