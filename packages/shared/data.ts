export const ngn = (value: number, decimals = 0) =>
  '₦' +
  value.toLocaleString('en-NG', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

export const usd = (value: number, decimals = 2) =>
  '$' +
  value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

export const compactNaira = (value: number) => {
  if (Math.abs(value) >= 1_000_000_000) return `₦${(value / 1_000_000_000).toFixed(1)}b`;
  if (Math.abs(value) >= 1_000_000) return `₦${(value / 1_000_000).toFixed(1)}m`;
  if (Math.abs(value) >= 1_000) return `₦${Math.round(value / 1_000)}k`;
  return ngn(value);
};

export const pct = (value: number, digits = 1) =>
  `${value > 0 ? '+' : ''}${value.toFixed(digits)}%`;

export const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });

export const longDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' });

export const relativeTime = (iso: string, base = new Date('2026-11-02T09:24:00+01:00')) => {
  const diff = base.getTime() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return shortDate(iso);
};

export type Stock = {
  symbol: string;
  name: string;
  exchange: 'NGX' | 'NASDAQ';
  currency: 'NGN' | 'USD';
  price: number;
  change: number;
  sector: string;
  tint: string;
  spark: number[];
  about: string;
  marketCap: string;
  pe: string;
  volume: string;
};

export const stocks: Stock[] = [
  {
    symbol: 'DANGCEM',
    name: 'Dangote Cement',
    exchange: 'NGX',
    currency: 'NGN',
    price: 635.0,
    change: 1.24,
    sector: 'Industrial goods',
    tint: '#FFDCCE',
    spark: [18, 20, 19, 22, 24, 23, 26, 25, 28, 29, 31, 30, 34],
    about:
      'Sub-Saharan Africa’s largest cement producer, with operations across ten African countries and a listing on the Nigerian Exchange.',
    marketCap: '₦10.8t',
    pe: '18.4',
    volume: '412,096',
  },
  {
    symbol: 'AIRTELAFRI',
    name: 'Airtel Africa',
    exchange: 'NGX',
    currency: 'NGN',
    price: 2270.0,
    change: 0.8,
    sector: 'Telecommunications',
    tint: '#FFE9D6',
    spark: [22, 23, 21, 24, 25, 27, 26, 27, 29, 28, 30, 31, 32],
    about:
      'Mobile network and mobile-money operator serving 14 African markets, including Nigeria’s largest mobile-money footprint outside banks.',
    marketCap: '₦8.5t',
    pe: '14.1',
    volume: '88,320',
  },
  {
    symbol: 'FIDSON',
    name: 'Fidson Health',
    exchange: 'NGX',
    currency: 'NGN',
    price: 61.45,
    change: 2.1,
    sector: 'Healthcare',
    tint: '#E6F8E7',
    spark: [14, 15, 15, 17, 16, 18, 19, 21, 20, 22, 24, 25, 27],
    about:
      'Nigerian pharmaceutical manufacturer with a portfolio spanning antiretrovirals, antibiotics and consumer health products.',
    marketCap: '₦146b',
    pe: '9.8',
    volume: '1.2m',
  },
  {
    symbol: 'FLOURMILL',
    name: 'Flour Mills of Nigeria',
    exchange: 'NGX',
    currency: 'NGN',
    price: 70.0,
    change: 0.0,
    sector: 'Consumer goods',
    tint: '#FFF0C2',
    spark: [20, 20, 19, 21, 20, 21, 20, 20, 21, 20, 20, 21, 20],
    about:
      'One of Nigeria’s largest food and agro-allied companies, producing flour, pasta, edible oils and animal feed.',
    marketCap: '₦287b',
    pe: '11.2',
    volume: '640,870',
  },
  {
    symbol: 'GTCO',
    name: 'Guaranty Trust Holding',
    exchange: 'NGX',
    currency: 'NGN',
    price: 93.06,
    change: 0.35,
    sector: 'Financial services',
    tint: '#FFDCCE',
    spark: [21, 21, 22, 21, 23, 24, 23, 24, 24, 25, 25, 26, 26],
    about:
      'Holding company for Guaranty Trust Bank, one of Nigeria’s most recognised banking franchises with growing East African operations.',
    marketCap: '₦2.7t',
    pe: '7.6',
    volume: '3.4m',
  },
  {
    symbol: 'NESTLE',
    name: 'Nestlé Nigeria',
    exchange: 'NGX',
    currency: 'NGN',
    price: 1958.0,
    change: -0.42,
    sector: 'Consumer goods',
    tint: '#F4E1D6',
    spark: [31, 30, 31, 29, 30, 28, 29, 27, 28, 27, 26, 27, 26],
    about:
      'Food and beverage manufacturer behind Milo, Maggi and Golden Morn, listed on the Nigerian Exchange since 1979.',
    marketCap: '₦1.55t',
    pe: '21.7',
    volume: '42,180',
  },
  {
    symbol: 'OANDO',
    name: 'Oando',
    exchange: 'NGX',
    currency: 'NGN',
    price: 70.79,
    change: -1.12,
    sector: 'Energy',
    tint: '#FFE3C2',
    spark: [26, 25, 27, 24, 25, 23, 24, 22, 23, 21, 22, 20, 19],
    about:
      'Integrated energy group with upstream, midstream and downstream operations across West Africa.',
    marketCap: '₦900b',
    pe: '6.9',
    volume: '8.1m',
  },
  {
    symbol: 'OKOMUOIL',
    name: 'Okomu Oil Palm',
    exchange: 'NGX',
    currency: 'NGN',
    price: 1095.0,
    change: 0.58,
    sector: 'Agriculture',
    tint: '#E6F8E7',
    spark: [18, 19, 18, 20, 21, 20, 22, 22, 23, 24, 23, 25, 25],
    about:
      'Palm oil and rubber producer operating one of Nigeria’s largest plantations in Edo State.',
    marketCap: '₦1.1t',
    pe: '12.3',
    volume: '27,640',
  },
  {
    symbol: 'STANBIC',
    name: 'Stanbic IBTC Holdings',
    exchange: 'NGX',
    currency: 'NGN',
    price: 108.95,
    change: 0.22,
    sector: 'Financial services',
    tint: '#CCF4F9',
    spark: [23, 23, 24, 23, 24, 25, 24, 25, 25, 26, 26, 27, 27],
    about:
      'Financial services group offering banking, wealth, insurance and asset management across Nigeria.',
    marketCap: '₦1.35t',
    pe: '8.1',
    volume: '980,200',
  },
  {
    symbol: 'TOTAL',
    name: 'TotalEnergies Marketing',
    exchange: 'NGX',
    currency: 'NGN',
    price: 640.0,
    change: 0.0,
    sector: 'Energy',
    tint: '#FFDCCE',
    spark: [24, 24, 25, 24, 24, 25, 24, 25, 24, 25, 25, 24, 24],
    about:
      'Fuel and lubricant distribution business with a nationwide retail station network in Nigeria.',
    marketCap: '₦204b',
    pe: '13.8',
    volume: '153,410',
  },
  {
    symbol: 'MTNN',
    name: 'MTN Nigeria',
    exchange: 'NGX',
    currency: 'NGN',
    price: 263.32,
    change: 1.05,
    sector: 'Telecommunications',
    tint: '#FFF0C2',
    spark: [19, 20, 20, 21, 20, 22, 23, 22, 23, 24, 24, 25, 26],
    about:
      'Nigeria’s largest mobile network operator, with voice, data and fintech services reaching subscribers nationwide.',
    marketCap: '₦4.1t',
    pe: '11.6',
    volume: '210,450',
  },
  {
    symbol: 'AAPL',
    name: 'Apple',
    exchange: 'NASDAQ',
    currency: 'USD',
    price: 232.14,
    change: 0.62,
    sector: 'Technology',
    tint: '#E9EDF2',
    spark: [20, 21, 20, 22, 23, 22, 24, 24, 25, 24, 26, 27, 28],
    about:
      'Designs iPhone, Mac, iPad and wearables, with a growing services business spanning payments, cloud and subscriptions.',
    marketCap: '$3.52t',
    pe: '36.2',
    volume: '48.1m',
  },
  {
    symbol: 'MSFT',
    name: 'Microsoft',
    exchange: 'NASDAQ',
    currency: 'USD',
    price: 421.7,
    change: -0.18,
    sector: 'Technology',
    tint: '#DCE9FF',
    spark: [27, 26, 27, 26, 27, 26, 25, 26, 25, 25, 24, 25, 24],
    about:
      'Cloud, productivity and AI company behind Azure, Microsoft 365, GitHub and Copilot.',
    marketCap: '$3.13t',
    pe: '34.9',
    volume: '21.4m',
  },
  {
    symbol: 'NVDA',
    name: 'Nvidia',
    exchange: 'NASDAQ',
    currency: 'USD',
    price: 138.25,
    change: 2.34,
    sector: 'Semiconductors',
    tint: '#E6F8E7',
    spark: [17, 18, 19, 18, 20, 21, 23, 22, 24, 26, 25, 28, 30],
    about:
      'Accelerated computing company providing GPUs and systems for AI, gaming and data centre workloads.',
    marketCap: '$3.39t',
    pe: '53.7',
    volume: '96.8m',
  },
  {
    symbol: 'GOOGL',
    name: 'Alphabet',
    exchange: 'NASDAQ',
    currency: 'USD',
    price: 172.45,
    change: 0.44,
    sector: 'Technology',
    tint: '#FFF0C2',
    spark: [21, 22, 21, 22, 23, 22, 24, 24, 23, 25, 25, 26, 27],
    about:
      'Parent company of Google Search, YouTube, Android, Cloud and Waymo.',
    marketCap: '$2.11t',
    pe: '23.5',
    volume: '18.7m',
  },
  {
    symbol: 'AMZN',
    name: 'Amazon',
    exchange: 'NASDAQ',
    currency: 'USD',
    price: 198.1,
    change: 0.9,
    sector: 'Consumer',
    tint: '#FFE9D6',
    spark: [19, 20, 20, 21, 20, 22, 23, 22, 24, 25, 24, 26, 27],
    about:
      'E-commerce, logistics and cloud company; AWS remains the largest contributor to operating profit.',
    marketCap: '$2.07t',
    pe: '42.1',
    volume: '34.2m',
  },
];

export type PlanKind = 'flexible' | 'fixed' | 'target';

export type Plan = {
  id: string;
  name: string;
  kind: PlanKind;
  balance: number;
  target?: number;
  rate: number;
  subtitle: string;
  opened: string;
  maturity?: string;
  monthly?: number;
  color: string;
  pastel: string;
  icon: string;
};

export const initialPlans: Plan[] = [
  {
    id: 'plan-flex-1',
    name: 'Everyday Fund',
    kind: 'flexible',
    balance: 185000,
    rate: 12,
    subtitle: 'Withdraw anytime · interest paid monthly',
    opened: '2026-06-14',
    color: '#1D52CE',
    pastel: '#A9CBFF',
    icon: 'bolt',
  },
  {
    id: 'plan-fixed-1',
    name: 'Rent Reserve',
    kind: 'fixed',
    balance: 120000,
    rate: 16,
    subtitle: '90-day fixed deposit · matures 18 Jan 2027',
    opened: '2026-10-20',
    maturity: '2027-01-18',
    color: '#760A81',
    pastel: '#F4CCF9',
    icon: 'lock',
  },
  {
    id: 'plan-target-1',
    name: 'New Laptop Fund',
    kind: 'target',
    balance: 412500,
    target: 850000,
    rate: 14,
    subtitle: 'Laptop upgrade · ₦50,000 auto-save monthly',
    opened: '2026-03-02',
    maturity: '2027-06-30',
    monthly: 50000,
    color: '#06720C',
    pastel: '#C3F3C6',
    icon: 'target',
  },
  {
    id: 'plan-target-2',
    name: 'Detty December',
    kind: 'target',
    balance: 90000,
    target: 300000,
    rate: 14,
    subtitle: 'Holiday fund · ₦25,000 auto-save monthly',
    opened: '2026-08-11',
    maturity: '2026-12-15',
    monthly: 25000,
    color: '#06720C',
    pastel: '#C3F3C6',
    icon: 'target',
  },
];

export type Holding = {
  symbol: string;
  units: number;
  avgCost: number;
  price: number;
  change: number;
};

export const holdings: Holding[] = [
  { symbol: 'DANGCEM', units: 120, avgCost: 588.0, price: 635.0, change: 1.24 },
  { symbol: 'AIRTELAFRI', units: 15, avgCost: 2105.0, price: 2270.0, change: 0.8 },
  { symbol: 'GTCO', units: 300, avgCost: 78.2, price: 93.06, change: 0.35 },
  { symbol: 'MTNN', units: 100, avgCost: 241.0, price: 263.32, change: 1.05 },
  { symbol: 'NVDA', units: 4, avgCost: 121.4, price: 138.25, change: 2.34 },
  { symbol: 'AAPL', units: 3, avgCost: 214.2, price: 232.14, change: 0.62 },
];

export type Txn = {
  id: string;
  title: string;
  meta: string;
  amount: number;
  date: string;
  status: 'Completed' | 'Pending' | 'Failed';
  type: 'deposit' | 'withdrawal' | 'transfer' | 'savings' | 'invest' | 'interest';
  ref: string;
};

export const transactions: Txn[] = [
  {
    id: 'tx-1',
    title: 'Bank transfer from GTBank',
    meta: 'Wallet funding · ••4471',
    amount: 150000,
    date: '2026-10-28T14:12:00+01:00',
    status: 'Completed',
    type: 'deposit',
    ref: 'APX-DEP-884193',
  },
  {
    id: 'tx-2',
    title: 'Transfer to Chinedu Okafor',
    meta: 'Apex wallet · @chinedu',
    amount: -25000,
    date: '2026-10-27T09:41:00+01:00',
    status: 'Completed',
    type: 'transfer',
    ref: 'APX-TRF-884012',
  },
  {
    id: 'tx-3',
    title: 'New Laptop Fund',
    meta: 'Target savings · auto-save',
    amount: -50000,
    date: '2026-10-25T06:00:00+01:00',
    status: 'Completed',
    type: 'savings',
    ref: 'APX-SAV-883744',
  },
  {
    id: 'tx-4',
    title: 'Bought 20 DANGCEM',
    meta: 'Invest · NGX',
    amount: -12700,
    date: '2026-10-24T11:05:00+01:00',
    status: 'Completed',
    type: 'invest',
    ref: 'APX-INV-883520',
  },
  {
    id: 'tx-5',
    title: 'Withdrawal to GTBank',
    meta: 'Beneficiary · ••4471',
    amount: -40000,
    date: '2026-10-20T17:22:00+01:00',
    status: 'Completed',
    type: 'withdrawal',
    ref: 'APX-WDR-882901',
  },
  {
    id: 'tx-6',
    title: 'Flexible savings interest',
    meta: 'Everyday Fund · October',
    amount: 1125,
    date: '2026-10-18T00:05:00+01:00',
    status: 'Completed',
    type: 'interest',
    ref: 'APX-INT-882410',
  },
  {
    id: 'tx-7',
    title: 'Card funding attempt',
    meta: 'Visa ·• 2208 · declined by issuer',
    amount: 20000,
    date: '2026-10-16T15:03:00+01:00',
    status: 'Failed',
    type: 'deposit',
    ref: 'APX-DEP-881996',
  },
];

export type Notification = {
  id: string;
  title: string;
  body: string;
  time: string;
  kind: 'security' | 'savings' | 'invest' | 'kyc';
  unread: boolean;
};

export const notifications: Notification[] = [
  {
    id: 'nt-1',
    title: 'New device sign-in',
    body: 'A Chrome browser on Windows signed in to your account. If this wasn’t you, secure your account.',
    time: '2026-11-02T07:10:00+01:00',
    kind: 'security',
    unread: true,
  },
  {
    id: 'nt-2',
    title: 'You’re 48% to your laptop goal',
    body: '₦412,500 of ₦850,000 saved. Your next ₦50,000 auto-save runs on 5 Nov.',
    time: '2026-11-01T09:00:00+01:00',
    kind: 'savings',
    unread: true,
  },
  {
    id: 'nt-3',
    title: 'Airtel Africa is up 0.8%',
    body: 'Your 15 units are now worth ₦34,050. Prices are delayed by at least 15 minutes.',
    time: '2026-10-31T16:30:00+01:00',
    kind: 'invest',
    unread: false,
  },
  {
    id: 'nt-4',
    title: 'Identity verified',
    body: 'Level 2 verification is complete. Your daily limits have been raised.',
    time: '2026-10-30T12:15:00+01:00',
    kind: 'kyc',
    unread: false,
  },
];

export const user = {
  name: 'Ada Okafor',
  firstName: 'Ada',
  initials: 'AO',
  phone: '+234 803 555 0147',
  email: 'ada.okafor@example.com',
  bvn: '••• ••• 4421',
  nin: '•••• ••• 8807',
  kycLevel: 2,
  kycLabel: 'Level 2 · Verified',
  address: '18B Ozumba Mbadiwe Avenue, Victoria Island, Lagos',
  memberSince: 'March 2026',
  bank: 'GTBank',
  bankAccount: '••4471',
  avatarTint: '#FFDCCE',
};

export const wallet = {
  ngn: 268400,
  ngnPending: 12500,
  usd: 240,
  savings: 807500,
  investments: 164500,
  totalReturn: 73000,
  performance: 4.8,
  activePlans: 4,
  points: 1240,
};

export const marketMovers = [
  { symbol: 'NVDA', name: 'Nvidia', price: 138.25, change: 2.34, currency: 'USD' as const },
  { symbol: 'FIDSON', name: 'Fidson Health', price: 61.45, change: 2.1, currency: 'NGN' as const },
  { symbol: 'DANGCEM', name: 'Dangote Cement', price: 635.0, change: 1.24, currency: 'NGN' as const },
  { symbol: 'OANDO', name: 'Oando', price: 70.79, change: -1.12, currency: 'NGN' as const },
  { symbol: 'NESTLE', name: 'Nestlé Nigeria', price: 1958.0, change: -0.42, currency: 'NGN' as const },
];

export type Bank = { id: string; name: string; account: string; primary?: boolean };

export const banks: Bank[] = [
  { id: 'gtb', name: 'Guaranty Trust Bank', account: '••4471', primary: true },
  { id: 'zenith', name: 'Zenith Bank', account: '••9023' },
  { id: 'access', name: 'Access Bank', account: '••1180' },
];

export const featuredIn = ['TechCabal', 'BusinessDay', 'Nairametrics'];
