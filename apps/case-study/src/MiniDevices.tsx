import {
  ArrowLeft,
  ArrowUpRight,
  Bell,
  Bookmark,
  ChevronRight,
  Eye,
  Fingerprint,
  Home,
  Landmark,
  Lock,
  LogOut,
  MessageCircle,
  Moon,
  Plus,
  Search,
  ShieldCheck,
  Target,
  TrendingUp,
  User,
  Zap,
} from 'lucide-react';
import { ApexMark, Sparkline } from '@shared/ui';
import { ngn, stocks, user } from '@shared/data';

type Variant = 'home' | 'save' | 'invest' | 'order' | 'profile' | 'onboarding';

const navItems = [
  { key: 'home', label: 'Home', Icon: Home },
  { key: 'save', label: 'Save', Icon: Bookmark },
  { key: 'invest', label: 'Invest', Icon: TrendingUp },
  { key: 'profile', label: 'Profile', Icon: User },
];

function StatusBar({ dark = false }: { dark?: boolean }) {
  return (
    <div className={`mp-status${dark ? ' on-dark' : ''}`}>
      <span>9:41</span>
      <span className="island" />
      <span className="mp-status-icons">
        <span className="bars">
          <b style={{ height: 3 }} />
          <b style={{ height: 5 }} />
          <b style={{ height: 7 }} />
          <b style={{ height: 8 }} />
        </span>
        <i />
      </span>
    </div>
  );
}

function Nav({ active }: { active: string }) {
  return (
    <div className="mp-nav">
      {navItems.map(({ key, label, Icon }) => (
        <div key={key} className={`mp-nav-item${key === active ? ' active' : ''}`}>
          <Icon strokeWidth={key === active ? 2.4 : 1.9} />
          {label}
        </div>
      ))}
    </div>
  );
}

function HomeScreen() {
  return (
    <>
      <div className="mp-head">
        <div className="avatar">AO</div>
        <div className="greet">
          <small>Good morning,</small>
          <b>Ada Okafor</b>
        </div>
        <div className="mp-icon-btn">
          <Bell size={11} />
        </div>
      </div>

      <div className="mp-balance">
        <div className="label">
          Total balance in <b>NGN</b>
          <Eye size={8} style={{ marginLeft: 'auto', opacity: 0.7 }} />
        </div>
        <div className="amount">₦1,240,400.00</div>
        <div className="cols">
          <div>
            <small>Savings</small>
            <b>₦807,500.00</b>
          </div>
          <div>
            <small>Investments</small>
            <b>₦164,500.00</b>
          </div>
        </div>
      </div>

      <div className="mp-actions">
        <div className="mp-chip">
          <Plus size={8} /> Add money
        </div>
        <div className="mp-chip dark">
          <ArrowUpRight size={8} /> Withdraw
        </div>
      </div>

      <div className="mp-quick">
        <div style={{ background: '#FFDCCE' }}>
          <Landmark size={12} /> NGN
        </div>
        <div style={{ background: '#FFF0C2' }}>
          <Bell size={12} /> USD
        </div>
        <div style={{ background: '#CCF4F9' }}>
          <TrendingUp size={12} /> Stocks
        </div>
        <div style={{ background: '#C3F3C6' }}>
          <Target size={12} /> Goals
        </div>
      </div>

      <div className="mp-card">
        <div className="mp-section-title">
          Today’s performance <span>+4.8%</span>
        </div>
        <div className="mp-perf">
          <div>
            <div className="k">Total return</div>
            <div className="v">+₦73,000</div>
          </div>
          <div>
            <div className="k">Active plans</div>
            <div className="v">4 plans</div>
          </div>
        </div>
      </div>

      <div className="mp-card" style={{ paddingTop: 9 }}>
        <div className="mp-section-title">
          Top movers <span>See all</span>
        </div>
        {stocks.slice(0, 3).map((s) => (
          <div className="mp-stock-row" key={s.symbol}>
            <div className="tick" style={{ background: s.tint }}>
              {s.symbol.slice(0, 2)}
            </div>
            <div className="nm">
              <b>{s.name}</b>
              <small>{s.symbol}</small>
            </div>
            <Sparkline
              data={s.spark}
              width={38}
              height={16}
              stroke={s.change >= 0 ? '#0B8A13' : '#D92D20'}
              fill={false}
              strokeWidth={1.4}
            />
            <div className="pr">
              <b>{ngn(s.price, 2)}</b>
              <small className={s.change < 0 ? 'down' : ''}>
                {s.change > 0 ? '↗' : '↘'} {Math.abs(s.change).toFixed(2)}%
              </small>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function InvestScreen() {
  return (
    <div className="mp-scroll">
      <div className="mp-invest-head">
        <h3>Invest</h3>
        <div className="portfolio">
          <div>
            <small>Portfolio value</small>
            <b>₦164,500.00</b>
          </div>
          <div style={{ textAlign: 'right' }}>
            <small>Today</small>
            <b style={{ color: '#0B8A13', fontSize: 10 }}>+₦3,280</b>
          </div>
        </div>
        <div className="mp-market-tabs">
          <div className="active">NGN stocks</div>
          <div>US stocks</div>
        </div>
        <div className="mp-search">
          <Search size={8} /> Search companies
        </div>
      </div>
      <div className="mp-card" style={{ marginTop: 2, paddingTop: 8 }}>
        <div className="mp-section-title">
          Top 10 by market cap <span>See all</span>
        </div>
        {stocks.slice(0, 7).map((s) => (
          <div className="mp-stock-row" key={s.symbol}>
            <div className="tick" style={{ background: s.tint }}>
              {s.symbol.slice(0, 2)}
            </div>
            <div className="nm">
              <b>{s.name}</b>
              <small>
                {s.symbol} · {s.sector}
              </small>
            </div>
            <div className="pr">
              <b>{ngn(s.price, 2)}</b>
              <small className={s.change < 0 ? 'down' : ''}>
                {s.change > 0 ? '↗' : s.change < 0 ? '↘' : '–'} {Math.abs(s.change).toFixed(2)}%
              </small>
            </div>
          </div>
        ))}
      </div>
      <div style={{ height: 8 }} />
    </div>
  );
}

function InvestNav() {
  return <Nav active="invest" />;
}

function OrderScreen() {
  return (
    <div className="mp-scroll">
      <div className="mp-order-head">
        <ArrowLeft size={9} />
        <b>Dangote Cement</b>
        <span style={{ marginLeft: 'auto', fontSize: 6, color: '#5F6A7E', fontWeight: 700 }}>DANGCEM</span>
      </div>
      <div className="mp-order-price">
        <b>₦635.00</b>
        <span>↗ 1.24%</span>
      </div>
      <div style={{ fontSize: 6, color: '#5F6A7E', fontWeight: 600 }}>
        NGX · Prices delayed at least 15 min
      </div>
      <div className="mp-order-chart">
        <Sparkline data={[22, 24, 23, 26, 25, 28, 27, 30, 29, 32, 31, 34]} width={230} height={78} stroke="#1D52CE" showDot />
      </div>
      <div className="mp-seg">
        <div className="active">Buy</div>
        <div>Sell</div>
      </div>
      <div className="mp-order-field">
        <small>UNITS</small>
        <div className="inp">
          20 <span>≈ ₦12,700.00</span>
        </div>
      </div>
      <div className="mp-order-field">
        <small>ORDER TYPE</small>
        <div className="inp">
          Market order <ChevronRight size={8} style={{ transform: 'rotate(90deg)', color: '#5F6A7E' }} />
        </div>
      </div>
      <div className="mp-order-total">
        <span>Estimated total</span>
        <span>₦12,723.75</span>
      </div>
      <div className="mp-cta">Review order</div>
      <p className="mp-fine">
        Share prices can fall as well as rise. Apex is a design demo; orders are
        routed through a licensed broker in a live product.
      </p>
    </div>
  );
}

function ProfileScreen() {
  return (
    <>
      <div className="mp-scroll">
        <div className="mp-profile-head">
          <div className="avatar">AO</div>
          <div>
            <b>Ada Okafor</b>
            <small>{user.phone}</small>
            <div className="mp-verified">
              <ShieldCheck size={6} /> Level 2 · Verified
            </div>
          </div>
        </div>
        <div className="mp-profile-group">
          <div className="mp-profile-row">
            <div className="picon">
              <User size={10} />
            </div>
            <span>Account details</span>
            <ChevronRight size={9} className="chev" />
          </div>
          <div className="mp-profile-row">
            <div className="picon">
              <ShieldCheck size={10} />
            </div>
            <span>Security settings</span>
            <ChevronRight size={9} className="chev" />
          </div>
        </div>
        <div className="mp-profile-group">
          <div className="mp-profile-row">
            <div className="picon green">
              <FileTextIcon />
            </div>
            <span>Account statements</span>
            <ChevronRight size={9} className="chev" />
          </div>
          <div className="mp-profile-row">
            <div className="picon purple">
              <Lock size={10} />
            </div>
            <span>Manage transaction PIN</span>
            <ChevronRight size={9} className="chev" />
          </div>
          <div className="mp-profile-row">
            <div className="picon orange">
              <Bell size={10} />
            </div>
            <span>Push & email notifications</span>
            <ChevronRight size={9} className="chev" />
          </div>
          <div className="mp-profile-row">
            <div className="picon">
              <Moon size={10} />
            </div>
            <span>Dark mode</span>
            <ChevronRight size={9} className="chev" />
          </div>
        </div>
        <div className="mp-profile-group">
          <div className="mp-profile-row">
            <div className="picon">
              <MessageCircle size={10} />
            </div>
            <span>Help & support</span>
            <ChevronRight size={9} className="chev" />
          </div>
          <div className="mp-profile-row">
            <div className="picon purple">
              <Fingerprint size={10} />
            </div>
            <span>Biometric login</span>
            <ChevronRight size={9} className="chev" />
          </div>
          <div className="mp-profile-row" style={{ color: '#D92D20' }}>
            <div className="picon orange">
              <LogOut size={10} />
            </div>
            <span>Log out</span>
          </div>
        </div>
      </div>
      <Nav active="profile" />
    </>
  );
}

function FileTextIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
    </svg>
  );
}

function OnboardingScreen() {
  return (
    <div className="mp-onboard">
      <img src="./assets/editorial-cream.webp" alt="" />
      <div className="mp-onboard-content">
        <div className="brand">
          <ApexMark size={20} /> Apex Finance
        </div>
        <h3>
          Your money,
          <br />
          moving forward.
        </h3>
        <p>Save steadily, access funds and own a piece of great companies — from one simple app.</p>
        <div className="trust">
          <div>
            <ShieldCheck size={7} /> Identity-protected accounts
          </div>
          <div>
            <Lock size={7} /> Clearly disclosed fees & limits
          </div>
        </div>
        <div className="cta-row">
          <div>Create free account</div>
          <div className="ghost">Sign in</div>
        </div>
      </div>
    </div>
  );
}

export function MiniPhone({ variant }: { variant: Variant }) {
  const showNav = variant === 'home' || variant === 'save' || variant === 'profile' || variant === 'invest';
  return (
    <div className="mini-phone">
      <div className="mp-frame">
        <div className="mp-screen">
          <StatusBar dark={variant === 'onboarding'} />
          <div className="mp-body">
            {variant === 'home' && (
              <div className="mp-scroll">
                <HomeScreen />
              </div>
            )}
            {variant === 'save' && (
              <div className="mp-scroll" style={{ padding: '0 14px 12px' }}>
                <SaveHeader />
              </div>
            )}
            {variant === 'invest' && <InvestScreen />}
            {variant === 'order' && <OrderScreen />}
            {variant === 'profile' && <ProfileScreen />}
            {variant === 'onboarding' && <OnboardingScreen />}
          </div>
          {showNav && (
            <>
              {variant === 'home' && <Nav active="home" />}
              {variant === 'invest' && <InvestNav />}
              {variant === 'save' && <Nav active="save" />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SaveHeader() {
  return (
    <>
      <div className="mp-green-head">
        <div className="back">
          <ArrowLeft size={8} /> Savings
        </div>
        <h3>Grow your money</h3>
        <p>Secure savings plans, built around your life.</p>
      </div>
      <div style={{ padding: '0 14px' }}>
        <div className="mp-savings-balance">
          <div className="t">
            Total savings balance <Eye size={8} />
          </div>
          <b>₦807,500.00</b>
          <small>↗ ₦1,125 interest earned this month</small>
        </div>
        <div className="mp-tabs">
          <div style={{ background: '#A9CBFF', color: '#002A86' }}>
            <Zap size={12} /> Flexible
          </div>
          <div style={{ background: '#F4CCF9', color: '#5C0865' }}>
            <Lock size={12} /> Fixed
          </div>
          <div style={{ background: '#C3F3C6', color: '#04540A' }}>
            <Target size={12} /> Target
          </div>
        </div>
        <div className="mp-plans-head">
          <span className="active">Active plans</span>
          <span style={{ color: '#5E6A82' }}>+ Create plan</span>
        </div>
        <div className="mp-plan-card">
          <div className="row">
            New Laptop Fund <span>48%</span>
          </div>
          <div className="amt">₦412,500</div>
          <div className="bar">
            <i style={{ width: '48.5%' }} />
          </div>
          <div className="meta">
            <span>of ₦850,000</span>
            <span>Auto-save ₦50k</span>
          </div>
        </div>
        <div className="mp-plan-card">
          <div className="row">
            Rent Reserve <span style={{ color: '#760A81' }}>Fixed</span>
          </div>
          <div className="amt">₦120,000</div>
          <div className="meta">
            <span>16% p.a. · 90 days</span>
            <span>Matures 18 Jan</span>
          </div>
        </div>
      </div>
    </>
  );
}

export function MiniDesktop() {
  return (
    <div className="mini-desktop">
      <div className="md-bar">
        <i />
        <i />
        <i />
      </div>
      <div className="md-app">
        <div className="md-side">
          <div className="brand">
            <ApexMark size={14} /> Apex
          </div>
          <div className="nav">
            <div className="on">
              <Home size={9} /> Overview
            </div>
            <div>
              <Landmark size={9} /> Wallet
            </div>
            <div>
              <Bookmark size={9} /> Savings
            </div>
            <div>
              <TrendingUp size={9} /> Invest
            </div>
            <div>
              <Zap size={9} /> Activity
            </div>
          </div>
        </div>
        <div className="md-main">
          <div className="md-top">
            <b>Good morning, Ada</b>
            <span className="pill pill-green">
              <ShieldCheck size={7} /> KYC verified
            </span>
          </div>
          <div className="md-grid">
            <div className="md-balance">
              <small>Total balance · NGN</small>
              <b>₦1,240,400.00</b>
              <div className="cols">
                <div>
                  <span>Savings</span>
                  <strong>₦807,500</strong>
                </div>
                <div>
                  <span>Investments</span>
                  <strong>₦164,500</strong>
                </div>
                <div>
                  <span>Wallet</span>
                  <strong>₦268,400</strong>
                </div>
              </div>
            </div>
            <div className="md-chart">
              <div className="t">
                Portfolio · 6M <span>+12.4%</span>
              </div>
              <Sparkline data={[12, 14, 13, 16, 15, 18, 17, 20, 19, 22, 24, 23, 27]} width={160} height={62} stroke="#1D52CE" />
            </div>
          </div>
          <div className="md-row">
            <div className="md-table">
              <div className="t">
                Holdings <span style={{ color: '#5F6A7E', fontWeight: 600 }}>₦164,500</span>
              </div>
              {stocks.slice(0, 4).map((s) => (
                <div className="md-tr" key={s.symbol}>
                  <div className="sq" style={{ background: s.tint }}>
                    {s.symbol.slice(0, 2)}
                  </div>
                  <b>{s.name}</b>
                  <span>{ngn(s.price, 0)}</span>
                  <em>{s.change > 0 ? '+' : ''}{s.change.toFixed(2)}%</em>
                </div>
              ))}
            </div>
            <div className="md-table">
              <div className="t">Goals</div>
              <div style={{ marginTop: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 6, fontWeight: 800 }}>
                  New Laptop Fund <span>48%</span>
                </div>
                <div style={{ height: 4, borderRadius: 99, background: '#EDF0F5', marginTop: 4 }}>
                  <div style={{ width: '48%', height: '100%', borderRadius: 99, background: '#06720C' }} />
                </div>
              </div>
              <div style={{ marginTop: 9 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 6, fontWeight: 800 }}>
                  Detty December <span>30%</span>
                </div>
                <div style={{ height: 4, borderRadius: 99, background: '#EDF0F5', marginTop: 4 }}>
                  <div style={{ width: '30%', height: '100%', borderRadius: 99, background: '#06720C' }} />
                </div>
              </div>
              <div style={{ marginTop: 10, fontSize: 5.5, color: '#5F6A7E' }}>
                Total return <b style={{ color: '#0B8A13' }}>+₦73,000</b>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MiniBrowser() {
  return (
    <div className="mini-browser">
      <div className="mb-bar">
        <i />
        <i />
        <i />
        <div className="url">apexfinance.ng</div>
      </div>
      <div className="mb-hero">
        <img src="./assets/hero-spheres.webp" alt="" />
        <div className="mb-hero-content">
          <div className="mb-nav">
            <div className="logo">
              <ApexMark size={11} /> Apex Finance
            </div>
            <div className="links">
              <span>Save</span>
              <span>Invest</span>
              <span>Security</span>
            </div>
            <div className="cta">Get the app</div>
          </div>
          <h3>Save. Access. Invest. Grow.</h3>
          <p>One simple home for your money — built for the way Nigeria earns, saves and invests.</p>
          <div className="row">
            <div>Open account</div>
            <div className="ghost">See how it works</div>
          </div>
        </div>
      </div>
      <div className="mb-strip">
        <span>Licensed partners</span>
        <span>NGX + US equities</span>
        <span>Bank-grade security</span>
      </div>
      <div className="mb-cards">
        <div className="mb-card">
          <b>Flexible savings</b>
          <p>Fund and withdraw on your own schedule.</p>
        </div>
        <div className="mb-card">
          <b>Fixed deposits</b>
          <p>Lock funds for 30–180 days at a clear rate.</p>
        </div>
        <div className="mb-card">
          <b>Target goals</b>
          <p>Automate small deposits toward a date.</p>
        </div>
      </div>
    </div>
  );
}
