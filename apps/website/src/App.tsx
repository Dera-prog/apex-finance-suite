import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Check,
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
  Target,
  Wallet,
  X,
  Zap,
} from 'lucide-react';
import { Logo, Sparkline } from '@shared/ui';
import { holdings, ngn, stocks } from '@shared/data';
import { links, isLive } from '@shared/links';
import { Link, usePath } from './router';
import { SectionHead } from './pages/common';
import ProductsPage from './pages/ProductsPage';
import HowPage from './pages/HowPage';
import SecurityPage from './pages/SecurityPage';
import PricingPage from './pages/PricingPage';
import FaqPage from './pages/FaqPage';
import './styles.css';
import './pages.css';

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

function useReveal(key: string) {
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
  }, [key]);
}

const navLinks = [
  { to: '/products', label: 'Products' },
  { to: '/how-it-works', label: 'How it works' },
  { to: '/security', label: 'Security' },
  { to: '/pricing', label: 'Pricing' },
  { to: '/faq', label: 'FAQ' },
];

function Nav({ path }: { path: string }) {
  const scrolled = useScrolled();
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className={`nav${scrolled ? ' scrolled' : ''}`}>
        <div className="nav-inner">
          <Link className="nav-brand" to="/" aria-label="Apex Finance home">
            <Logo tone={scrolled ? 'dark' : 'light'} size={30} />
          </Link>
          <nav className="nav-links" aria-label="Primary">
            {navLinks.map((l) => (
              <Link key={l.to} to={l.to} aria-current={path === l.to ? 'page' : undefined}>
                {l.label}
              </Link>
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
            <Link key={l.to} to={l.to} onClick={() => setOpen(false)} aria-current={path === l.to ? 'page' : undefined}>
              {l.label}
            </Link>
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
            <Link className="btn btn-ghost" to="/products">
              Explore the products <ArrowRight size={16} />
            </Link>
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
        <div className="section-more">
          <Link className="btn btn-ghost" to="/products">
            Read every product rule <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </section>
  );
}

const detailPages = [
  {
    to: '/products',
    tone: 'blue',
    icon: <Wallet size={20} />,
    title: 'Products',
    copy: 'Everyday Fund, fixed deposit and target plans, the wallet states, and an order preview for NGX and US shares.',
  },
  {
    to: '/how-it-works',
    tone: 'purple',
    icon: <RefreshCw size={20} />,
    title: 'How it works',
    copy: 'Six steps from a phone number to a portfolio, including what every confirmation screen repeats before money moves.',
  },
  {
    to: '/security',
    tone: 'navy',
    icon: <ShieldCheck size={20} />,
    title: 'Security',
    copy: 'The controls the demo actually enforces, how verification levels work, and the gaps still open before launch.',
  },
  {
    to: '/pricing',
    tone: 'green',
    icon: <Landmark size={20} />,
    title: 'Pricing',
    copy: 'Everyday fees, worked savings examples, how a share order is costed, and the disclosures in plain words.',
  },
  {
    to: '/faq',
    tone: 'amber',
    icon: <CircleAlert size={20} />,
    title: 'FAQ',
    copy: 'Thirty answers across accounts, transfers, savings, investing, security and what this demo really is.',
  },
];

function Explore() {
  return (
    <section className="section" id="explore">
      <div className="wrap">
        <div className="section-head-row">
          <SectionHead
            eyebrow="Go deeper"
            title={
              <>
                Five pages. <em>All the detail.</em>
              </>
            }
            copy="Each part of the product has its own page. Rules, fees and limits in full — not a slogan standing in for a policy."
          />
        </div>
        <div className="detail-grid">
          {detailPages.map((page) => (
            <Link className={`detail-card ${page.tone}`} to={page.to} key={page.to}>
              <span className="detail-icon">{page.icon}</span>
              <h3>{page.title}</h3>
              <p>{page.copy}</p>
              <span className="detail-go">
                Open {page.title.toLowerCase()} <ArrowRight size={13} />
              </span>
            </Link>
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
            <Link to="/products#savings">Savings</Link>
            <Link to="/products#wallet">Wallet &amp; transfers</Link>
            <Link to="/products#invest">Invest</Link>
            <Link to="/how-it-works">How it works</Link>
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
              <Link to="/">Case study</Link>
            )}
          </div>
          <div className="footer-col">
            <h3>Trust</h3>
            <Link to="/security">Security</Link>
            <Link to="/security#verification">KYC levels</Link>
            <Link to="/pricing">Pricing</Link>
            <Link to="/faq">FAQ</Link>
            <Link to="/pricing#disclosures">Disclosures</Link>
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

const pageMeta: Record<string, { title: string; description: string }> = {
  '/': {
    title: 'Apex Finance — Save. Access. Invest. Grow.',
    description:
      'Apex Finance brings savings, wallet and beginner-friendly share investing into one simple, transparent app. Nigeria-first.',
  },
  '/products': {
    title: 'Products — savings, wallet and share investing | Apex Finance',
    description:
      'Flexible, fixed and target savings, a wallet with visible states, and NGX or US share orders with fees and risk shown before you confirm.',
  },
  '/how-it-works': {
    title: 'How it works — from phone number to portfolio | Apex Finance',
    description:
      'Six steps from a phone number to a portfolio, plus what every confirmation screen repeats before money moves.',
  },
  '/security': {
    title: 'Security — controls, verification and custody | Apex Finance',
    description:
      'What the Apex Finance demo actually enforces, how verification levels work, who would hold the risk, and the gaps still open.',
  },
  '/pricing': {
    title: 'Pricing — fees, savings rates and disclosures | Apex Finance',
    description:
      'Everyday fees, worked savings examples, share-order costs, FX quotes and plain-language disclosures.',
  },
  '/faq': {
    title: 'FAQ — accounts, money, savings and investing | Apex Finance',
    description:
      'Answers about sign-in, transfers, savings plans, share orders, security and what this prototype really is.',
  },
};

function Home() {
  return (
    <>
      <Hero />
      <Strip />
      <Products />
      <DesktopBand />
      <Explore />
      <Install />
    </>
  );
}

function NotFound() {
  return (
    <section className="page-section not-found">
      <div className="wrap">
        <span className="eyebrow">404</span>
        <h1>
          That page is not <em>here.</em>
        </h1>
        <p className="hero-lede">
          The address may be mistyped, or the page may never have existed. The five detail pages are one
          click away.
        </p>
        <div className="not-found-links">
          {navLinks.map((l) => (
            <Link key={l.to} to={l.to}>
              {l.label}
            </Link>
          ))}
          <Link to="/">Home</Link>
        </div>
      </div>
    </section>
  );
}

function Route({ path }: { path: string }) {
  switch (path) {
    case '/':
      return <Home />;
    case '/products':
      return <ProductsPage />;
    case '/how-it-works':
      return <HowPage />;
    case '/security':
      return <SecurityPage />;
    case '/pricing':
      return <PricingPage />;
    case '/faq':
      return <FaqPage />;
    default:
      return <NotFound />;
  }
}

export default function App() {
  const path = usePath();
  useReveal(path);

  useEffect(() => {
    const meta = pageMeta[path] ?? {
      title: 'Page not found — Apex Finance',
      description: 'The page you asked for does not exist on the Apex Finance concept site.',
    };
    document.title = meta.title;
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute('content', meta.description);
  }, [path]);

  useEffect(() => {
    const target = window.location.hash
      ? document.getElementById(window.location.hash.slice(1))
      : null;
    if (target) target.scrollIntoView({ block: 'start' });
    else window.scrollTo({ top: 0, left: 0 });
  }, [path]);

  return (
    <div className="site">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Nav path={path} />
      <main id="main" tabIndex={-1}>
        <Route path={path} />
      </main>
      <Footer />
    </div>
  );
}
