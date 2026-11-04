import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react';
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Bell,
  Building2,
  Check,
  ChevronRight,
  CircleAlert,
  Fingerprint,
  LayoutDashboard,
  Landmark,
  LineChart,
  Lock,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Wallet,
  X,
  Zap,
} from 'lucide-react';
import { Avatar, Donut, Logo, Sparkline } from '@shared/ui';
import {
  ngn,
  relativeTime,
  shortDate,
  stocks,
  usd,
} from '@shared/data';
import type { Bank, Plan, PlanKind, Stock, Txn } from '@shared/data';
import { StoreProvider, useStore } from './store';
import './styles.css';

type Page = 'overview' | 'wallet' | 'savings' | 'invest' | 'activity' | 'settings';
type ModalState =
  | { type: 'money'; mode: 'add' | 'withdraw' | 'transfer' }
  | { type: 'new-plan' }
  | { type: 'plan'; planId: string; mode: 'deposit' | 'withdraw' }
  | { type: 'trade'; symbol: string; side: 'buy' | 'sell' }
  | { type: 'receipt'; txn: Txn }
  | { type: 'reset' }
  | null;

const pageCopy: Record<Page, { title: string; sub: string }> = {
  overview: { title: 'Overview', sub: 'Everything you hold, in one view' },
  wallet: { title: 'Wallet', sub: 'Move money in and out' },
  savings: { title: 'Savings', sub: 'Flexible, fixed and target plans' },
  invest: { title: 'Invest', sub: 'Nigerian and US shares' },
  activity: { title: 'Activity', sub: 'Every movement and its receipt' },
  settings: { title: 'Settings', sub: 'Profile, security and demo data' },
};

const nav: { id: Page; label: string; icon: ReactNode }[] = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={17} /> },
  { id: 'wallet', label: 'Wallet', icon: <Wallet size={17} /> },
  { id: 'savings', label: 'Savings', icon: <Target size={17} /> },
  { id: 'invest', label: 'Invest', icon: <LineChart size={17} /> },
  { id: 'activity', label: 'Activity', icon: <ArrowLeftRight size={17} /> },
  { id: 'settings', label: 'Settings', icon: <Settings size={17} /> },
];

const planIcon = (icon: string) =>
  icon === 'lock' ? <Lock size={12} /> : icon === 'target' ? <Target size={12} /> : <Zap size={12} />;

const price = (s: Stock) => (s.currency === 'USD' ? usd(s.price) : ngn(s.price, 2));

const txnIcon = (type: Txn['type']) => {
  const map: Record<Txn['type'], ReactNode> = {
    deposit: <ArrowDownLeft size={14} />,
    withdrawal: <ArrowUpRight size={14} />,
    transfer: <Send size={14} />,
    savings: <Target size={14} />,
    invest: <LineChart size={14} />,
    interest: <Sparkles size={14} />,
  };
  return map[type];
};

const txnTint = (type: Txn['type']) => {
  const map: Record<Txn['type'], string> = {
    deposit: '#C3F3C6',
    withdrawal: '#FFDCCE',
    transfer: '#DCE9FF',
    savings: '#F4CCF9',
    invest: '#CCF4F9',
    interest: '#FFF0C2',
  };
  return map[type];
};

function StatusPill({ status }: { status: Txn['status'] }) {
  return (
    <span className={`status ${status === 'Completed' ? 'ok' : status === 'Pending' ? 'pending' : 'failed'}`}>
      <i /> {status}
    </span>
  );
}

const amountTone = (t: Txn) => (t.status === 'Failed' ? 'amount-void' : t.amount >= 0 ? 'amount-in' : 'amount-out');

const rowProps = (onClick: () => void) => ({
  className: 'clickable',
  tabIndex: 0,
  onClick,
  onKeyDown: (e: ReactKeyboardEvent<HTMLTableRowElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  },
});

function ModalShell({
  title,
  sub,
  onClose,
  children,
  wide,
}: {
  title: string;
  sub?: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const node = ref.current;
    node?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeRef.current();
        return;
      }
      if (e.key !== 'Tab' || !node) return;
      const focusables = node.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      prev?.focus?.();
    };
  }, []);

  return (
    <div className="overlay" onMouseDown={onClose} role="presentation">
      <div
        ref={ref}
        tabIndex={-1}
        className={`modal${wide ? ' wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <div>
            <h2>{title}</h2>
            {sub && <p>{sub}</p>}
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close dialog">
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function AmountField({
  value,
  onChange,
  currency = '₦',
}: {
  value: string;
  onChange: (v: string) => void;
  currency?: string;
}) {
  return (
    <div className="money-input">
      <span>{currency}</span>
      <input
        inputMode="decimal"
        value={value}
        onChange={(e) => {
          const digits = e.target.value.replace(/[^\d.]/g, '');
          const [head, ...rest] = digits.split('.');
          onChange(rest.length ? `${head}.${rest.join('')}` : head);
        }}
        placeholder="0"
        aria-label="Amount"
      />
    </div>
  );
}

function QuickAmounts({ onPick }: { onPick: (v: string) => void }) {
  return (
    <div className="quick-amounts">
      {[5000, 10000, 25000, 50000].map((v) => (
        <button key={v} type="button" onClick={() => onPick(String(v))}>
          ₦{v.toLocaleString('en-NG')}
        </button>
      ))}
    </div>
  );
}

function ErrorLine({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="modal-error" role="alert">
      <CircleAlert size={13} style={{ flexShrink: 0, marginTop: 1 }} /> {message}
    </div>
  );
}

/* ---------------- money modal ---------------- */

function MoneyModal({ mode, onClose }: { mode: 'add' | 'withdraw' | 'transfer'; onClose: () => void }) {
  const store = useStore();
  const [amount, setAmount] = useState('');
  const [bankId, setBankId] = useState(store.banks[0].id);
  const [recipient, setRecipient] = useState('Chinedu Okafor');
  const [tag, setTag] = useState('@chinedu');
  const [error, setError] = useState<string | null>(null);

  const value = Number(amount || 0);
  const bank = store.banks.find((b) => b.id === bankId) ?? store.banks[0];

  const copy = {
    add: { title: 'Add money', sub: 'Fund your wallet from a linked Nigerian bank. Demo funds settle instantly.' },
    withdraw: { title: 'Withdraw to bank', sub: 'The amount you enter is the amount that leaves your wallet.' },
    transfer: { title: 'Send money', sub: 'Instant Apex-to-Apex transfer. No fee in this demo.' },
  }[mode];

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const result =
      mode === 'add'
        ? store.addMoney(value, bank.name)
        : mode === 'withdraw'
          ? store.withdraw(value, bank.name)
          : store.transfer(value, `${recipient}${tag ? ` (${tag})` : ''}`);
    if (!result.ok) {
      setError(result.error ?? 'Something went wrong.');
      return;
    }
    onClose();
  };

  return (
    <ModalShell title={copy.title} sub={copy.sub} onClose={onClose}>
      <form onSubmit={submit}>
        <AmountField value={amount} onChange={setAmount} />
        <QuickAmounts onPick={setAmount} />
        {mode === 'transfer' ? (
          <>
            <div className="field">
              <label className="field-label" htmlFor="recipient">
                Recipient name
              </label>
              <input
                id="recipient"
                className="input"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="e.g. Chinedu Okafor"
              />
            </div>
            <div className="field">
              <label className="field-label" htmlFor="tag">
                Apex tag
              </label>
              <input id="tag" className="input" value={tag} onChange={(e) => setTag(e.target.value)} placeholder="@tag" />
            </div>
          </>
        ) : (
          <div className="field">
            <label className="field-label" htmlFor="bank">
              {mode === 'add' ? 'Fund from' : 'Withdraw to'}
            </label>
            <select id="bank" className="input" value={bankId} onChange={(e) => setBankId(e.target.value)}>
              {store.banks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} · {b.account}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="preview">
          <div className="preview-row">
            <span>Fee</span>
            <b>₦0.00</b>
          </div>
          <div className="preview-row">
            <span>Wallet balance after</span>
            <b>{ngn(mode === 'add' ? store.walletNgn + value : store.walletNgn - value)}</b>
          </div>
          <div className="preview-row total">
            <span>{mode === 'add' ? 'You add' : mode === 'withdraw' ? 'You receive' : 'You send'}</span>
            <b>{ngn(value)}</b>
          </div>
        </div>
        <ErrorLine message={error} />
        <button type="submit" className="btn btn-primary btn-block">
          {mode === 'add' ? 'Add money' : mode === 'withdraw' ? 'Confirm withdrawal' : 'Send money'}
          <ArrowRight size={15} />
        </button>
        <p style={{ fontSize: 9.5, color: 'var(--ink-400)', marginTop: 10, textAlign: 'center' }}>
          Demo only. No real funds move.
        </p>
      </form>
    </ModalShell>
  );
}

/* ---------------- plan modals ---------------- */

function NewPlanModal({ onClose }: { onClose: () => void }) {
  const store = useStore();
  const [name, setName] = useState('');
  const [kind, setKind] = useState<PlanKind>('flexible');
  const [initial, setInitial] = useState('10000');
  const [target, setTarget] = useState('100000');
  const [monthly, setMonthly] = useState('10000');
  const [error, setError] = useState<string | null>(null);

  const rate = kind === 'fixed' ? 16 : kind === 'target' ? 14 : 12;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const result = store.createPlan({
      name: name.trim(),
      kind,
      initial: Number(initial || 0),
      target: kind === 'target' ? Number(target || 0) : undefined,
      monthly: kind === 'target' ? Number(monthly || 0) : undefined,
    });
    if (!result.ok) {
      setError(result.error ?? 'Could not open the plan.');
      return;
    }
    onClose();
  };

  return (
    <ModalShell title="Create a savings plan" sub="The rate and early-access rule are fixed when you open the plan." onClose={onClose}>
      <form onSubmit={submit}>
        <div className="type-picker" role="radiogroup" aria-label="Plan type">
          {(['flexible', 'fixed', 'target'] as PlanKind[]).map((k) => (
            <button
              type="button"
              key={k}
              role="radio"
              aria-checked={kind === k}
              className={kind === k ? 'on' : ''}
              onClick={() => setKind(k)}
            >
              {k === 'flexible' ? <Zap size={16} /> : k === 'fixed' ? <Lock size={16} /> : <Target size={16} />}
              {k === 'flexible' ? 'Flexible' : k === 'fixed' ? 'Fixed' : 'Target'}
            </button>
          ))}
        </div>
        <div className="field">
          <label className="field-label" htmlFor="plan-name">
            Plan name
          </label>
          <input
            id="plan-name"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={kind === 'fixed' ? 'e.g. Rent Reserve' : kind === 'target' ? 'e.g. New Laptop Fund' : 'e.g. Everyday Fund'}
          />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="plan-initial">
            Starting amount
          </label>
          <input
            id="plan-initial"
            className="input"
            inputMode="numeric"
            value={initial}
            onChange={(e) => setInitial(e.target.value.replace(/[^\d]/g, ''))}
          />
        </div>
        {kind === 'target' && (
          <>
            <div className="field">
              <label className="field-label" htmlFor="plan-target">
                Target amount
              </label>
              <input
                id="plan-target"
                className="input"
                inputMode="numeric"
                value={target}
                onChange={(e) => setTarget(e.target.value.replace(/[^\d]/g, ''))}
              />
            </div>
            <div className="field">
              <label className="field-label" htmlFor="plan-monthly">
                Monthly auto-save
              </label>
              <input
                id="plan-monthly"
                className="input"
                inputMode="numeric"
                value={monthly}
                onChange={(e) => setMonthly(e.target.value.replace(/[^\d]/g, ''))}
              />
            </div>
          </>
        )}
        <div className="preview">
          <div className="preview-row">
            <span>Illustrative rate</span>
            <b>{rate}% p.a.</b>
          </div>
          <div className="preview-row">
            <span>{kind === 'fixed' ? 'Tenor' : kind === 'target' ? 'Progress after opening' : 'Access'}</span>
            <b>
              {kind === 'fixed'
                ? '90 days'
                : kind === 'target'
                  ? `${Math.min(100, Math.round((Number(initial || 0) / Math.max(1, Number(target || 1))) * 100))}%`
                  : 'Withdraw anytime'}
            </b>
          </div>
          <div className="preview-row">
            <span>Wallet after opening</span>
            <b>{ngn(store.walletNgn - Number(initial || 0))}</b>
          </div>
        </div>
        <ErrorLine message={error} />
        <button type="submit" className="btn btn-primary btn-block">
          Open plan <ArrowRight size={15} />
        </button>
        <p style={{ fontSize: 9.5, color: 'var(--ink-400)', marginTop: 10, textAlign: 'center' }}>
          Rates are illustrative. Early access on fixed plans may forfeit interest.
        </p>
      </form>
    </ModalShell>
  );
}

function PlanMoneyModal({
  plan,
  mode,
  onClose,
}: {
  plan: Plan;
  mode: 'deposit' | 'withdraw';
  onClose: () => void;
}) {
  const store = useStore();
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const value = Number(amount || 0);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const result =
      mode === 'deposit' ? store.planDeposit(plan.id, value) : store.planWithdraw(plan.id, value);
    if (!result.ok) {
      setError(result.error ?? 'Could not complete this movement.');
      return;
    }
    onClose();
  };

  return (
    <ModalShell
      title={mode === 'deposit' ? `Add to ${plan.name}` : `Withdraw from ${plan.name}`}
      sub={
        mode === 'deposit'
          ? 'Money moves instantly from your wallet into this plan.'
          : plan.kind === 'fixed'
            ? 'Fixed plans are locked until maturity. Early access is not available in this demo.'
            : 'Money moves back to your wallet instantly.'
      }
      onClose={onClose}
    >
      <div className="summary-tile">
        <span>Plan balance</span>
        <b>{ngn(plan.balance)}</b>
        <small>
          {plan.rate}% p.a. · {plan.kind === 'fixed' ? 'fixed' : plan.kind === 'target' ? 'target' : 'flexible'}
        </small>
      </div>
      <form onSubmit={submit}>
        <AmountField value={amount} onChange={setAmount} />
        {mode === 'deposit' && <QuickAmounts onPick={setAmount} />}
        <div className="preview">
          <div className="preview-row">
            <span>Wallet available</span>
            <b>{ngn(store.walletNgn)}</b>
          </div>
          <div className="preview-row total">
            <span>{mode === 'deposit' ? 'Plan after' : 'Wallet after'}</span>
            <b>{ngn(mode === 'deposit' ? plan.balance + value : store.walletNgn + value)}</b>
          </div>
        </div>
        <ErrorLine message={error} />
        <button
          type="submit"
          className="btn btn-primary btn-block"
          disabled={mode === 'withdraw' && plan.kind === 'fixed'}
          style={mode === 'withdraw' && plan.kind === 'fixed' ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
        >
          {mode === 'deposit' ? 'Confirm top-up' : 'Move to wallet'} <ArrowRight size={15} />
        </button>
      </form>
    </ModalShell>
  );
}

/* ---------------- trade modal ---------------- */

function TradeModal({
  symbol,
  initialSide,
  onClose,
}: {
  symbol: string;
  initialSide: 'buy' | 'sell';
  onClose: () => void;
}) {
  const store = useStore();
  const stock = stocks.find((s) => s.symbol === symbol)!;
  const [side, setSide] = useState(initialSide);
  const [units, setUnits] = useState('10');
  const [error, setError] = useState<string | null>(null);
  const holding = store.holdings.find((h) => h.symbol === symbol);
  const unitCount = Number(units || 0);
  const gross = unitCount * stock.price;
  const fee = gross * 0.015;
  const total = gross + fee;
  const cur = stock.currency === 'USD' ? '$' : '₦';
  const fmt = (v: number) =>
    stock.currency === 'USD' ? usd(v) : ngn(v, 2);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const result = store.trade(symbol, unitCount, side);
    if (!result.ok) {
      setError(result.error ?? 'Order could not be placed.');
      return;
    }
    onClose();
  };

  return (
    <ModalShell
      title={`${side === 'buy' ? 'Buy' : 'Sell'} ${stock.symbol}`}
      sub={`${stock.name} · ${stock.exchange} · delayed price`}
      onClose={onClose}
      wide
    >
      <div className="seg-wide" role="group" aria-label="Order side">
        <button type="button" aria-pressed={side === 'buy'} className={side === 'buy' ? 'on' : ''} onClick={() => setSide('buy')}>
          Buy
        </button>
        <button type="button" aria-pressed={side === 'sell'} className={side === 'sell' ? 'on' : ''} onClick={() => setSide('sell')}>
          Sell
        </button>
      </div>
      <div className="summary-tile">
        <span>Market price · delayed 15 min</span>
        <b>{price(stock)}</b>
        <small>
          {stock.change >= 0 ? '+' : ''}
          {stock.change}% today · {stock.sector}
        </small>
      </div>
      <form onSubmit={submit}>
        <div className="field">
          <label className="field-label" htmlFor="units">
            Units
          </label>
          <input
            id="units"
            className="input"
            inputMode="numeric"
            value={units}
            onChange={(e) => setUnits(e.target.value.replace(/[^\d]/g, ''))}
          />
        </div>
        <div className="preview">
          <div className="preview-row">
            <span>Gross value</span>
            <b>{fmt(gross)}</b>
          </div>
          <div className="preview-row">
            <span>Brokerage fee (1.5% demo)</span>
            <b>{fmt(fee)}</b>
          </div>
          <div className="preview-row">
            <span>{side === 'buy' ? `Available ${cur === '₦' ? 'naira' : 'USD'} wallet` : 'You hold'}</span>
            <b>
              {side === 'buy'
                ? fmt(stock.currency === 'USD' ? store.walletUsd : store.walletNgn)
                : `${holding?.units ?? 0} units`}
            </b>
          </div>
          <div className="preview-row total">
            <span>{side === 'buy' ? 'Estimated total' : 'Estimated proceeds'}</span>
            <b>{fmt(side === 'buy' ? total : gross - fee)}</b>
          </div>
        </div>
        <ErrorLine message={error} />
        <button type="submit" className="btn btn-primary btn-block">
          {side === 'buy' ? `Buy ${unitCount || 0} units` : `Sell ${unitCount || 0} units`}
          <ArrowRight size={15} />
        </button>
        <p style={{ fontSize: 9.5, color: 'var(--ink-400)', marginTop: 10, textAlign: 'center' }}>
          Shares can fall as well as rise. This is a demo order; no broker is connected.
        </p>
      </form>
    </ModalShell>
  );
}

/* ---------------- receipt ---------------- */

function ReceiptModal({ txn, onClose }: { txn: Txn; onClose: () => void }) {
  const store = useStore();
  const positive = txn.amount >= 0 && txn.status !== 'Failed';
  return (
    <ModalShell title="Transaction receipt" sub="Keep this reference for support." onClose={onClose}>
      <div className="receipt">
        <div className="receipt-head">
          <Avatar initials="AO" size={40} ring tint="#FFDCCE" />
          <b style={{ color: positive ? 'var(--green-700)' : txn.status === 'Failed' ? 'var(--ink-500)' : 'var(--ink-900)' }}>
            {txn.status === 'Failed' ? '' : positive ? '+' : '−'}
            {ngn(Math.abs(txn.amount))}
          </b>
          <span>{txn.title}</span>
        </div>
        <div className="receipt-rows">
          <div className="receipt-row">
            <span>Status</span>
            <b>
              <StatusPill status={txn.status} />
            </b>
          </div>
          <div className="receipt-row">
            <span>Description</span>
            <b>{txn.meta}</b>
          </div>
          <div className="receipt-row">
            <span>Date</span>
            <b>
              {new Date(txn.date).toLocaleString('en-NG', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </b>
          </div>
          <div className="receipt-row">
            <span>Reference</span>
            <b>{txn.ref}</b>
          </div>
        </div>
      </div>
      <button
        type="button"
        className="btn btn-ghost btn-block"
        style={{ marginTop: 14 }}
        onClick={() => {
          navigator.clipboard?.writeText(txn.ref).then(
            () => store.notify('Reference copied'),
            () => store.notify(txn.ref),
          );
        }}
      >
        Copy reference
      </button>
    </ModalShell>
  );
}

/* ---------------- overview ---------------- */

function Overview({
  open,
  go,
}: {
  open: (m: ModalState) => void;
  go: (p: Page) => void;
}) {
  const s = useStore();
  const ngxGain = s.holdings.reduce((sum, h) => {
    const stock = stocks.find((x) => x.symbol === h.symbol);
    if (!stock || stock.currency !== 'NGN') return sum;
    return sum + (stock.price - h.avgCost) * h.units;
  }, 0);
  const chart = [22, 26, 24, 30, 28, 34, 33, 39, 36, 44, 42, 48, 50, 56, 54, 61, 60, 68];
  const line = chart
    .map((v, i) => `${i === 0 ? 'M' : 'L'}${(i / (chart.length - 1)) * 340} ${104 - (v / 72) * 96}`)
    .join(' ');

  return (
    <div className="page page-enter">
      <div className="ov-hero">
        <div>
          <span className="ov-hero-label">
            <Sparkles size={13} /> Total balance · demo account
          </span>
          <h2>{ngn(s.total)}</h2>
          <div className="ov-hero-sub">
            <div>
              <span>Wallet</span>
              <b>{ngn(s.walletNgn)}</b>
            </div>
            <div>
              <span>Savings</span>
              <b>{ngn(s.savings)}</b>
            </div>
            <div>
              <span>Investments</span>
              <b>{ngn(s.investmentsNgn)}</b>
            </div>
            <div>
              <span>US portfolio · USD</span>
              <b>{usd(s.investmentsUsd)}</b>
            </div>
          </div>
          <div className="ov-hero-actions">
            <button type="button" className="btn btn-white btn-sm" onClick={() => open({ type: 'money', mode: 'add' })}>
              <Plus size={14} /> Add money
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => open({ type: 'money', mode: 'transfer' })}
            >
              <Send size={14} /> Send money
            </button>
          </div>
        </div>
        <div className="ov-chart">
          <div className="ov-chart-head">
            <span>Combined balance</span>
            <b>+4.8% · 90 days</b>
          </div>
          <svg viewBox="0 0 340 104" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <linearGradient id="ovline" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#fff" stopOpacity=".26" />
                <stop offset="1" stopColor="#fff" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={`${line} L340 104 L0 104 Z`} fill="url(#ovline)" />
            <path d={line} fill="none" stroke="rgba(255,255,255,.9)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi">
          <div className="kpi-top">
            <span>Wallet available</span>
            <i style={{ background: '#EEF4FF', color: '#1D52CE' }}>
              <Wallet size={15} />
            </i>
          </div>
          <b>{ngn(s.walletNgn)}</b>
          <small>
            {usd(s.walletUsd)} USD wallet · <em>ready to use</em>
          </small>
        </div>
        <div className="kpi">
          <div className="kpi-top">
            <span>Total savings</span>
            <i style={{ background: '#F4F0FF', color: '#760A81' }}>
              <Target size={15} />
            </i>
          </div>
          <b>{ngn(s.savings)}</b>
          <small>{s.plans.length} active plans · {s.plans.filter((p) => p.kind === 'fixed').length} fixed</small>
        </div>
        <div className="kpi">
          <div className="kpi-top">
            <span>NGX portfolio</span>
            <i style={{ background: '#EBFAEC', color: '#06720C' }}>
              <LineChart size={15} />
            </i>
          </div>
          <b>{ngn(s.investmentsNgn)}</b>
          <small>
            Total return <em>{ngxGain >= 0 ? '+' : '−'}{ngn(Math.abs(ngxGain))}</em>
          </small>
        </div>
        <div className="kpi">
          <div className="kpi-top">
            <span>US portfolio</span>
            <i style={{ background: '#EAF8FB', color: '#0e7490' }}>
              <TrendingUp size={15} />
            </i>
          </div>
          <b>{usd(s.investmentsUsd)}</b>
          <small>{s.holdings.filter((h) => ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN'].includes(h.symbol)).length} US holdings</small>
        </div>
      </div>

      <div className="grid-2">
        <div className="panel">
          <div className="panel-head">
            <div>
              <h2>Your holdings</h2>
              <p>Valued at delayed market prices</p>
            </div>
            <button type="button" className="panel-link" onClick={() => go('invest')}>
              Open invest <ChevronRight size={12} />
            </button>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Company</th>
                <th className="num">Units</th>
                <th className="num">Price</th>
                <th className="num">Value</th>
                <th className="num">Today</th>
              </tr>
            </thead>
            <tbody>
              {s.holdings.slice(0, 5).map((h) => {
                const stock = stocks.find((x) => x.symbol === h.symbol)!;
                return (
                <tr key={h.symbol} {...rowProps(() => open({ type: 'trade', symbol: h.symbol, side: 'buy' }))}>
                    <td>
                      <div className="cell-main">
                        <span className="asset-mark" style={{ background: stock.tint }}>
                          {h.symbol.slice(0, 2)}
                        </span>
                        <div>
                          <b>{stock.name}</b>
                          <span>
                            {h.symbol} · {stock.exchange}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="num">{h.units}</td>
                    <td className="num">{price(stock)}</td>
                    <td className="num">
                      {stock.currency === 'USD' ? usd(h.units * stock.price) : ngn(h.units * stock.price, 2)}
                    </td>
                    <td className={`num ${h.change >= 0 ? 'trend-up' : 'trend-down'}`}>
                      {h.change >= 0 ? '+' : ''}
                      {h.change}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="panel">
          <div className="panel-head">
            <div>
              <h2>Savings goals</h2>
              <p>Progress against each plan</p>
            </div>
            <button type="button" className="panel-link" onClick={() => go('savings')}>
              All plans <ChevronRight size={12} />
            </button>
          </div>
          {s.plans.slice(0, 4).map((p) => {
            const progress = p.target ? Math.round((p.balance / p.target) * 100) : 100;
            return (
              <div className="goal-row" key={p.id}>
                <div className="goal-top">
                  <i style={{ background: p.pastel, color: p.color }}>{planIcon(p.icon)}</i>
                  {p.name}
                  <span>{p.rate}% p.a.</span>
                </div>
                <div className="goal-bar">
                  <i style={{ width: `${Math.min(100, progress)}%`, background: p.color }} />
                </div>
                <div className="goal-meta">
                  <span>{ngn(p.balance)}</span>
                  <span>{p.target ? `${progress}% of ${ngn(p.target)}` : p.kind === 'fixed' ? 'Locked to maturity' : 'Flexible'}</span>
                </div>
              </div>
            );
          })}
          <button
            type="button"
            className="btn btn-soft btn-sm btn-block"
            style={{ marginTop: 12 }}
            onClick={() => open({ type: 'new-plan' })}
          >
            <Plus size={13} /> Create a plan
          </button>
        </div>
      </div>

      <div className="grid-2">
        <div className="panel">
          <div className="panel-head">
            <div>
              <h2>Recent activity</h2>
              <p>Wallet, savings and invest in one ledger</p>
            </div>
            <button type="button" className="panel-link" onClick={() => go('activity')}>
              View all <ChevronRight size={12} />
            </button>
          </div>
          <table className="table">
            <tbody>
              {s.txns.slice(0, 5).map((t) => (
                <tr key={t.id} {...rowProps(() => open({ type: 'receipt', txn: t }))}>
                  <td>
                    <div className="cell-main">
                      <span className="asset-mark" style={{ background: txnTint(t.type), color: '#21304f' }}>
                        {txnIcon(t.type)}
                      </span>
                      <div>
                        <b>{t.title}</b>
                        <span>{shortDate(t.date)} · {t.ref}</span>
                      </div>
                    </div>
                  </td>
                  <td style={{ width: 110 }}>
                    <StatusPill status={t.status} />
                  </td>
                  <td className={`num ${amountTone(t)}`}>
                    {t.amount >= 0 ? '+' : '−'}
                    {ngn(Math.abs(t.amount))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="panel">
          <div className="panel-head">
            <div>
              <h2>Market movers</h2>
              <p>Delayed at least 15 minutes</p>
            </div>
            <button type="button" className="panel-link" onClick={() => go('invest')}>
              Trade <ChevronRight size={12} />
            </button>
          </div>
          {stocks.slice(0, 5).map((stock) => (
            <div className="goal-row" key={stock.symbol} style={{ gridTemplateColumns: '1fr auto' }}>
              <div className="goal-top">
                <i style={{ background: stock.tint, fontSize: 8, fontWeight: 800 }}>{stock.symbol.slice(0, 2)}</i>
                {stock.name}
                <span>{stock.exchange}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Sparkline
                  data={stock.spark}
                  width={44}
                  height={18}
                  fill={false}
                  stroke={stock.change >= 0 ? '#12B76A' : '#d92d20'}
                  strokeWidth={1.5}
                />
                <div style={{ textAlign: 'right', fontSize: 11, fontWeight: 800 }}>
                  {price(stock)}
                  <div
                    className={stock.change >= 0 ? 'trend-up' : 'trend-down'}
                    style={{ fontSize: 9 }}
                  >
                    {stock.change >= 0 ? '+' : ''}
                    {stock.change}%
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------- wallet ---------------- */

function WalletPage({ open }: { open: (m: ModalState) => void }) {
  const s = useStore();
  const walletTxns = s.txns.filter((t) => ['deposit', 'withdrawal', 'transfer'].includes(t.type));
  return (
    <div className="page page-enter">
      <div className="wallet-hero">
        <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div
            style={{
              padding: 26,
              color: '#fff',
              background:
                'radial-gradient(400px 220px at 90% 0%, rgba(126,170,255,.5), transparent 65%), linear-gradient(135deg, #1d52ce, #002f9e)',
            }}
          >
            <span className="ov-hero-label">
              <Wallet size={13} /> Naira wallet
            </span>
            <h2 style={{ marginTop: 8, fontSize: 38, letterSpacing: '-0.05em' }}>{ngn(s.walletNgn)}</h2>
            <p style={{ marginTop: 4, fontSize: 11, color: 'rgba(255,255,255,.55)' }}>
              Available now · demo balance, no real funds
            </p>
            <div style={{ display: 'flex', gap: 8, marginTop: 20, flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-white btn-sm" onClick={() => open({ type: 'money', mode: 'add' })}>
                <Plus size={14} /> Add money
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => open({ type: 'money', mode: 'withdraw' })}
              >
                <ArrowUpRight size={14} /> Withdraw
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => open({ type: 'money', mode: 'transfer' })}
              >
                <Send size={14} /> Send
              </button>
            </div>
          </div>
          <div style={{ padding: 18 }}>
            <div className="action-row">
              {[
                { label: 'Add money', icon: <Plus size={14} />, mode: 'add' as const },
                { label: 'Withdraw', icon: <ArrowUpRight size={14} />, mode: 'withdraw' as const },
                { label: 'Send money', icon: <Send size={14} />, mode: 'transfer' as const },
              ].map((a) => (
                <button
                  type="button"
                  className="action-tile"
                  key={a.label}
                  onClick={() => open({ type: 'money', mode: a.mode })}
                >
                  <i>{a.icon}</i>
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 14 }}>
          <div className="panel">
            <div className="panel-head">
              <div>
                <h2>USD wallet</h2>
                <p>For US share orders</p>
              </div>
              <span className="pill pill-blue">USD</span>
            </div>
            <b style={{ fontFamily: 'var(--font-display)', fontSize: 27, letterSpacing: '-0.045em' }}>
              {usd(s.walletUsd)}
            </b>
            <p style={{ fontSize: 10, color: 'var(--ink-500)', marginTop: 4, fontWeight: 600 }}>
              Demo FX rate ₦1,600 / $1. Conversion is quoted before any order.
            </p>
          </div>
          <div className="panel">
            <div className="panel-head">
              <div>
                <h2>Linked banks</h2>
                <p>Demo accounts for funding and withdrawals</p>
              </div>
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              {s.banks.map((b: Bank) => (
                <div
                  key={b.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 9,
                    padding: '9px 0',
                    borderTop: '1px solid #f2f4f8',
                  }}
                >
                  <span className="asset-mark" style={{ background: '#F3F7FF', color: '#0034A8' }}>
                    <Landmark size={14} />
                  </span>
                  <div>
                    <b style={{ fontSize: 11 }}>{b.name}</b>
                    <div style={{ fontSize: 9.5, color: 'var(--ink-500)', fontWeight: 600 }}>{b.account}</div>
                  </div>
                  {b.primary && <em className="pill pill-green" style={{ marginLeft: 'auto' }}>Primary</em>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <div>
            <h2>Wallet activity</h2>
            <p>Funding, withdrawals and transfers</p>
          </div>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Status</th>
              <th>Date</th>
              <th className="num">Amount</th>
            </tr>
          </thead>
          <tbody>
            {walletTxns.slice(0, 8).map((t) => (
              <tr key={t.id} {...rowProps(() => open({ type: 'receipt', txn: t }))}>
                <td>
                  <div className="cell-main">
                    <span className="asset-mark" style={{ background: txnTint(t.type) }}>
                      {txnIcon(t.type)}
                    </span>
                    <div>
                      <b>{t.title}</b>
                      <span>{t.meta}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <StatusPill status={t.status} />
                </td>
                <td style={{ color: 'var(--ink-500)', fontSize: 10.5 }}>{shortDate(t.date)}</td>
                <td className={`num ${t.amount >= 0 ? 'amount-in' : 'amount-out'}`}>
                  {t.amount >= 0 ? '+' : '−'}
                  {ngn(Math.abs(t.amount))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------- savings ---------------- */

function SavingsPage({ open }: { open: (m: ModalState) => void }) {
  const s = useStore();
  const [tab, setTab] = useState<'all' | PlanKind>('all');
  const filtered = tab === 'all' ? s.plans : s.plans.filter((p) => p.kind === tab);
  const projected = s.plans.reduce((sum, p) => sum + (p.balance * p.rate) / 100, 0);

  return (
    <div className="page page-enter">
      <div className="kpi-grid">
        <div className="kpi">
          <div className="kpi-top">
            <span>Total saved</span>
            <i style={{ background: '#EEF4FF', color: '#1D52CE' }}>
              <Target size={15} />
            </i>
          </div>
          <b>{ngn(s.savings)}</b>
          <small>Across {s.plans.length} plans</small>
        </div>
        <div className="kpi">
          <div className="kpi-top">
            <span>Projected interest</span>
            <i style={{ background: '#F4F0FF', color: '#760A81' }}>
              <TrendingUp size={15} />
            </i>
          </div>
          <b>{ngn(projected)}</b>
          <small>Annualised, illustrative</small>
        </div>
        <div className="kpi">
          <div className="kpi-top">
            <span>Auto-save monthly</span>
            <i style={{ background: '#EBFAEC', color: '#06720C' }}>
              <RefreshCw size={15} />
            </i>
          </div>
          <b>{ngn(s.plans.reduce((sum, p) => sum + (p.monthly ?? 0), 0))}</b>
          <small>{s.plans.filter((p) => p.monthly).length} target plans</small>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <div>
            <h2>Savings plans</h2>
            <p>Three behaviours: flexible access, fixed rate, or a visible target</p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="seg" role="group" aria-label="Filter plans">
              {(['all', 'flexible', 'fixed', 'target'] as const).map((t) => (
                <button
                  type="button"
                  key={t}
                  aria-pressed={tab === t}
                  className={tab === t ? 'on' : ''}
                  onClick={() => setTab(t)}
                >
                  {t === 'all' ? 'All' : t[0].toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => open({ type: 'new-plan' })}>
              <Plus size={14} /> New plan
            </button>
          </div>
        </div>

        <div className="plan-grid">
          {filtered.map((p) => {
            const progress = p.target ? Math.round((p.balance / p.target) * 100) : 100;
            return (
              <article className="plan-card" key={p.id}>
                <div className="plan-tint" style={{ background: `linear-gradient(160deg, ${p.pastel}, transparent)` }} />
                <div className="plan-body">
                  <div className="plan-top">
                    <span className="plan-kind" style={{ color: p.color }}>
                      {planIcon(p.icon)} {p.kind}
                    </span>
                    <span className="arrow-btn" style={{ color: p.color }}>
                      {p.rate}%
                    </span>
                  </div>
                  <h3>{p.name}</h3>
                  <div className="plan-balance">{ngn(p.balance)}</div>
                  <div className="plan-sub">{p.subtitle}</div>
                  <div className="plan-progress">
                    <i style={{ width: `${Math.min(100, progress)}%`, background: p.color }} />
                  </div>
                  <div className="plan-foot">
                    <span>{p.target ? `${progress}% of ${ngn(p.target)}` : `Opened ${shortDate(p.opened)}`}</span>
                    <span>{p.rate}% p.a.</span>
                  </div>
                  <div className="plan-actions">
                    <button
                      type="button"
                      className="btn btn-soft"
                      onClick={() => open({ type: 'plan', planId: p.id, mode: 'deposit' })}
                    >
                      <Plus size={12} /> Add
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => open({ type: 'plan', planId: p.id, mode: 'withdraw' })}
                    >
                      {p.kind === 'fixed' ? <Lock size={12} /> : <ArrowUpRight size={12} />}
                      {p.kind === 'fixed' ? 'Locked' : 'Withdraw'}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <div className="muted-note" style={{ marginTop: 16 }}>
          <CircleAlert size={14} />
          <span>
            Fixed plans are locked for their tenor. If early access is enabled by the partner, forfeited
            interest is shown before confirmation. Rates here are illustrative for the demo.
          </span>
        </div>
      </div>
    </div>
  );
}

/* ---------------- invest ---------------- */

function InvestPage({ open }: { open: (m: ModalState) => void }) {
  const s = useStore();
  const [market, setMarket] = useState<'all' | 'NGX' | 'NASDAQ'>('all');
  const [query, setQuery] = useState('');
  const list = stocks.filter(
    (st) =>
      (market === 'all' || st.exchange === market) &&
      (st.name.toLowerCase().includes(query.toLowerCase()) ||
        st.symbol.toLowerCase().includes(query.toLowerCase())),
  );
  const ngnHoldings = s.holdings
    .map((h) => ({ h, stock: stocks.find((x) => x.symbol === h.symbol)! }))
    .filter((x) => x.stock && x.stock.currency === 'NGN');
  const segs = ngnHoldings.map(({ h, stock }) => ({
    value: h.units * stock.price,
    color: stock.tint === '#E9EDF2' ? '#A9CBFF' : stock.tint,
  }));
  const ngxCost = s.holdings.reduce((sum, h) => {
    const stock = stocks.find((x) => x.symbol === h.symbol);
    return stock && stock.currency === 'NGN' ? sum + stock.avgCost * h.units : sum;
  }, 0);
  const gainPct = ngxCost ? ((s.investmentsNgn - ngxCost) / ngxCost) * 100 : 0;

  return (
    <div className="page page-enter">
      <div className="kpi-grid">
        <div className="kpi">
          <div className="kpi-top">
            <span>NGX portfolio</span>
            <i style={{ background: '#EBFAEC', color: '#06720C' }}>
              <LineChart size={15} />
            </i>
          </div>
          <b>{ngn(s.investmentsNgn)}</b>
          <small>
            <em>{gainPct >= 0 ? '+' : ''}{gainPct.toFixed(1)}%</em> total return (demo)
          </small>
        </div>
        <div className="kpi">
          <div className="kpi-top">
            <span>US portfolio</span>
            <i style={{ background: '#EAF8FB', color: '#0e7490' }}>
              <TrendingUp size={15} />
            </i>
          </div>
          <b>{usd(s.investmentsUsd)}</b>
          <small>USD wallet {usd(s.walletUsd)}</small>
        </div>
        <div className="kpi">
          <div className="kpi-top">
            <span>Open positions</span>
            <i style={{ background: '#F4F0FF', color: '#760A81' }}>
              <Building2 size={15} />
            </i>
          </div>
          <b>{s.holdings.length}</b>
          <small>Across NGX and NASDAQ</small>
        </div>
      </div>

      <div className="market-layout">
        <div className="panel">
          <div className="panel-head">
            <div>
              <h2>Market</h2>
              <p>Prices delayed at least 15 minutes</p>
            </div>
            <div className="market-tools">
              <div className="seg">
                {(['all', 'NGX', 'NASDAQ'] as const).map((m) => (
                  <button
                    type="button"
                    key={m}
                    className={market === m ? 'on' : ''}
                    onClick={() => setMarket(m)}
                  >
                    {m === 'all' ? 'All' : m}
                  </button>
                ))}
              </div>
              <div className="market-search">
                <Search size={13} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search symbol"
                  aria-label="Search instruments"
                />
              </div>
            </div>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Market</th>
                <th className="num">Price</th>
                <th className="num">Today</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.map((stock) => (
                <tr key={stock.symbol} {...rowProps(() => open({ type: 'trade', symbol: stock.symbol, side: 'buy' }))}>
                  <td>
                    <div className="cell-main">
                      <span className="asset-mark" style={{ background: stock.tint }}>
                        {stock.symbol.slice(0, 2)}
                      </span>
                      <div>
                        <b>{stock.name}</b>
                        <span>{stock.sector}</span>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontSize: 10, color: 'var(--ink-500)', fontWeight: 700 }}>{stock.exchange}</td>
                  <td className="num">{price(stock)}</td>
                  <td className={`num ${stock.change >= 0 ? 'trend-up' : 'trend-down'}`}>
                    {stock.change >= 0 ? '+' : ''}
                    {stock.change}%
                  </td>
                  <td className="num">
                    <span
                      className="btn btn-soft btn-sm"
                      style={{ minHeight: 28, padding: '0 10px', fontSize: 9.5 }}
                    >
                      Trade
                    </span>
                  </td>
                </tr>
              ))}
              {!list.length && (
                <tr>
                  <td colSpan={5}>
                    <div className="empty">
                      <b>No instruments found</b>
                      <p>Try another name or switch market.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="muted-note" style={{ marginTop: 14 }}>
            <CircleAlert size={14} />
            <span>
              Orders would be routed to a SEC-registered broker. Demo orders settle instantly against
              delayed prices and do not reach a real market.
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 14 }}>
          <div className="panel">
            <div className="panel-head">
              <div>
                <h2>Your holdings</h2>
                <p>{s.holdings.length} positions</p>
              </div>
              {ngnHoldings.length > 0 && (
                <Donut segments={segs} size={44} thickness={7} gap={4} />
              )}
            </div>
            {s.holdings.length === 0 && (
              <div className="empty">
                <b>No holdings yet</b>
                <p>Buy your first share from the market table.</p>
              </div>
            )}
            {s.holdings.map((h) => {
              const stock = stocks.find((x) => x.symbol === h.symbol)!;
              const value = h.units * stock.price;
              const gain = (stock.price - h.avgCost) / h.avgCost * 100;
              return (
                <button
                  type="button"
                  className="holding-card"
                  key={h.symbol}
                  style={{ width: '100%', textAlign: 'left' }}
                  onClick={() => open({ type: 'trade', symbol: h.symbol, side: 'sell' })}
                >
                  <div className="holding-top">
                    <span className="asset-mark" style={{ background: stock.tint }}>
                      {h.symbol.slice(0, 2)}
                    </span>
                    <div>
                      <b>{stock.name}</b>
                      <span>
                        {h.units} units · avg {stock.currency === 'USD' ? usd(h.avgCost) : ngn(h.avgCost, 2)}
                      </span>
                    </div>
                    <div className="val">
                      {stock.currency === 'USD' ? usd(value) : ngn(value, 2)}
                      <em className={gain >= 0 ? 'trend-up' : 'trend-down'}>
                        {gain >= 0 ? '+' : ''}
                        {gain.toFixed(1)}%
                      </em>
                    </div>
                  </div>
                  <div className="alloc">
                    <i
                      style={{
                        width: `${Math.min(100, (value / Math.max(1, stock.currency === 'USD' ? s.investmentsUsd : s.investmentsNgn)) * 100)}%`,
                        background: stock.change >= 0 ? 'var(--green-500)' : 'var(--red-600)',
                      }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
          <div className="panel" style={{ background: '#0b1533', color: '#fff', borderColor: '#0b1533' }}>
            <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '.12em', color: 'rgba(255,255,255,.45)' }}>
              RISK REMINDER
            </span>
            <h3 style={{ marginTop: 6, fontSize: 15 }}>Share prices can fall.</h3>
            <p style={{ marginTop: 6, fontSize: 10.5, lineHeight: 1.6, color: 'rgba(255,255,255,.55)' }}>
              Apex does not promise a return on investments. Past performance is not a guide to future
              performance. Only invest money you can leave for a while.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- activity ---------------- */

const FILTERS = ['All', 'Money in', 'Money out', 'Savings', 'Invest'] as const;
type Filter = (typeof FILTERS)[number];

function ActivityPage({
  open,
  initialQuery,
  searchNonce,
}: {
  open: (m: ModalState) => void;
  initialQuery: string;
  searchNonce: number;
}) {
  const s = useStore();
  const [filter, setFilter] = useState<Filter>('All');
  const [query, setQuery] = useState(initialQuery);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery, searchNonce]);

  const rows = s.txns.filter((t) => {
    if (t.status === 'Failed' && (filter === 'Money in' || filter === 'Money out')) return false;
    if (filter === 'Money in' && t.amount < 0) return false;
    if (filter === 'Money out' && t.amount >= 0) return false;
    if (filter === 'Savings' && t.type !== 'savings' && t.type !== 'interest') return false;
    if (filter === 'Invest' && t.type !== 'invest') return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      t.title.toLowerCase().includes(q) ||
      t.meta.toLowerCase().includes(q) ||
      t.ref.toLowerCase().includes(q)
    );
  });

  return (
    <div className="page page-enter">
      <div className="panel">
        <div className="panel-head">
          <div>
            <h2>All activity</h2>
            <p>
              {rows.length} record{rows.length === 1 ? '' : 's'} · demo ledger
            </p>
          </div>
          <div className="market-search">
            <Search size={13} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search reference or name"
              aria-label="Search activity"
            />
          </div>
        </div>
        <div className="filters" style={{ marginBottom: 14 }}>
          {FILTERS.map((f) => (
            <button
              type="button"
              key={f}
              className={`chip${filter === f ? ' on' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Status</th>
              <th>Date</th>
              <th>Reference</th>
              <th className="num">Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id} {...rowProps(() => open({ type: 'receipt', txn: t }))}>
                <td>
                  <div className="cell-main">
                    <span className="asset-mark" style={{ background: txnTint(t.type) }}>
                      {txnIcon(t.type)}
                    </span>
                    <div>
                      <b>{t.title}</b>
                      <span>{t.meta}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <StatusPill status={t.status} />
                </td>
                <td style={{ color: 'var(--ink-500)', fontSize: 10.5 }}>
                  {new Date(t.date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
                </td>
                <td style={{ color: 'var(--ink-500)', fontSize: 9.5, fontWeight: 650 }}>{t.ref}</td>
                <td className={`num ${t.amount >= 0 ? 'amount-in' : 'amount-out'}`}>
                  {t.amount >= 0 ? '+' : '−'}
                  {ngn(Math.abs(t.amount))}
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={5}>
                  <div className="empty">
                    <b>Nothing matches that filter</b>
                    <p>Try a different search or filter.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------- settings ---------------- */

function SettingsPage({ open }: { open: (m: ModalState) => void }) {
  const s = useStore();
  return (
    <div className="page page-enter">
      <div className="settings-grid">
        <div className="panel">
          <div className="profile-big">
            <Avatar initials={s.user.initials} tint={s.user.avatarTint} size={52} ring />
            <div>
              <h3>{s.user.name}</h3>
              <p>
                {s.user.phone} · member since {s.user.memberSince}
              </p>
            </div>
          </div>
          <div className="profile-rows">
            <div className="profile-row">
              <span>Email</span>
              <b>{s.user.email}</b>
            </div>
            <div className="profile-row">
              <span>Verification</span>
              <b>{s.user.kycLabel}</b>
            </div>
            <div className="profile-row">
              <span>BVN</span>
              <b>{s.user.bvn}</b>
            </div>
            <div className="profile-row">
              <span>NIN</span>
              <b>{s.user.nin}</b>
            </div>
            <div className="profile-row">
              <span>Address</span>
              <b style={{ maxWidth: 230 }}>{s.user.address}</b>
            </div>
            <div className="profile-row">
              <span>Primary bank</span>
              <b>
                {s.user.bank} · {s.user.bankAccount}
              </b>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 14 }}>
          <div className="panel">
            <div className="panel-head">
              <div>
                <h2>Verification</h2>
                <p>Tiered KYC with clear limits</p>
              </div>
              <BadgeCheck size={18} color="#1D52CE" />
            </div>
            {[
              { level: 1, label: 'Phone + email', done: true, note: 'Browse products and small wallet limits' },
              { level: 2, label: 'BVN + NIN', done: true, note: 'Full wallet, savings and investing' },
              { level: 3, label: 'Address + income', done: false, note: 'Higher limits · manual review' },
            ].map((k) => (
              <div
                key={k.level}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '11px 0',
                  borderTop: '1px solid #f2f4f8',
                }}
              >
                <span
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 8,
                    display: 'grid',
                    placeItems: 'center',
                    background: k.done ? 'var(--green-50)' : '#f2f4f8',
                    color: k.done ? 'var(--green-700)' : 'var(--ink-400)',
                  }}
                >
                  {k.done ? <Check size={13} /> : <Lock size={12} />}
                </span>
                <div>
                  <b style={{ fontSize: 11 }}>
                    Level {k.level} · {k.label}
                  </b>
                  <div style={{ fontSize: 9.5, color: 'var(--ink-500)', fontWeight: 600 }}>{k.note}</div>
                </div>
                <span
                  className={`pill ${k.done ? 'pill-green' : 'pill-amber'}`}
                  style={{ marginLeft: 'auto', fontSize: 8.5 }}
                >
                  {k.done ? 'Verified' : 'Optional'}
                </span>
              </div>
            ))}
          </div>

          <div className="panel">
            <div className="panel-head">
              <div>
                <h2>Security & preferences</h2>
                <p>Toggles persist on this device</p>
              </div>
            </div>
            {[
              { key: 'biometric' as const, title: 'Biometric confirmation', note: 'Face or fingerprint before money moves', icon: <Fingerprint size={16} /> },
              { key: 'priceAlerts' as const, title: 'Price alerts', note: 'Notify me when a holding moves 3%', icon: <LineChart size={16} /> },
              { key: 'productNews' as const, title: 'Product news', note: 'Occasional emails about new features', icon: <Sparkles size={16} /> },
            ].map((row) => (
              <div className="toggle-row" key={row.key}>
                <span
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 9,
                    display: 'grid',
                    placeItems: 'center',
                    background: '#F3F6FC',
                    color: 'var(--blue-700)',
                  }}
                >
                  {row.icon}
                </span>
                <div>
                  <b>{row.title}</b>
                  <span>{row.note}</span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={s[row.key]}
                  aria-label={row.title}
                  className={`switch${s[row.key] ? ' on' : ''}`}
                  onClick={() => s.toggleSetting(row.key)}
                />
              </div>
            ))}
          </div>

          <div className="panel danger-zone">
            <div className="panel-head">
              <div>
                <h2>Demo data</h2>
                <p>Changes are stored in this browser only</p>
              </div>
              <RefreshCw size={16} color="#d92d20" />
            </div>
            <p style={{ fontSize: 10.5, color: 'var(--ink-500)', lineHeight: 1.6 }}>
              Deposits, plans, orders and settings made in this workspace persist locally. Reset returns
              every balance and ledger entry to its seeded starting point.
            </p>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ marginTop: 12, color: '#d92d20', borderColor: '#f0c9c4' }}
              onClick={() => open({ type: 'reset' })}
            >
              Reset demo account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- topbar ---------------- */

function Topbar({
  page,
  onSearch,
  children,
}: {
  page: Page;
  onSearch: (q: string) => void;
  children?: ReactNode;
}) {
  const s = useStore();
  const [query, setQuery] = useState('');
  const [bell, setBell] = useState(false);
  const unread = s.notifications.filter((n) => n.unread).length;

  useEffect(() => {
    if (!bell) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setBell(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [bell]);

  return (
    <header className="topbar">
      <div className="tb-title">
        <h1>{pageCopy[page].title}</h1>
        <p>{pageCopy[page].sub}</p>
      </div>
      <label className="tb-search">
        <Search size={14} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              onSearch(query);
              setQuery('');
            }
          }}
          placeholder="Search activity or references"
          aria-label="Search activity"
        />
      </label>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          type="button"
          className="tb-icon"
          aria-label={`Notifications (${unread} unread)`}
          aria-expanded={bell}
          onClick={() => setBell((v) => !v)}
        >
          <Bell size={16} />
          {unread > 0 && <span className="tb-dot" />}
        </button>
        {bell && (
          <>
            <div className="pop-overlay" onClick={() => setBell(false)} />
            <div className="pop" role="dialog" aria-label="Notifications">
              <div className="pop-head">
                <h3>Notifications</h3>
                <button type="button" onClick={() => s.markAllRead()}>
                  Mark all read
                </button>
              </div>
              {s.notifications.map((n) => (
                <div className={`pop-item${n.unread ? ' unread' : ''}`} key={n.id}>
                  <i
                    style={{
                      background:
                        n.kind === 'security'
                          ? '#FFDCCE'
                          : n.kind === 'savings'
                            ? '#C3F3C6'
                            : n.kind === 'invest'
                              ? '#CCF4F9'
                              : '#F4CCF9',
                    }}
                  >
                    {n.kind === 'security' ? (
                      <ShieldCheck size={13} />
                    ) : n.kind === 'savings' ? (
                      <Target size={13} />
                    ) : n.kind === 'invest' ? (
                      <LineChart size={13} />
                    ) : (
                      <BadgeCheck size={13} />
                    )}
                  </i>
                  <div>
                    <b>{n.title}</b>
                    <p>{n.body}</p>
                    <p style={{ color: 'var(--ink-400)' }}>{relativeTime(n.time)}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      <div className="tb-profile">
        <Avatar initials={s.user.initials} tint={s.user.avatarTint} size={30} />
        <div>
          <b>{s.user.firstName}</b>
          <span>{s.user.kycLabel}</span>
        </div>
      </div>
      {children}
    </header>
  );
}

/* ---------------- app ---------------- */

function Workspace() {
  const s = useStore();
  const [page, setPage] = useState<Page>('overview');
  const [modal, setModal] = useState<ModalState>(null);
  const [activitySearch, setActivitySearch] = useState({ q: '', n: 0 });
  const unread = s.notifications.filter((n) => n.unread).length;

  const dateLabel = useMemo(
    () =>
      new Date().toLocaleDateString('en-NG', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
    [],
  );

  const open = (m: ModalState) => setModal(m);

  return (
    <div className="desk">
      <aside className="sidebar">
        <div className="sb-brand">
          <Logo tone="light" size={30} />
        </div>
        <span className="sb-label">Workspace</span>
        <nav className="sb-nav" aria-label="Main navigation">
          {nav.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`sb-item${page === item.id ? ' on' : ''}`}
              onClick={() => setPage(item.id)}
              aria-label={item.label}
              aria-current={page === item.id ? 'page' : undefined}
            >
              {item.icon}
              <span>{item.label}</span>
              {item.id === 'activity' && unread > 0 && <em>{unread}</em>}
            </button>
          ))}
        </nav>
        <div className="sb-note">
          <b>Demo workspace</b>
          <p>{dateLabel}. Funds and prices are sample data, not a live account.</p>
          <button type="button" onClick={() => open({ type: 'reset' })}>
            Reset data <ArrowRight size={11} />
          </button>
        </div>
        <div className="sb-user">
          <Avatar initials={s.user.initials} tint={s.user.avatarTint} size={32} />
          <div>
            <b>{s.user.name}</b>
            <span>{s.user.kycLabel}</span>
          </div>
          <ChevronRight size={14} />
        </div>
      </aside>

      <div className="main">
        <Topbar
          page={page}
          onSearch={(q) => {
            setActivitySearch((prev) => ({ q, n: prev.n + 1 }));
            setPage('activity');
          }}
        />
        {page === 'overview' && <Overview open={open} go={setPage} />}
        {page === 'wallet' && <WalletPage open={open} />}
        {page === 'savings' && <SavingsPage open={open} />}
        {page === 'invest' && <InvestPage open={open} />}
        {page === 'activity' && <ActivityPage open={open} initialQuery={activitySearch.q} searchNonce={activitySearch.n} />}
        {page === 'settings' && <SettingsPage open={open} />}
      </div>

      {modal?.type === 'money' && <MoneyModal mode={modal.mode} onClose={() => setModal(null)} />}
      {modal?.type === 'new-plan' && <NewPlanModal onClose={() => setModal(null)} />}
      {modal?.type === 'plan' &&
        (() => {
          const plan = s.plans.find((p) => p.id === modal.planId);
          if (!plan) return null;
          return <PlanMoneyModal plan={plan} mode={modal.mode} onClose={() => setModal(null)} />;
        })()}
      {modal?.type === 'trade' && (
        <TradeModal symbol={modal.symbol} initialSide={modal.side} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'receipt' && <ReceiptModal txn={modal.txn} onClose={() => setModal(null)} />}
      {modal?.type === 'reset' && (
        <ModalShell
          title="Reset the demo account?"
          sub="Balances, plans and activity return to their seeded values. This cannot be undone."
          onClose={() => setModal(null)}
        >
          <div className="modal-error" style={{ background: '#FFF8E8', color: '#8a6100' }}>
            <CircleAlert size={13} style={{ flexShrink: 0, marginTop: 1 }} />
            Your current demo balances and locally saved changes will be replaced.
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => setModal(null)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              style={{ flex: 1 }}
              onClick={() => {
                s.reset();
                setModal(null);
              }}
            >
              Reset account
            </button>
          </div>
        </ModalShell>
      )}

      {s.toast && (
        <div className="toast" role="status">
          <Check size={15} /> {s.toast}
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Workspace />
    </StoreProvider>
  );
}
