import { useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Briefcase,
  Check,
  CircleAlert,
  Clock,
  FileCheck,
  Fingerprint,
  Globe,
  Landmark,
  Layers,
  LineChart,
  Lock,
  Monitor,
  Plus,
  Quote,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Target,
  TrendingUp,
  User,
  Users,
  Wallet,
  Zap,
} from 'lucide-react';
import { Logo } from '@shared/ui';
import { links, isLive } from '@shared/links';
import { MiniBrowser, MiniDesktop, MiniPhone } from './MiniDevices';
import './styles.css';
import './devices.css';

const launch = (url: string, fallback: string) => (isLive(url) ? url : fallback);
const external = (url: string) => (isLive(url) ? { href: url, target: '_blank', rel: 'noreferrer' } : {});

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
      { rootMargin: '0px 0px -8% 0px', threshold: 0.06 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <header className="cs-nav" style={{ paddingTop: scrolled ? 10 : 16 }}>
      <div className="cs-nav-inner">
        <a href="#top" aria-label="Apex Finance case study, back to top">
          <Logo size={32} />
        </a>
        <span className="cs-nav-tag">Case study · 2026</span>
        <nav className="cs-nav-links" aria-label="Case study sections">
          <a href="#brief">Brief</a>
          <a href="#system">System</a>
          <a href="#surfaces">Surfaces</a>
          <a href="#deep-dive">Deep dive</a>
          <a href="#measure">Measures</a>
        </nav>
        <a
          className="btn btn-primary"
          href={launch(links.mobile, '#surfaces')}
          {...external(links.mobile)}
        >
          Open mobile app <ArrowUpRight size={15} />
        </a>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="cs-hero" id="top">
      <div className="cs-wrap cs-hero-grid">
        <div>
          <span className="cs-kicker">
            <span className="cs-kicker-dot">
              <Sparkles size={12} />
            </span>
            Product case study · Fintech · Nigeria
          </span>
          <h1>
            Banking that
            <br />
            <em>grows</em> with you.
          </h1>
          <p className="cs-hero-lede">
            Apex Finance brings savings, payments and first-time share investing into one
            mobile-first product — then extends the same money model to desktop and web. This is
            how a 10-page PRD and a two-flow Figma file became one coherent, shippable system.
          </p>
          <div className="cs-hero-actions">
            <a className="btn btn-primary" href="#brief">
              Read the case study <ArrowDown size={16} />
            </a>
            <a
              className="btn btn-ghost"
              href={launch(links.mobile, '#surfaces')}
              {...external(links.mobile)}
            >
              <Smartphone size={16} /> Open the mobile app
            </a>
          </div>
          <dl className="cs-meta">
            <div>
              <dt>Role</dt>
              <dd>
                Product design &amp; front-end
                <span>Research synthesis, IA, UI system, build</span>
              </dd>
            </div>
            <div>
              <dt>Scope</dt>
              <dd>
                MVP, end to end
                <span>Onboarding → KYC → wallet → savings → equities</span>
              </dd>
            </div>
            <div>
              <dt>Surfaces</dt>
              <dd>
                Mobile · Desktop · Web
                <span>One system, three contexts of use</span>
              </dd>
            </div>
            <div>
              <dt>Timeline</dt>
              <dd>
                6 weeks, 2026
                <span>PRD dated 2 November 2026</span>
              </dd>
            </div>
          </dl>
        </div>

        <div className="cs-stage" aria-hidden="true">
          <div className="cs-stage-photo">
            <img src="./assets/editorial-cream.webp" alt="" />
          </div>
          <div className="cs-float-desktop">
            <MiniDesktop />
          </div>
          <div className="cs-float-phone">
            <MiniPhone variant="home" />
          </div>
          <div className="cs-stage-badge">
            <span className="dot">
              <ShieldCheck size={16} />
            </span>
            <span>
              4 tabs. 3 savings products.
              <small>One ledger, one language, one trust model.</small>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

function Provenance() {
  return (
    <div className="cs-provenance">
      <div className="cs-wrap cs-provenance-inner">
        <p>Built from</p>
        <div className="cs-provenance-items">
          <span>10-page product requirements document</span>
          <span>New-user &amp; returning-user Figma flows</span>
          <span>Nigeria-first compliance brief</span>
          <span>NGX + US tickers as demo data</span>
        </div>
      </div>
    </div>
  );
}

function SectionHead({
  num,
  title,
  lede,
  id,
}: {
  num: string;
  title: React.ReactNode;
  lede?: React.ReactNode;
  id?: string;
}) {
  return (
    <div className="cs-section-head reveal" id={id}>
      <div className="cs-section-num">{num}</div>
      <div>
        <h2>{title}</h2>
        {lede && <p className="cs-lede">{lede}</p>}
      </div>
    </div>
  );
}

function Brief() {
  return (
    <section className="cs-section" id="brief">
      <div className="cs-wrap">
        <SectionHead
          num="01 — The brief"
          title={
            <>
              One place for money that usually lives in <em>five.</em>
            </>
          }
          lede={
            <>
              The brief asked for a mobile-first platform covering savings, wallet, transfers and
              beginner-friendly shares. The constraint was never features — it was <strong>trust</strong>.
              Every rate, fee, limit and risk had to be visible before someone committed.
            </>
          }
        />
        <div className="cs-brief-grid">
          <article className="cs-quote-card reveal">
            <Quote size={26} style={{ opacity: 0.45 }} />
            <blockquote>
              “Many users struggle with fragmented financial services — separate apps for savings,
              withdrawals and investments — leading to confusion, low trust and poor financial
              growth.”
            </blockquote>
            <footer>Apex Finance PRD · §1.3 Problem statement</footer>
          </article>
          <article className="cs-info-card reveal">
            <h3>In the MVP</h3>
            <ul>
              <li>Phone/email onboarding, OTP and transaction PIN</li>
              <li>KYC levels with clear review states</li>
              <li>Wallet funding, history and receipts</li>
              <li>Flexible, fixed and target savings</li>
              <li>Withdrawals and wallet-to-wallet transfers</li>
              <li>Share discovery, orders and portfolio via a licensed partner</li>
            </ul>
          </article>
          <article className="cs-info-card reveal">
            <h3>Deliberately excluded</h3>
            <ul>
              <li>Loans, credit and overdrafts</li>
              <li>Crypto and tokenised assets</li>
              <li>Insurance products</li>
              <li>Automated investing until suitability and consent are reviewed</li>
              <li>Multi-country launch</li>
            </ul>
          </article>
          <article className="cs-info-card reveal">
            <h3>Non-negotiables</h3>
            <ul>
              <li>Primary screens load in under three seconds</li>
              <li>99.5% availability, with explicit pending states</li>
              <li>Step-up authentication for every money movement</li>
              <li>No guaranteed-return or unsupported deposit-insurance claims</li>
              <li>Every transaction carries a unique reference</li>
            </ul>
          </article>
          <article className="cs-info-card reveal">
            <h3>My job</h3>
            <p>
              Turn the requirements into an information architecture, a product grammar and a
              buildable interface — then ship working mobile, desktop and marketing surfaces from
              the same tokens.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}

function Problem() {
  return (
    <section className="cs-section cs-dark">
      <div className="cs-wrap">
        <div className="cs-section-head reveal">
          <div className="cs-section-num">02 — The problem</div>
          <div>
            <h2>
              The problem isn’t access.
              <br />
              It’s <em style={{ color: '#A9CBFF' }}>confidence.</em>
            </h2>
            <p className="cs-lede">
              Five apps can each work and still leave someone unsure whether their money is safe,
              where it went, or what happens next. The design job was to collapse the surface area
              without hiding the consequences.
            </p>
          </div>
        </div>

        <div className="cs-fragment reveal">
          <div className="cs-fragment-col">
            <div className="cs-fragment-card">
              <span className="num">01</span>
              <span>
                Savings app — <strong>lock funds</strong>
              </span>
            </div>
            <div className="cs-fragment-card">
              <span className="num">02</span>
              <span>
                Bank app — <strong>move money</strong>
              </span>
            </div>
            <div className="cs-fragment-card">
              <span className="num">03</span>
              <span>
                Broker app — <strong>buy shares</strong>
              </span>
            </div>
            <div className="cs-fragment-card">
              <span className="num">04</span>
              <span>
                Support inbox — <strong>find a receipt</strong>
              </span>
            </div>
            <div className="cs-fragment-card">
              <span className="num">05</span>
              <span>
                Memory — <strong>remember the PIN</strong>
              </span>
            </div>
          </div>
          <div className="cs-fragment-arrow">
            <span>collapse</span>
            <span className="line" />
            <ArrowRight size={16} />
          </div>
          <div className="cs-fragment-col after">
            <h3>One Apex account</h3>
            <p>
              A wallet, three savings products and an investment portfolio behind one identity,
              one review pattern and one ledger. The user learns the product once.
            </p>
            <div className="cs-fragment-tags">
              <span>One identity</span>
              <span>One ledger</span>
              <span>One support thread</span>
              <span>One fee vocabulary</span>
            </div>
          </div>
        </div>

        <div className="cs-dark-quote reveal">
          <p>
            Designing for trust meant designing the boring parts exceptionally well — states,
            receipts, limits and disclosures.
          </p>
          <small>
            The PRD’s acceptance criteria hang on money movements being ledgered, traceable,
            reconciled and idempotent. That is a UX requirement as much as an engineering one: a
            timeout must never let someone submit the same transfer twice.
          </small>
        </div>
      </div>
    </section>
  );
}

const personas = [
  {
    icon: Briefcase,
    name: 'Salary Earner',
    role: 'Regular pay cycle · cautious beginner',
    quote: '“I want my salary to do something before I spend it.”',
    needs: [
      'Automate savings on payday',
      'Lock rent money for a known tenure',
      'Know exactly when funds become available',
    ],
    implication: 'Default to auto-save; put maturity dates and early-access rules on the plan card.',
  },
  {
    icon: Wallet,
    name: 'Freelancer / SME Owner',
    role: 'Irregular income · cash-flow aware',
    quote: '“Some months are heavy. Some are thin.”',
    needs: [
      'Deposit whenever money lands',
      'See cash flow across wallets',
      'Pause auto-save without confusion',
    ],
    implication: 'Make flexible savings the default; make pausing a first-class state, not a buried setting.',
  },
  {
    icon: LineChart,
    name: 'First-Time Investor',
    role: 'Small capital · needs confidence',
    quote: '“I’ve heard about shares. I don’t want to lose money I can’t explain.”',
    needs: [
      'Company information in plain language',
      'Clear prices, timestamps and fees',
      'A confirmation they can show someone',
    ],
    implication: 'Ship order previews, delayed-price labels and risk language before the first trade.',
  },
];

function Personas() {
  return (
    <section className="cs-section">
      <div className="cs-wrap">
        <SectionHead
          num="03 — Who it’s for"
          title={
            <>
              Three money rhythms. <em>One</em> interface.
            </>
          }
          lede="The PRD defined three primary personas. I translated each into a concrete design implication rather than a marketing stereotype."
        />
        <div className="cs-personas">
          {personas.map((p) => (
            <article className="cs-persona reveal" key={p.name}>
              <div className="cs-persona-top">
                <span className="glyph">
                  <p.icon size={19} />
                </span>
                <div>
                  <h3>{p.name}</h3>
                  <small>{p.role}</small>
                </div>
              </div>
              <blockquote>{p.quote}</blockquote>
              <ul>
                {p.needs.map((n) => (
                  <li key={n}>
                    <Check size={14} /> {n}
                  </li>
                ))}
              </ul>
              <div className="implication">
                Design implication
                <span>{p.implication}</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

const principles = [
  {
    n: '01',
    title: 'Simplicity is one pattern, repeated.',
    body: 'Every money action uses the same review → PIN → receipt sequence. Flexible savings, fixed deposits, share orders and withdrawals all feel like the same product, because they are.',
    rule: 'Plain language · one primary action per screen',
  },
  {
    n: '02',
    title: 'Transparency is shown, not promised.',
    body: 'Rates, fees, limits, maturity dates and processing times sit before the confirm button — not in a help centre. If the price is delayed, the timestamp says so.',
    rule: 'Disclose, then confirm',
  },
  {
    n: '03',
    title: 'Security belongs where money moves.',
    body: 'Biometrics can replace a password at the door, but sensitive actions always step up. A new device, a new beneficiary or an unusual amount triggers a visible security event.',
    rule: 'Re-authenticate for money',
  },
  {
    n: '04',
    title: 'Inclusion means irregular income.',
    body: 'Small starting amounts, readable type, local currency first and states that survive poor connectivity. No false urgency, no hidden defaults, no shame around small balances.',
    rule: 'No dark patterns',
  },
];

function Principles() {
  return (
    <section className="cs-section">
      <div className="cs-wrap">
        <SectionHead
          num="04 — Principles"
          title={
            <>
              Four rules that survived <em>every</em> screen.
            </>
          }
          lede="The PRD’s core values — simplicity, trust, accessibility, growth — only became useful once they turned into decisions a builder could check."
        />
        <div className="cs-principles reveal">
          {principles.map((p) => (
            <article className="cs-principle" key={p.n}>
              <div className="idx">{p.n}</div>
              <h3>{p.title}</h3>
              <p>{p.body}</p>
              <span className="rule">{p.rule}</span>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Architecture() {
  const tabs = [
    {
      icon: Zap,
      name: 'Home',
      copy: 'Balance, savings and portfolio snapshots, quick actions, recent activity.',
      idx: 'Tab 01',
    },
    {
      icon: Target,
      name: 'Save',
      copy: 'Flexible, fixed and target plans; create, fund, withdraw and track progress.',
      idx: 'Tab 02',
    },
    {
      icon: TrendingUp,
      name: 'Invest',
      copy: 'Discover companies, view prices, place buy/sell orders and track holdings.',
      idx: 'Tab 03',
    },
    {
      icon: User,
      name: 'Profile',
      copy: 'Identity, KYC, linked banks, security, notifications, support and legal.',
      idx: 'Tab 04',
    },
  ];
  return (
    <section className="cs-section">
      <div className="cs-wrap">
        <SectionHead
          num="05 — Structure"
          title={
            <>
              Four tabs. One <em>money spine.</em>
            </>
          }
          lede="Authenticated navigation stays persistent and shallow. Every journey — save, invest or withdraw — runs through the same identity, funding and confirmation spine."
        />
        <div className="cs-ia">
          <div className="cs-tabs reveal">
            {tabs.map((t) => (
              <div className="cs-tab" key={t.name}>
                <span className="ic">
                  <t.icon size={18} />
                </span>
                <div>
                  <h3>{t.name}</h3>
                  <p>{t.copy}</p>
                </div>
                <span className="idx">{t.idx}</span>
              </div>
            ))}
          </div>
          <div className="cs-flow reveal">
            {[
              ['Create account', 'Phone or email · OTP · PIN'],
              ['Verify identity', 'Level 1 limits · Level 2 BVN/NIN + liveness'],
              ['Fund wallet', 'Bank transfer or card · unique reference'],
              ['Put money to work', 'Flexible · fixed · target · equities'],
              ['Move or exit', 'Verified bank account · PIN + step-up · receipt'],
            ].map(([title, meta], i) => (
              <div className="cs-flow-step" key={title}>
                <span className="n">{i + 1}</span>
                <div className="bar">
                  <strong>{title}</strong>
                  <span>{meta}</span>
                </div>
              </div>
            ))}
            <div className="cs-flow-note">
              <RefreshCw size={15} />
              <span>
                Every state is first-class: pending, successful, reversed and failed each get a
                reference, a plain-language explanation and a next step. No dead ends, no duplicate
                transfers.
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const swatches = [
  ['Royal blue', '#1D52CE', '#1D52CE'],
  ['Deep action', '#003EC5', '#003EC5'],
  ['Fixed purple', '#760A81', '#760A81'],
  ['Target green', '#06720C', '#06720C'],
  ['Sky', '#A9CBFF', '#A9CBFF'],
  ['Lilac', '#F4CCF9', '#F4CCF9'],
  ['Mint', '#C3F3C6', '#C3F3C6'],
  ['Red', '#F04438', '#F04438'],
];

function System() {
  return (
    <section className="cs-system" id="system">
      <div className="cs-wrap">
        <div className="cs-section-head reveal">
          <div className="cs-section-num">06 — Design system</div>
          <div>
            <h2>
              Three product colours.
              <br />
              One <em style={{ color: '#A9CBFF' }}>grammar.</em>
            </h2>
            <p className="cs-lede">
              The Figma file already used blue, purple and green as product codes. I kept that
              instinct and made it systematic: colour tells you which product you’re inside; shape,
              type and language tell you what to do next.
            </p>
          </div>
        </div>

        <div className="cs-system-grid">
          <div className="cs-panel reveal">
            <h3>
              Colour <span>Semantic, not decorative</span>
            </h3>
            <div className="cs-swatches">
              {swatches.map(([name, hex, color]) => (
                <div className="cs-swatch" key={name}>
                  <div className="chip" style={{ background: color }} />
                  <b>{name}</b>
                  <span>{hex}</span>
                </div>
              ))}
            </div>
            <div className="cs-money-spec">
              <div className="cs-money-line">
                <span>Primary money</span>
                <b style={{ color: '#A9CBFF' }}>Flexible · wallet · actions</b>
              </div>
              <div className="cs-money-line">
                <span>Time-bound</span>
                <b style={{ color: '#F4CCF9' }}>Fixed deposits</b>
              </div>
              <div className="cs-money-line">
                <span>Progress</span>
                <b style={{ color: '#C3F3C6' }}>Targets · success</b>
              </div>
              <div className="cs-money-line">
                <span>Risk</span>
                <b style={{ color: '#F04438' }}>Loss · failed · destructive</b>
              </div>
            </div>
          </div>

          <div className="cs-panel reveal">
            <h3>
              Type <span>Sora + Manrope</span>
            </h3>
            <div className="cs-type">
              <div className="cs-type-row">
                <span className="sample" style={{ fontFamily: 'var(--font-display)', fontSize: 48, fontWeight: 600 }}>
                  ₦1,240,400
                </span>
                <small>Display · 600</small>
              </div>
              <div className="cs-type-row">
                <span className="sample" style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600 }}>
                  Grow your money
                </span>
                <small>Heading · 600</small>
              </div>
              <div className="cs-type-row">
                <span className="sample" style={{ fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 600 }}>
                  Every rate, fee and risk before you commit.
                </span>
                <small>Body · Manrope</small>
              </div>
              <div className="cs-type-row">
                <span className="sample" style={{ fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase' }}>
                  NGX · 15-min delay
                </span>
                <small>Caption · 700</small>
              </div>
            </div>
            <div className="cs-money-spec">
              <div className="cs-money-line">
                <span>Currency</span>
                <b style={{ fontSize: 13 }}>₦ before the amount, always</b>
              </div>
              <div className="cs-money-line">
                <span>Precision</span>
                <b style={{ fontSize: 13 }}>2 decimals for prices · 0 for summaries</b>
              </div>
              <div className="cs-money-line">
                <span>Numerals</span>
                <b style={{ fontSize: 13 }}>Tabular, for scan-friendly ledgers</b>
              </div>
            </div>
          </div>

          <div className="cs-panel reveal">
            <h3>
              Components <span>Same grammar everywhere</span>
            </h3>
            <div className="cs-components">
              <div>
                <div className="cs-comp-row">
                  <span className="cs-comp-btn" style={{ background: '#1D52CE', color: '#fff' }}>
                    Add money
                  </span>
                  <span className="cs-comp-btn" style={{ background: '#EEF4FF', color: '#003EA8' }}>
                    Withdraw
                  </span>
                  <span className="cs-comp-btn" style={{ border: '1px solid rgba(255,255,255,.24)', color: '#F3EFE4' }}>
                    Cancel
                  </span>
                </div>
                <div className="cs-comp-row">
                  <span className="cs-comp-pill" style={{ background: 'rgba(195,243,198,.14)', color: '#C3F3C6' }}>
                    ● Active
                  </span>
                  <span className="cs-comp-pill" style={{ background: 'rgba(169,203,255,.14)', color: '#A9CBFF' }}>
                    Flexible
                  </span>
                  <span className="cs-comp-pill" style={{ background: 'rgba(244,204,249,.14)', color: '#F4CCF9' }}>
                    Fixed
                  </span>
                  <span className="cs-comp-pill" style={{ background: 'rgba(240,68,56,.16)', color: '#FF8A80' }}>
                    Risk
                  </span>
                </div>
                <div className="cs-comp-row">
                  <div className="cs-comp-field">Search companies</div>
                </div>
              </div>
              <div className="cs-plan-card">
                <div className="top">
                  <b style={{ fontFamily: 'var(--font-ui)', fontSize: 12 }}>New Laptop Fund</b>
                  <span>48%</span>
                </div>
                <b>₦412,500</b>
                <div className="cs-plan-progress">
                  <i style={{ width: '48.5%' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 10, color: '#5F6A7E', fontWeight: 700 }}>
                  <span>of ₦850,000</span>
                  <span>Auto-save ₦50k</span>
                </div>
              </div>
            </div>
          </div>

          <div className="cs-panel reveal">
            <h3>
              Rules <span>What the system protects</span>
            </h3>
            <div className="cs-decisions" style={{ marginTop: 6 }}>
              <div className="cs-decision" style={{ borderColor: 'rgba(255,255,255,.08)' }}>
                <b style={{ color: 'rgba(243,239,228,.45)' }}>Radii</b>
                <p style={{ color: 'rgba(243,239,228,.78)' }}>
                  12px controls · 16px cards · 22px plan surfaces · pill for status.
                </p>
              </div>
              <div className="cs-decision" style={{ borderColor: 'rgba(255,255,255,.08)' }}>
                <b style={{ color: 'rgba(243,239,228,.45)' }}>Actions</b>
                <p style={{ color: 'rgba(243,239,228,.78)' }}>
                  One filled primary per screen. Destructive money actions never sit beside the
                  primary without a review step.
                </p>
              </div>
              <div className="cs-decision" style={{ borderColor: 'rgba(255,255,255,.08)' }}>
                <b style={{ color: 'rgba(243,239,228,.45)' }}>Status</b>
                <p style={{ color: 'rgba(243,239,228,.78)' }}>
                  Colour is reinforcement, never the only signal. Every status includes a word and
                  an icon.
                </p>
              </div>
              <div className="cs-decision" style={{ border: 0 }}>
                <b style={{ color: 'rgba(243,239,228,.45)' }}>Language</b>
                <p style={{ color: 'rgba(243,239,228,.78)' }}>
                  “Interest”, not “yield”. “Price can fall”, not “growth guaranteed”. Fees always
                  carry an amount.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Surfaces() {
  const cards = [
    {
      tag: '01 · Mobile app',
      title: 'The product',
      copy: 'A four-tab PWA that carries the full journey: onboarding, KYC, wallet, three savings products, share orders and portfolio.',
      tags: ['Installable PWA', 'iOS + Android', 'Bottom navigation'],
      link: links.mobile,
      action: 'Open mobile app',
      preview: <MiniPhone variant="save" />,
    },
    {
      tag: '02 · Desktop app',
      title: 'The operating view',
      copy: 'The same accounts with more room to think: portfolio performance, savings goals, market tables and a filterable ledger.',
      tags: ['1280px+', 'Sidebar navigation', 'Dense data'],
      link: links.desktop,
      action: 'Open desktop app',
      preview: <MiniDesktop />,
    },
    {
      tag: '03 · Website',
      title: 'The trust layer',
      copy: 'The public promise: what Apex does, who it partners with, what it costs and where the risks sit — before anyone downloads.',
      tags: ['Marketing', 'Disclosures', 'PWA install'],
      link: links.website,
      action: 'Open website',
      preview: <MiniBrowser />,
    },
  ];
  return (
    <section className="cs-section" id="surfaces">
      <div className="cs-wrap">
        <SectionHead
          num="07 — Surfaces"
          title={
            <>
              One system, three <em>contexts.</em>
            </>
          }
          lede="Mobile is where the money moves. Desktop is where people plan and review. The website is where trust is earned before a phone number is shared. Each surface is a live build, not a mockup."
        />
        <div className="cs-surfaces">
          {cards.map((c) => (
            <article className="cs-surface reveal" key={c.title}>
              <div className="cs-surface-top">
                <span className="tag">{c.tag}</span>
                <span className="arrow">
                  <ArrowUpRight size={16} />
                </span>
              </div>
              <h3>{c.title}</h3>
              <p>{c.copy}</p>
              <ul>
                {c.tags.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
              <a
                className="cs-surface-link"
                href={launch(c.link, '#surfaces')}
                aria-disabled={!isLive(c.link)}
                {...external(c.link)}
              >
                {isLive(c.link) ? c.action : 'Launching with this release'} <ArrowRight size={14} />
              </a>
              <div className={`cs-surface-preview${c.title === 'The operating view' ? ' desktop-preview' : ''}`}>
                {c.preview}
              </div>
            </article>
          ))}
        </div>

        <div className="cs-demo reveal">
          <div className="cs-demo-head">
            <div>
              <span className="cs-demo-tag">Recorded walkthrough · 0:23</span>
              <h3>The desktop workspace, in motion.</h3>
              <p>
                Wallet, a new savings plan, a share order preview and the activity ledger — captured
                from the running build, not a motion mockup.
              </p>
            </div>
            <a
              className="cs-demo-link"
              href={launch(links.desktop, '#surfaces')}
              {...external(links.desktop)}
            >
              Open the desktop app <ArrowUpRight size={14} />
            </a>
          </div>
          <div className="cs-demo-player">
            <video
              controls
              playsInline
              preload="metadata"
              poster="./assets/demo-poster.jpg"
              aria-label="Recorded walkthrough of the Apex Finance desktop app"
            >
              <source src="./assets/demo.mp4" type="video/mp4" />
              Your browser does not support embedded video.
            </video>
          </div>
          <div className="cs-demo-foot">
            <span>Demo data · no live money</span>
            <span>1280 × 800 · captured from the production build</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function DeepDive() {
  const rows = [
    {
      label: 'Mobile · Onboarding',
      title: 'Earn trust before asking for data.',
      copy: 'Nigerian users are asked for BVN and NIN constantly. The flow has to explain the value of verification before it asks — and must not block exploration behind it.',
      visual: <MiniPhone variant="onboarding" />,
      decisions: [
        ['Entry', 'Phone number first: it is the identity and recovery anchor, and the fastest path to an OTP.'],
        ['Sequencing', 'Account → PIN → limited wallet access. Level 2 identity checks unlock higher limits.'],
        ['Language', 'KYC is framed as “raise your limits”, not “compliance requirement”. Each tier shows its actual capability.'],
        ['Escape hatch', '“Explore first” enters a clearly limited mode with persistent limit reminders.'],
      ],
    },
    {
      label: 'Mobile · Home',
      title: 'A money map, not a dashboard.',
      copy: 'The home screen answers three questions in order: how much do I have, where is it, and what changed? Everything else is secondary.',
      visual: <MiniPhone variant="home" />,
      decisions: [
        ['Hierarchy', 'One total balance, split into savings and investments — the same categories used everywhere else.'],
        ['Quick actions', 'Add money and withdraw are always visible; savings and investing live one tap away.'],
        ['Performance', 'Returns appear only with a live portfolio, and always with a timestamp and currency.'],
        ['Honesty', 'Demo data is labelled as illustrative; no invented user counts or returns.'],
      ],
    },
    {
      label: 'Mobile · Save',
      title: 'Three products, one grammar.',
      copy: 'Flexible, fixed and target savings behave differently, but their cards, progress bars and review sheets share the same anatomy. Colour does the wayfinding; words do the work.',
      visual: <MiniPhone variant="save" />,
      decisions: [
        ['Blue', 'Flexible savings: movement and access. Rate and withdrawal rules are shown on the plan.'],
        ['Purple', 'Fixed deposits: time. Maturity date, early-access rules and projected payout before confirmation.'],
        ['Green', 'Targets: progress. Remaining amount, auto-save schedule and pause controls in one place.'],
        ['Empty states', 'No plan yet is not a dead end: the create flow is the primary action, with product explanations.'],
      ],
    },
    {
      label: 'Mobile · Invest',
      title: 'Beginner-safe by default.',
      copy: 'Share investing is the highest-anxiety surface. The interface slows the user down at exactly two points: before the order and before the first trade.',
      visual: <MiniPhone variant="order" />,
      decisions: [
        ['Context', 'Company detail shows exchange, sector, delayed-price label and a timestamp before price.'],
        ['Order review', 'Units, estimated cost, fees and total sit together. Market vs limit is explained in plain language.'],
        ['Risk', '“Prices can fall as well as rise” appears before confirmation — not only in the footer.'],
        ['Portfolio', 'Holdings show cost basis and current value; unrealised performance is a range, never a promise.'],
      ],
    },
  ];
  return (
    <section className="cs-section" id="deep-dive">
      <div className="cs-wrap">
        <SectionHead
          num="08 — Deep dive"
          title={
            <>
              The decisions that made it feel <em>inevitable.</em>
            </>
          }
          lede="Four surfaces carry most of the product risk. Each one is a small argument about where friction belongs."
        />
        <div className="cs-deep">
          {rows.map((r) => (
            <div className="cs-deep-row reveal" key={r.title}>
              <div className="cs-deep-visual">{r.visual}</div>
              <div className="cs-deep-copy">
                <span className="cs-deep-label">{r.label}</span>
                <h3>{r.title}</h3>
                <p>{r.copy}</p>
                <div className="cs-decisions">
                  {r.decisions.map(([k, v]) => (
                    <div className="cs-decision" key={k}>
                      <b>{k}</b>
                      <p>{v}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Trust() {
  return (
    <section className="cs-section">
      <div className="cs-wrap">
        <SectionHead
          num="09 — Trust"
          title={
            <>
              Compliance is a <em>design</em> material.
            </>
          }
          lede="The PRD is explicit that Apex is not a bank, broker or investment adviser unless authorised. That constraint shapes the UI: claims are conditional, partners are named, and risk is visible."
        />
        <div className="cs-trust">
          <article className="cs-trust-card reveal">
            <span className="ic">
              <Fingerprint size={19} />
            </span>
            <h3>Identity &amp; limits</h3>
            <p>Two clear verification tiers, with states that never leave the user guessing.</p>
            <ul>
              <li>
                <Check size={13} /> Level 1: contact verified, restricted limits
              </li>
              <li>
                <Check size={13} /> Level 2: BVN/NIN + document + liveness
              </li>
              <li>
                <Check size={13} /> Not started, in review, verified, action required, failed
              </li>
            </ul>
          </article>
          <article className="cs-trust-card reveal">
            <span className="ic">
              <FileCheck size={19} />
            </span>
            <h3>Transaction truth</h3>
            <p>Every movement has a reference and a receipt the user can act on.</p>
            <ul>
              <li>
                <Check size={13} /> Unique reference on every request
              </li>
              <li>
                <Check size={13} /> Pending, successful, reversed and failed states
              </li>
              <li>
                <Check size={13} /> Timeout protection against duplicate transfers
              </li>
            </ul>
          </article>
          <article className="cs-trust-card reveal">
            <span className="ic">
              <ShieldCheck size={19} />
            </span>
            <h3>Investment risk</h3>
            <p>Shares are offered through a licensed partner — and the interface says so.</p>
            <ul>
              <li>
                <Check size={13} /> Prices can fall as well as rise
              </li>
              <li>
                <Check size={13} /> Delayed-data and timestamp labels
              </li>
              <li>
                <Check size={13} /> Fees, taxes and settlement shown before order
              </li>
            </ul>
          </article>
        </div>
        <div className="cs-callout reveal">
          <CircleAlert size={20} />
          <p>
            <b>A deliberate absence:</b> no “risk-free”, “guaranteed returns”, “NDIC-insured” or
            “instant” language appears anywhere unless the partner structure and legal review
            support it. The PRD sets the bar — the app never describes a rate or return as
            guaranteed unless it legally and contractually is.
          </p>
        </div>
      </div>
    </section>
  );
}

function Measures() {
  const metrics = [
    {
      tag: 'North star',
      name: 'Monthly active users',
      why: 'Activation quality, not installs. Track 7-day return after the first deposit.',
    },
    {
      tag: 'Trust',
      name: 'Total savings volume',
      why: 'Principal held in eligible products, segmented by flexible, fixed and target.',
    },
    {
      tag: 'Operations',
      name: 'Withdrawal success rate',
      why: 'The percentage of valid withdrawals completed without support intervention.',
    },
    {
      tag: 'Confidence',
      name: 'Investment volume',
      why: 'Completed buy/sell value; watch first-trade completion and repeat trades separately.',
    },
    {
      tag: 'Habit',
      name: '30/90-day retention',
      why: 'Cohort by income pattern and acquisition channel — not one blended number.',
    },
    {
      tag: 'Reliability',
      name: 'Crash-free sessions',
      why: 'Prioritise the money spine: funding, savings, orders, withdrawals.',
    },
  ];
  return (
    <section className="cs-section" id="measure">
      <div className="cs-wrap">
        <SectionHead
          num="10 — Measures"
          title={
            <>
              What success has to <em>prove.</em>
            </>
          }
          lede="No invented outcomes. These are the KPIs the MVP should be judged on, plus the guardrails that stop growth from hiding harm."
        />
        <div className="cs-metrics reveal">
          {metrics.map((m) => (
            <div className="cs-metric" key={m.name}>
              <span>{m.tag}</span>
              <b>{m.name}</b>
              <p>{m.why}</p>
              <em>Instrumented · MVP</em>
            </div>
          ))}
        </div>
        <div className="cs-callout reveal" style={{ marginTop: 20 }}>
          <RefreshCw size={20} />
          <p>
            <b>Guardrails:</b> complaint rate per 1,000 transactions · failed-KYC drop-off by step ·
            support contacts after a failed transfer · comprehension of early-access rules · the
            share of users who can correctly state that prices can fall. Growth is only good if
            these stay healthy.
          </p>
        </div>
      </div>
    </section>
  );
}

function Reflection() {
  return (
    <section className="cs-section" id="reflection">
      <div className="cs-wrap">
        <SectionHead
          num="11 — Reflection"
          title={
            <>
              What I’d test <em>next.</em>
            </>
          }
          lede="This is a planning-stage case study, so the honest next step is validation — not a victory lap."
        />
        <div className="cs-reflect">
          <article className="cs-reflect-col reveal">
            <h3>What I’d validate</h3>
            <ol>
              {[
                'Moderated tests of create-plan and first-trade flows with 8–10 first-time investors.',
                'Whether people can explain fixed-deposit maturity and early-access rules after 24 hours.',
                'Trust perception of BVN/NIN requests, with and without the “raise your limits” framing.',
                'Usability on low bandwidth and mid-range Android devices.',
              ].map((t, i) => (
                <li key={t}>
                  <span className="n">{i + 1}</span>
                  {t}
                </li>
              ))}
            </ol>
          </article>
          <article className="cs-reflect-col reveal">
            <h3>What I’d ship next</h3>
            <ul>
              {[
                'Beneficiary management with a cooling-off period for new accounts.',
                'Scheduled transfers and salary-day rules.',
                'Downloadable statements and shareable receipts.',
                'Screen-reader and contrast audit across the money spine.',
                'Hausa, Yoruba and Nigerian Pidgin language layers.',
              ].map((t) => (
                <li key={t}>
                  <Plus size={13} style={{ flexShrink: 0, marginTop: 2, color: 'var(--cs-blue)' }} />
                  {t}
                </li>
              ))}
            </ul>
          </article>
          <article className="cs-reflect-col reveal">
            <h3>Open decisions</h3>
            <ul>
              {[
                'NGX-only or international securities at launch?',
                'Approved minimums, rates, tenures and interest-crediting rules.',
                'Wallet legal structure and customer-fund safeguarding.',
                'Broker, custodian, banking and payment partners.',
                'KYC tiers, limits, provider and escalation policy.',
                'Fee, tax and settlement service levels.',
              ].map((t) => (
                <li key={t}>
                  <CircleAlert size={13} style={{ flexShrink: 0, marginTop: 2, color: 'var(--amber-700)' }} />
                  {t}
                </li>
              ))}
            </ul>
          </article>
        </div>
      </div>
    </section>
  );
}

function Cta() {
  const anyLive = isLive(links.mobile) || isLive(links.desktop) || isLive(links.website);
  return (
    <section className="cs-wrap">
      <div className="cs-cta reveal">
        <div className="cs-cta-bg" />
        <div className="cs-cta-inner">
          <div>
            <span className="eyebrow" style={{ color: 'rgba(245,241,231,.55)' }}>
              The build
            </span>
            <h2>
              Three surfaces.
              <br />
              One <em>live</em> product.
            </h2>
            <p>
              The case study is the story. The apps are the argument: a mobile PWA you can install,
              a desktop workspace, and a public website that states the terms plainly.
            </p>
          </div>
          <div className="cs-cta-actions">
            <a
              className="btn btn-primary"
              href={launch(links.mobile, '#surfaces')}
              {...external(links.mobile)}
            >
              <Smartphone size={16} /> Mobile app
            </a>
            <a
              className="btn btn-white"
              href={launch(links.desktop, '#surfaces')}
              {...external(links.desktop)}
            >
              <Monitor size={16} /> Desktop
            </a>
            <a
              className="btn"
              style={{ border: '1px solid rgba(255,255,255,.26)', color: '#fff' }}
              href={launch(links.website, '#surfaces')}
              {...external(links.website)}
            >
              <Globe size={16} /> Website
            </a>
          </div>
        </div>
        {!anyLive && (
          <p style={{ position: 'relative', zIndex: 2, marginTop: 26, fontSize: 11, color: 'rgba(245,241,231,.45)' }}>
            Links go live with this release.
          </p>
        )}
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="cs-footer">
      <div className="cs-wrap">
        <div className="cs-footer-grid">
          <div>
            <Logo size={34} />
            <p>
              A product design case study and working prototype for a Nigeria-first savings,
              payments and share-investing platform. Built from the Apex Finance PRD and Figma
              design file.
            </p>
          </div>
          <div>
            <h4>Explore</h4>
            <ul>
              <li>
                <a href="#brief">The brief</a>
              </li>
              <li>
                <a href="#system">Design system</a>
              </li>
              <li>
                <a href="#deep-dive">Mobile deep dive</a>
              </li>
              <li>
                <a href="#measure">Measures</a>
              </li>
            </ul>
          </div>
          <div>
            <h4>Live surfaces</h4>
            <ul>
              <li>
                <a href={launch(links.mobile, '#surfaces')} {...external(links.mobile)}>
                  Mobile app
                </a>
              </li>
              <li>
                <a href={launch(links.desktop, '#surfaces')} {...external(links.desktop)}>
                  Desktop app
                </a>
              </li>
              <li>
                <a href={launch(links.website, '#surfaces')} {...external(links.website)}>
                  Website
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="cs-footer-bottom">
          <span>© 2026 Apex Finance — concept case study.</span>
          <span>Lagos · Nigeria</span>
        </div>
        <p className="cs-disclaimer">
          Apex Finance is a design and engineering concept, not a licensed financial institution.
          Nothing here is an offer to accept deposits, provide payment services, deal in securities
          or give investment advice. All balances, prices, plans and transactions shown in the apps
          are illustrative demo data. Real products, rates, fees, limits and protections must be
          confirmed with licensed partners and qualified Nigerian legal and compliance advisers
          before launch. Share prices can fall as well as rise.
        </p>
      </div>
    </footer>
  );
}

export default function App() {
  useReveal();
  return (
    <div className="cs" id="top">
      <a className="skip-link" href="#brief">
        Skip to case study
      </a>
      <Nav />
      <main>
        <Hero />
        <Provenance />
        <Brief />
        <Problem />
        <Personas />
        <Principles />
        <Architecture />
        <System />
        <Surfaces />
        <DeepDive />
        <Trust />
        <Measures />
        <Reflection />
        <Cta />
      </main>
      <Footer />
    </div>
  );
}
