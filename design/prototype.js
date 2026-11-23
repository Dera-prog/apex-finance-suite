/* Apex Finance — interactive prototype engine */
(function () {
  'use strict';

  const screenEl = document.getElementById('screen');
  const logEl = document.getElementById('log');

  const money = (kobo) => '₦' + (kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const usd = (cents) => '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ref = (prefix) => 'APX-' + prefix + '-' + String(Math.floor(100000 + Math.random() * 900000));
  const nowStamp = () => new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const toKobo = (value) => {
    const n = Number(String(value || '').replace(/[^0-9.]/g, ''));
    return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : null;
  };
  const pct = (a, b) => Math.min(100, Math.round((a / b) * 100));

  const QUOTES = {
    DANGCEM: { name: 'Dangote Cement', market: 'NGX', price: 61200, change: '+1.8%', up: true, cur: 'NGN' },
    GTCO: { name: 'Guaranty Trust', market: 'NGX', price: 4820, change: '+0.6%', up: true, cur: 'NGN' },
    MTNN: { name: 'MTN Nigeria', market: 'NGX', price: 22150, change: '−0.9%', up: false, cur: 'NGN' },
    AAPL: { name: 'Apple', market: 'NASDAQ', price: 22852, change: '−0.4%', up: false, cur: 'USD' }
  };

  function fresh() {
    return {
      screen: 'splash',
      authed: false,
      offline: false,
      slow: false,
      wallet: 6840000,
      usd: 24000,
      plans: [
        { id: 'rent', name: 'Rent', kind: 'Fixed', amount: 8500000, goal: 25000000, locked: true, maturity: '31 Dec 2026' },
        { id: 'travel', name: 'Travel', kind: 'Flexible', amount: 7200000, goal: 15000000, locked: false },
        { id: 'emergency', name: 'Emergency', kind: 'Flexible', amount: 1500000, goal: 10000000, locked: false },
        { id: 'car', name: 'Car', kind: 'Target', amount: 2800000, goal: 12000000, locked: false }
      ],
      holdings: [
        { symbol: 'DANGCEM', units: 120, avg: 58800 },
        { symbol: 'GTCO', units: 250, avg: 4400 },
        { symbol: 'AAPL', units: 3.5, avg: 21410 }
      ],
      txs: [
        { id: 1, title: 'Wallet funding', sub: 'Today · 09:14', amount: 5000000, dir: 'in', ref: 'APX-DEP-560563', when: '23 Nov 2026, 09:14', detail: 'GTBank · 6789' },
        { id: 2, title: 'Transfer to Ada Obi', sub: 'Mon · 12:40', amount: -500000, dir: 'out', ref: 'APX-TRF-764907', when: '22 Nov 2026, 12:40', detail: 'Apex · +234 803 555 0147' },
        { id: 3, title: 'Withdrawal to GTBank', sub: 'Sun · 16:22', amount: -2000000, dir: 'out', ref: 'APX-WDR-190016', when: '21 Nov 2026, 16:22', detail: 'GTBank · 0123456789' },
        { id: 4, title: 'Rent plan', sub: 'Sun · 15:58', amount: -1000000, dir: 'out', ref: 'APX-SAV-936439', when: '21 Nov 2026, 15:58', detail: 'Locked until 31 Dec 2026' },
        { id: 5, title: 'Rent plan withdrawal', sub: 'Sun · 15:47', amount: 400000, dir: 'in', ref: 'APX-SAV-846976', when: '21 Nov 2026, 15:47', detail: 'Returned to wallet' },
        { id: 6, title: 'DANGCEM · 20 units', sub: 'Mon · 11:03', amount: -1224000, dir: 'out', ref: 'APX-INV-305118', when: '22 Nov 2026, 11:03', detail: '20 units at ₦612.00' }
      ],
      draft: {
        add: { amount: '25000', method: 'bank' },
        withdraw: { amount: '', bank: 'GTBank · 0123456789' },
        send: { to: '', phone: '', amount: '', note: '' },
        planNew: { name: '', amount: '', kind: 'Fixed' },
        planTxn: { amount: '' },
        invest: { amount: '25000', side: 'Buy' }
      },
      sheet: null,
      busy: false,
      busyHint: false,
      toast: null,
      banner: null,
      selectedPlan: 'rent',
      selectedSymbol: 'DANGCEM',
      receipt: null,
      activityFilter: 'All',
      planFilter: 'All',
      errors: {},
      auth: { phone: '+234 803 555 0147', code: '' },
      log: []
    };
  }

  let S = fresh();
  let history = [];
  let toastTimer = null;
  let focusTimer = null;
  let lastFocusKey = '';

  function log(msg) {
    S.log.unshift({ t: nowStamp(), msg: msg });
    S.log = S.log.slice(0, 9);
    if (logEl) {
      logEl.innerHTML = S.log.map(function (e) {
        return '<p><b>' + e.t + '</b> ' + esc(e.msg) + '</p>';
      }).join('');
    }
  }

  function planTotal() {
    return S.plans.reduce(function (sum, p) { return sum + p.amount; }, 0);
  }
  function totalBalance() {
    return S.wallet + planTotal();
  }
  function planById(id) {
    return S.plans.filter(function (p) { return p.id === id; })[0];
  }
  function addTx(title, amount, dir, reference, detail) {
    S.txs.unshift({
      id: Date.now(), title: title, sub: 'Just now', amount: amount, dir: dir,
      ref: reference, when: 'Today, ' + nowStamp(), detail: detail || ''
    });
  }

  function setToast(text, kind) {
    S.toast = { text: text, kind: kind || 'ok' };
    clearTimeout(toastTimer);
    const stamp = S.toast.text;
    toastTimer = setTimeout(function () {
      if (S.toast && S.toast.text === stamp) { S.toast = null; render(); }
    }, 3600);
    render();
  }

  /* ---------- chrome ---------- */

  function statusbar() {
    return '<div class="statusbar"><span>9:41</span><span class="dots"><i></i><i></i><i></i></span></div>';
  }

  function nav(current) {
    const items = [
      ['home', '⌂', 'Home'], ['wallet', '◫', 'Wallet'], ['plans', '◎', 'Plans'],
      ['invest', '◔', 'Invest'], ['activity', '☰', 'Activity']
    ];
    return '<nav class="ap-nav" aria-label="Primary">' + items.map(function (i) {
      return '<button type="button" data-nav="' + i[0] + '"' + (current === i[0] ? ' aria-current="page"' : '') +
        '><span class="ni" aria-hidden="true">' + i[1] + '</span>' + i[2] + '</button>';
    }).join('') + '</nav>';
  }

  function banner() {
    if (!S.offline) return '';
    return '<div class="banner-slot"><div class="ap-banner" role="status"><span aria-hidden="true">!</span>' +
      '<span>You are offline. Money actions are refused and nothing is deducted. Turn off Offline in the controls to retry.</span></div></div>';
  }

  function toast() {
    if (!S.toast) return '';
    const icon = S.toast.kind === 'error' ? '✕' : '✓';
    return '<div class="ap-toast ' + (S.toast.kind === 'error' ? 'error' : '') + '" role="status">' +
      '<span class="ic" aria-hidden="true">' + icon + '</span><span>' + esc(S.toast.text) + '</span>' +
      '<button class="x" type="button" data-action="dismissToast" aria-label="Dismiss">✕</button></div>';
  }

  function topbar(title, sub, right, backAction) {
    return '<div class="ap-topbar">' +
      (backAction
        ? '<button class="ap-iconbtn" type="button" data-action="back" aria-label="Back">←</button>'
        : '<span class="ap-avatar">AO</span>') +
      '<span style="flex:1">' +
        '<b style="display:block;font-size:13px;font-family:var(--font-display)">' + esc(title) + '</b>' +
        '<span class="ap-help">' + esc(sub) + '</span>' +
      '</span>' + (right || '') + '</div>';
  }

  function field(label, inner, help) {
    return '<div class="ap-field"><label>' + esc(label) + '</label>' + inner + (help || '') + '</div>';
  }

  function amountInput(id, value, action, placeholder) {
    return '<div class="ap-amount"><span class="cur">₦</span>' +
      '<input id="' + id + '" inputmode="decimal" autocomplete="off" placeholder="' + esc(placeholder || '0.00') +
      '" aria-label="Amount in naira" value="' + esc(value) + '" data-amount="' + action + '" /></div>';
  }

  /* ---------- screens ---------- */

  function screenSplash() {
    return '<div class="splash">' +
      '<div class="brand-lock">' +
        '<span class="kit-mark" aria-hidden="true"></span>' +
        '<div><h1>Every naira,<br><em>accounted for.</em></h1>' +
        '<p>Wallet, savings plans and shares in one calm app. Every movement comes with a receipt.</p></div>' +
      '</div>' +
      '<div class="actions">' +
        '<button class="ap-btn primary block" type="button" data-action="start">Get started</button>' +
        '<button class="ap-btn ghost block" type="button" data-action="start">I already have an account</button>' +
        '<div class="foot"><span class="proto-status-line">Prototype · data is simulated locally</span></div>' +
      '</div>' +
    '</div>';
  }

  function screenPhone() {
    const err = S.errors.phone ? '<span class="ap-help error">' + esc(S.errors.phone) + '</span>' : '';
    return '<div class="body" style="padding-top:14px">' +
      '<button class="ap-back" type="button" data-go="splash">← Back</button>' +
      '<div class="auth-head"><h1>What is your number?</h1><p>We will text a 6-digit code to confirm it is you.</p></div>' +
      field('Phone number',
        '<input class="ap-input' + (S.errors.phone ? ' error' : '') + '" id="phone" type="tel" autocomplete="tel" inputmode="tel" value="' + esc(S.auth.phone) + '" data-enter="signin" aria-describedby="phone-help" />',
        '<span class="ap-help' + (S.errors.phone ? ' error' : '') + '" id="phone-help">' + (S.errors.phone ? esc(S.errors.phone) : 'Standard SMS rates apply. Use +234 803 555 0147 for the demo account.') + '</span>') +
      '<button class="ap-btn primary block" type="button" data-action="signin">' + (S.busy ? '<span class="ap-spinner"></span> Sending code…' : 'Send code') + '</button>' +
      '<p class="ap-help" style="text-align:center">New numbers get a fresh zeroed account.</p>' +
    '</div>';
  }

  function screenCode() {
    const err = S.errors.code ? '<span class="ap-help error">' + esc(S.errors.code) + '</span>' : '';
    return '<div class="body" style="padding-top:14px">' +
      '<button class="ap-back" type="button" data-go="phone">← Change number</button>' +
      '<div class="auth-head"><h1>Enter the code</h1><p>Sent to ' + esc(S.auth.phone) + '</p></div>' +
      '<input class="otp-input' + (S.errors.code ? ' shake' : '') + '" id="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="••••••" value="' + esc(S.auth.code) + '" data-enter="verify" aria-label="6-digit code" />' +
      err +
      '<div class="dev-hint">Demo mode: SMS is not configured, so the code is <b>123456</b>.</div>' +
      '<button class="ap-btn primary block" type="button" data-action="verify">' + (S.busy ? '<span class="ap-spinner"></span> Checking…' : 'Verify code') + '</button>' +
      '<button class="linklike" type="button" data-action="resend" style="justify-self:center">Resend code</button>' +
      '<p class="ap-help" style="text-align:center">Codes expire after 10 minutes. Too many attempts are rate-limited.</p>' +
    '</div>';
  }

  function screenHome() {
    const rent = planById('rent');
    return '<div class="body" style="padding-top:4px">' +
      '<div class="ap-topbar" style="padding:0 0 4px">' +
        '<button class="ap-avatar" type="button" data-go="profile" aria-label="Open profile">AO</button>' +
        '<span style="flex:1"><b style="display:block;font-size:13px;font-family:var(--font-display)">Good morning, Ada</b><span class="ap-help">Everything is up to date · synced just now</span></span>' +
        '<button class="ap-iconbtn" type="button" data-action="alerts" aria-label="Notifications">◔</button>' +
      '</div>' +
      '<div class="ap-balance">' +
        '<span class="tiny">Total balance</span>' +
        '<div class="big">' + money(totalBalance()) + '</div>' +
        '<span class="sub">Wallet ' + money(S.wallet) + ' · Plans ' + money(planTotal()) + '</span>' +
        '<div class="row">' +
          '<button class="ap-btn" type="button" data-go="add">Add money</button>' +
          '<button class="ap-btn" type="button" data-go="withdraw">Withdraw</button>' +
        '</div>' +
      '</div>' +
      '<div class="tile-row">' +
        '<button class="tile" type="button" data-go="add"><span class="ti" aria-hidden="true">↓</span>Add money</button>' +
        '<button class="tile" type="button" data-go="send"><span class="ti" aria-hidden="true">→</span>Send</button>' +
        '<button class="tile" type="button" data-go="plans"><span class="ti" aria-hidden="true">◎</span>Plans</button>' +
      '</div>' +
      '<div class="sect-head"><b>Savings</b><button class="linklike" type="button" data-nav="plans">View all</button></div>' +
      '<button class="plan-card-btn" type="button" data-plan="rent">' +
        '<div class="ap-plan">' +
          '<div class="head"><b>' + esc(rent.name) + ' · ' + esc(rent.kind) + '</b><span class="ap-status pending">Locked</span></div>' +
          '<div class="goal-line"><span class="amt">' + money(rent.amount) + '</span><span class="ap-help">' + pct(rent.amount, rent.goal) + '% of ' + money(rent.goal) + '</span></div>' +
          '<div class="ap-progress"><i style="width:' + pct(rent.amount, rent.goal) + '%"></i></div>' +
        '</div>' +
      '</button>' +
      '<div class="sect-head"><b>Recent activity</b><button class="linklike" type="button" data-nav="activity">View all</button></div>' +
      '<div class="ap-card" style="padding:2px 14px">' + S.txs.slice(0, 3).map(txRow).join('') + '</div>' +
    '</div>';
  }

  function txRow(tx) {
    const symbol = tx.dir === 'in' ? '↓' : '↑';
    const colour = tx.dir === 'in' ? 'var(--green-700)' : 'var(--ink-900)';
    return '<button class="ap-row" type="button" data-tx="' + tx.id + '" style="width:100%;background:none;border:0;border-bottom:1px solid var(--line);text-align:left;cursor:pointer">' +
      '<span class="ico" aria-hidden="true">' + symbol + '</span>' +
      '<span class="who"><b>' + esc(tx.title) + '</b><span>' + esc(tx.sub) + '</span></span>' +
      '<span class="amt" style="color:' + colour + '">' + (tx.amount < 0 ? '−' : '+') + money(Math.abs(tx.amount)) + '<small>Completed</small></span>' +
    '</button>';
  }

  function screenWallet() {
    const rows = S.txs.map(txRow).join('');
    return '<div class="body" style="padding-top:4px">' +
      topbar('Wallet', 'Move money in and out', '<button class="ap-iconbtn" type="button" data-action="alerts" aria-label="Alerts">◔</button>') +
      '<div class="ap-balance">' +
        '<span class="tiny">Available to move</span>' +
        '<div class="big">' + money(S.wallet) + '</div>' +
        '<span class="sub">NGN · settled · <button class="linklike" type="button" data-action="usdInfo" style="color:#bcd0ff">USD ' + usd(S.usd) + '</button></span>' +
        '<div class="row">' +
          '<button class="ap-btn" type="button" data-go="add">Add money</button>' +
          '<button class="ap-btn" type="button" data-go="withdraw">Withdraw</button>' +
        '</div>' +
      '</div>' +
      '<div class="tile-row">' +
        '<button class="tile" type="button" data-go="send"><span class="ti" aria-hidden="true">→</span>Send</button>' +
        '<button class="tile" type="button" data-go="plans"><span class="ti" aria-hidden="true">◎</span>Open plan</button>' +
        '<button class="tile" type="button" data-go="invest"><span class="ti" aria-hidden="true">◔</span>Invest</button>' +
      '</div>' +
      '<div class="sect-head"><b>Activity</b><span class="ap-help">Every entry has a receipt</span></div>' +
      '<div class="ap-card" style="padding:2px 14px">' + rows + '</div>' +
    '</div>';
  }

  function screenAdd() {
    const d = S.draft.add;
    return '<div class="body" style="padding-top:4px">' +
      topbar('Add money', 'Fund your wallet. Demo funds settle instantly.', '', true) +
      amountInput('add-amount', d.amount, 'add') +
      '<div class="ap-chip-row">' +
        presetChip('add', '5000') + presetChip('add', '25000') + presetChip('add', '50000') +
        '<button class="ap-chip" type="button" data-preset="add" data-value="100000">Max</button>' +
      '</div>' +
      '<div><span class="ap-help" style="display:block;margin-bottom:6px;font-weight:800">Pay from</span>' +
        '<button class="ap-card" type="button" data-action="method" data-method="bank" style="width:100%;display:flex;align-items:center;gap:10px;text-align:left;cursor:pointer;' + (d.method === 'bank' ? 'border-color:var(--blue-500);box-shadow:0 0 0 3px rgba(47,107,255,0.12)' : '') + '">' +
          '<span class="ico" style="width:34px;height:34px;border-radius:10px;background:var(--blue-50);display:grid;place-items:center;color:var(--blue-700)">⌂</span>' +
          '<span style="flex:1"><b style="display:block;font-size:12.5px">GTBank · 6789</b><span class="ap-help">Ada Obi · linked bank</span></span>' +
          (d.method === 'bank' ? '<span class="ap-status">Selected</span>' : '') +
        '</button>' +
        '<button class="ap-card" type="button" data-action="method" data-method="card" style="width:100%;display:flex;align-items:center;gap:10px;text-align:left;cursor:pointer;margin-top:8px;' + (d.method === 'card' ? 'border-color:var(--blue-500);box-shadow:0 0 0 3px rgba(47,107,255,0.12)' : '') + '">' +
          '<span class="ico" style="width:34px;height:34px;border-radius:10px;background:var(--surface);display:grid;place-items:center">▭</span>' +
          '<span style="flex:1"><b style="display:block;font-size:12.5px">Card</b><span class="ap-help">Paystack sandbox · test card</span></span>' +
          (d.method === 'card' ? '<span class="ap-status">Selected</span>' : '') +
        '</button>' +
      '</div>' +
      '<div class="ap-kv"><span>Fee</span><b>₦0.00</b></div>' +
      '<div class="ap-kv"><span>New wallet balance</span><b>' + (toKobo(d.amount) ? money(S.wallet + toKobo(d.amount)) : '—') + '</b></div>' +
      '<button class="ap-btn primary block" type="button" data-action="review" data-kind="add">Review deposit</button>' +
      '<p class="ap-help" style="text-align:center">The receipt appears after the ledger entry is written.</p>' +
    '</div>';
  }

  function presetChip(kind, value) {
    const d = S.draft[kind];
    const active = d && String(d.amount || '').replace(/[^0-9]/g, '') === value;
    return '<button class="ap-chip" type="button" data-preset="' + kind + '" data-value="' + value + '"' + (active ? ' aria-pressed="true"' : '') + '>' + money(Number(value) * 100) + '</button>';
  }

  function screenWithdraw() {
    const d = S.draft.withdraw;
    return '<div class="body" style="padding-top:4px">' +
      topbar('Withdraw to bank', 'The amount you enter is the amount that leaves your wallet.', '', true) +
      '<div class="ap-help" style="display:flex;justify-content:space-between"><span>Available ' + money(S.wallet) + '</span><button class="linklike" type="button" data-action="useMax">Use max</button></div>' +
      amountInput('withdraw-amount', d.amount, 'withdraw') +
      '<div class="ap-chip-row">' + presetChip('withdraw', '5000') + presetChip('withdraw', '20000') + presetChip('withdraw', '50000') + '</div>' +
      '<div><span class="ap-help" style="display:block;margin-bottom:6px;font-weight:800">Destination</span>' +
        '<div class="ap-card" style="display:flex;align-items:center;gap:10px">' +
          '<span class="ico" style="width:34px;height:34px;border-radius:10px;background:var(--blue-50);display:grid;place-items:center;color:var(--blue-700)">⌂</span>' +
          '<span style="flex:1"><b style="display:block;font-size:12.5px">GTBank · 0123456789</b><span class="ap-help">Ada Obi · verified</span></span>' +
          '<span class="ap-status">Saved</span>' +
        '</div>' +
        '<p class="ap-help" style="margin-top:6px">Demo withdrawal debits the ledger. Real payouts need a licensed rails partner.</p>' +
      '</div>' +
      '<button class="ap-btn primary block" type="button" data-action="review" data-kind="withdraw">Review withdrawal</button>' +
      '<button class="ap-btn ghost block" type="button" data-action="tryOverdraw">Try an over-balance amount</button>' +
    '</div>';
  }

  function screenSend() {
    const d = S.draft.send;
    return '<div class="body" style="padding-top:4px">' +
      topbar('Send money', 'Money leaves your wallet instantly. No fee in this demo.', '', true) +
      '<div class="tile-row" style="grid-template-columns:1fr 1fr">' +
        '<button class="tile" type="button" data-action="pickContact" data-name="Ada Obi" data-phone="+234 803 555 0147"><span class="ti" aria-hidden="true">AO</span>Ada Obi</button>' +
        '<button class="tile" type="button" data-action="pickContact" data-name="Tunde Bello" data-phone="+234 809 555 7788"><span class="ti" aria-hidden="true">TB</span>Tunde Bello</button>' +
      '</div>' +
      field('Recipient phone',
        '<input class="ap-input" id="send-to" type="tel" inputmode="tel" placeholder="+234 800 000 0000" value="' + esc(d.phone) + '" aria-label="Recipient phone" />') +
      field('Amount',
        '<input class="ap-input" id="send-amount" inputmode="decimal" placeholder="0.00" value="' + esc(d.amount) + '" data-amount="send" aria-label="Amount in naira" />') +
      field('Note (optional)',
        '<input class="ap-input" id="send-note" placeholder="What is it for?" maxlength="60" value="' + esc(d.note) + '" aria-label="Note" />') +
      '<div class="ap-help" style="display:flex;justify-content:space-between"><span>Available ' + money(S.wallet) + '</span></div>' +
      '<button class="ap-btn primary block" type="button" data-action="review" data-kind="send">Review transfer</button>' +
    '</div>';
  }

  function screenPlans() {
    const f = S.planFilter;
    const list = S.plans.filter(function (p) { return f === 'All' || p.kind === f || (f === 'Flexible' && p.kind === 'Target'); });
    return '<div class="body" style="padding-top:4px">' +
      topbar('Savings', 'Flexible, fixed and target plans', '<button class="ap-iconbtn" type="button" data-go="planNew" aria-label="New plan">＋</button>') +
      '<div class="ap-seg">' + ['All', 'Fixed', 'Flexible'].map(function (x) {
        return '<button type="button" data-planfilter="' + x + '" aria-pressed="' + (f === x) + '">' + x + '</button>';
      }).join('') + '</div>' +
      list.map(function (p) {
        return '<button class="plan-card-btn" type="button" data-plan="' + p.id + '"><div class="ap-plan">' +
          '<div class="head"><b>' + esc(p.name) + ' · ' + esc(p.kind) + '</b>' +
            (p.locked ? '<span class="ap-status pending">Locked</span>' : '<span class="ap-status">Active</span>') + '</div>' +
          '<div class="goal-line"><span class="amt">' + money(p.amount) + '</span><span class="ap-help">' + pct(p.amount, p.goal) + '% of ' + money(p.goal) + '</span></div>' +
          '<div class="ap-progress"><i style="width:' + pct(p.amount, p.goal) + '%"></i></div>' +
          '<span class="ap-help">' + (p.locked ? 'Matures ' + esc(p.maturity) : 'Withdraw anytime') + '</span>' +
        '</div></button>';
      }).join('') +
      '<button class="ap-btn primary block" type="button" data-go="planNew">＋ New plan</button>' +
    '</div>';
  }

  function screenPlan() {
    const p = planById(S.selectedPlan);
    if (!p) return screenPlans();
    return '<div class="body" style="padding-top:4px">' +
      topbar(p.name + ' plan', p.kind + ' · ' + (p.locked ? 'Locked until ' + p.maturity : 'Withdraw anytime'), '', true) +
      '<div class="ap-balance" style="padding:18px">' +
        '<span class="tiny">Plan balance</span>' +
        '<div class="big" style="font-size:30px">' + money(p.amount) + '</div>' +
        '<span class="sub">' + pct(p.amount, p.goal) + '% of ' + money(p.goal) + ' goal</span>' +
        '<div class="ap-progress" style="margin-top:12px;background:rgba(255,255,255,0.18)"><i style="width:' + pct(p.amount, p.goal) + '%"></i></div>' +
      '</div>' +
      '<div class="ap-card">' +
        '<div class="ap-kv"><span>Wallet</span><b>' + money(S.wallet) + '</b></div>' +
        '<div class="ap-kv"><span>Rule</span><b>' + (p.locked ? 'Locked until ' + esc(p.maturity) : 'Withdraw anytime') + '</b></div>' +
        '<div class="ap-kv"><span>Kind</span><b>' + esc(p.kind) + '</b></div>' +
      '</div>' +
      '<button class="ap-btn primary block" type="button" data-action="planWithdraw"' + (p.locked ? ' disabled' : '') + '>Withdraw from plan</button>' +
      (p.locked ? '<p class="ap-help" style="text-align:center">This plan is locked until ' + esc(p.maturity) + '. Add to it any time.</p>' : '') +
      '<button class="ap-btn ghost block" type="button" data-action="planAdd">Add to plan</button>' +
    '</div>';
  }

  function screenPlanNew() {
    const d = S.draft.planNew;
    return '<div class="body" style="padding-top:4px">' +
      topbar('New plan', 'Give the money a job and a deadline.', '', true) +
      field('Plan name', '<input class="ap-input" id="plan-name" maxlength="24" placeholder="Rent, travel, laptop…" value="' + esc(d.name) + '" aria-label="Plan name" />') +
      '<div class="ap-seg">' + ['Fixed', 'Flexible'].map(function (k) {
        return '<button type="button" data-plankind="' + k + '" aria-pressed="' + (d.kind === k) + '">' + k + '</button>';
      }).join('') + '</div>' +
      (d.kind === 'Fixed' ? '<div class="ap-banner" style="background:var(--amber-100);color:var(--amber-700)"><span aria-hidden="true">!</span><span>Fixed plans stay locked until maturity (31 Dec 2026 in this demo). Choose Flexible to withdraw anytime.</span></div>' : '') +
      field('Starting amount', '<input class="ap-input" id="plan-amount" inputmode="decimal" placeholder="0.00" value="' + esc(d.amount) + '" data-amount="planNew" aria-label="Starting amount in naira" />') +
      '<div class="ap-kv"><span>Available</span><b>' + money(S.wallet) + '</b></div>' +
      '<button class="ap-btn primary block" type="button" data-action="review" data-kind="planNew">Review plan</button>' +
    '</div>';
  }

  function screenInvest() {
    const sym = S.selectedSymbol;
    const q = QUOTES[sym];
    const d = S.draft.invest;
    const amount = toKobo(d.amount) || 0;
    const units = amount / q.price;
    const holding = S.holdings.filter(function (h) { return h.symbol === sym; })[0];
    const cashAfter = d.side === 'Buy' ? S.wallet - amount : S.wallet + amount;
    const quoteRows = Object.keys(QUOTES).map(function (key) {
      const item = QUOTES[key];
      return '<div class="quote-row"><button type="button" data-quote="' + key + '">' +
        '<span class="ico" style="width:32px;height:32px;border-radius:10px;background:var(--blue-50);color:var(--blue-700);display:grid;place-items:center;font-weight:900;font-size:12px">' + key.charAt(0) + '</span>' +
        '<span class="who" style="flex:1"><b style="display:block;font-size:12.5px">' + key + (key === sym ? ' · selected' : '') + '</b><span class="ap-help">' + esc(item.name) + ' · ' + item.market + '</span></span>' +
        '<span style="text-align:right"><b style="display:block;font-size:12px">' + (item.cur === 'USD' ? usd(item.price) : money(item.price)) + '</b><small class="ap-help" style="color:' + (item.up ? 'var(--green-700)' : 'var(--red-600)') + '">' + item.change + '</small></span>' +
      '</button></div>';
    }).join('');

    return '<div class="body" style="padding-top:4px">' +
      topbar('Invest', 'Nigerian and US shares', '', false) +
      '<div class="ap-card" style="padding:8px 14px">' + quoteRows + '</div>' +
      (q.cur === 'USD'
        ? '<div class="ap-banner"><span aria-hidden="true">!</span><span>' + sym + ' trades in USD. This demo ticket keeps NGN symbols only.</span></div>'
        : '<div class="ap-plan">' +
            '<div class="head"><b>' + sym + ' · ' + esc(q.name) + '</b><span class="ap-status ' + (q.up ? '' : 'failed') + '">' + q.change + ' today</span></div>' +
            '<div class="goal-line"><span class="amt">' + money(q.price) + '</span><span class="ap-help">per unit · quote refreshes</span></div>' +
            '<div class="ap-seg">' + ['Buy', 'Sell'].map(function (side) {
              return '<button type="button" data-side="' + side + '" aria-pressed="' + (d.side === side) + '">' + side + '</button>';
            }).join('') + '</div>' +
            '<div class="ap-amount" style="padding-bottom:8px"><span class="cur" style="font-size:16px">₦</span>' +
              '<input id="invest-amount" inputmode="decimal" placeholder="0.00" aria-label="Amount in naira" value="' + esc(d.amount) + '" data-amount="invest" style="font-size:30px" /></div>' +
            '<div class="ap-kv"><span>' + (d.side === 'Buy' ? 'Units you get' : 'Units you sell') + '</span><b id="invest-units">' + units.toFixed(2) + '</b></div>' +
            '<div class="ap-kv"><span>Cash after</span><b id="invest-cash">' + money(Math.max(0, cashAfter)) + '</b></div>' +
            (holding ? '<div class="ap-kv"><span>You hold</span><b>' + holding.units.toFixed(2) + ' units</b></div>' : '') +
            '<button class="ap-btn primary block" type="button" data-action="review" data-kind="invest">Review ' + d.side.toLowerCase() + '</button>' +
            '<p class="ap-help" style="text-align:center">Estimates use the last quote; the review shows the exact cost.</p>' +
          '</div>') +
      '<div class="sect-head" style="margin-top:4px"><b>Your holdings</b><span class="ap-help">Market value</span></div>' +
      '<div class="ap-card" style="padding:2px 14px">' +
        S.holdings.map(function (h) {
          const info = QUOTES[h.symbol];
          return '<div class="ap-row"><span class="ico">' + h.symbol.charAt(0) + '</span>' +
            '<span class="who"><b>' + h.symbol + '</b><span>' + h.units.toFixed(2) + ' units · avg ' + (info.cur === 'USD' ? usd(h.avg) : money(h.avg)) + '</span></span>' +
            '<span class="amt">' + (info.cur === 'USD' ? usd(h.units * info.price) : money(Math.round(h.units * info.price))) + '</span></div>';
        }).join('') +
      '</div>' +
    '</div>';
  }

  function screenActivity() {
    const f = S.activityFilter;
    const list = S.txs.filter(function (t) { return f === 'All' || (f === 'In' && t.dir === 'in') || (f === 'Out' && t.dir === 'out'); });
    return '<div class="body" style="padding-top:4px">' +
      topbar('Activity', 'Every movement and its receipt', '', false) +
      '<div class="ap-seg">' + ['All', 'In', 'Out'].map(function (x) {
        return '<button type="button" data-filter="' + x + '" aria-pressed="' + (f === x) + '">' + x + '</button>';
      }).join('') + '</div>' +
      (list.length
        ? '<div class="ap-card" style="padding:2px 14px">' + list.map(txRow).join('') + '</div>'
        : '<div class="ap-card"><div class="ap-empty"><span class="art" aria-hidden="true">◎</span><b>Nothing here yet</b><p>Deposits, sends and plan moves will appear with their receipts.</p><button class="ap-btn sm primary mt-1" type="button" data-go="add">Add money</button></div></div>') +
      '<p class="ap-help" style="text-align:center">Tap any entry to see its reference and status.</p>' +
    '</div>';
  }

  function screenProfile() {
    return '<div class="body" style="padding-top:4px">' +
      topbar('Profile', 'Your account and preferences', '', true) +
      '<div class="profile-hero"><span class="ap-avatar">AO</span><span><b>Ada Obi</b><span>+234 803 555 0147 · Verified Tier 2</span></span></div>' +
      '<div class="menu-list">' +
        '<button class="menu-item" type="button" data-action="profileInfo" data-what="Account details"><span class="mi">▤</span>Account details<span class="mv">›</span></button>' +
        '<button class="menu-item" type="button" data-action="profileInfo" data-what="Security"><span class="mi">⛨</span>Security<span class="mv">›</span></button>' +
        '<button class="menu-item" type="button" data-action="toggleTheme"><span class="mi">◐</span>Appearance<span class="mv" data-theme-label>Light</span></button>' +
        '<button class="menu-item" type="button" data-action="profileInfo" data-what="Support"><span class="mi">✆</span>Support<span class="mv">›</span></button>' +
        '<button class="menu-item" type="button" data-action="signout"><span class="mi" style="background:var(--red-50);color:var(--red-600)">↩</span>Sign out<span class="mv">›</span></button>' +
      '</div>' +
      '<p class="ap-help" style="text-align:center">Sessions last 30 days. Money actions always post to the ledger.</p>' +
    '</div>';
  }

  function screenReceipt() {
    const r = S.receipt;
    if (!r) return screenHome();
    return '<div class="body" style="padding-top:12px">' +
      '<div class="ap-success-mark" aria-hidden="true">✓</div>' +
      '<div class="hero-amt"><h1 style="font-size:21px;letter-spacing:-0.02em">' + esc(r.title) + '</h1><span class="sub">' + esc(r.sub || 'Your wallet is updated.') + '</span></div>' +
      '<div class="hero-amt"><div class="big">' + money(r.balanceAfter) + '</div><span class="sub">New wallet balance</span></div>' +
      '<div class="ap-card">' +
        '<div class="ap-kv"><span>Amount</span><b>' + (r.amount < 0 ? '−' : '+') + money(Math.abs(r.amount)) + '</b></div>' +
        r.rows.map(function (row) { return '<div class="ap-kv"><span>' + esc(row.k) + '</span><b>' + esc(row.v) + '</b></div>'; }).join('') +
        '<div class="ap-kv"><span>When</span><b>' + esc(r.when) + '</b></div>' +
      '</div>' +
      '<div class="ap-ref"><span>' + esc(r.ref) + '</span><button type="button" data-copy="' + esc(r.ref) + '">Copy</button></div>' +
      '<button class="ap-btn primary block" type="button" data-action="receiptDone">Done</button>' +
      '<div style="display:flex;gap:8px">' +
        (r.kind === 'add' ? '<button class="ap-btn ghost" style="flex:1" type="button" data-action="addAgain">Add again</button>' : '') +
        '<button class="ap-btn ghost" style="flex:1" type="button" data-nav="activity">View activity</button>' +
      '</div>' +
    '</div>';
  }

  /* ---------- sheets ---------- */

  function sheetHtml() {
    const s = S.sheet;
    if (!s) return '';
    let inner = '';
    let label = s.title;
    if (s.type === 'review') {
      inner = '<div class="ap-card" style="background:var(--surface-soft)">' +
        '<div class="ap-kv"><span>Amount</span><b>' + money(s.amount) + '</b></div>' +
        s.rows.map(function (row) { return '<div class="ap-kv"><span>' + esc(row.k) + '</span><b>' + esc(row.v) + '</b></div>'; }).join('') +
        (s.after ? '<div class="ap-kv" style="border-top:1px solid var(--line);padding-top:8px;margin-top:4px"><span>' + esc(s.after.k) + '</span><b>' + esc(s.after.v) + '</b></div>' : '') +
        '</div>' +
        (s.error ? '<div class="ap-help error" style="margin-top:10px" role="alert">' + esc(s.error) + '</div>' : '') +
        '<button class="ap-btn primary block mt-2" type="button" data-action="confirm"' + (S.busy ? ' disabled aria-busy="true"' : '') + '>' +
          (S.busy ? '<span class="ap-spinner"></span> ' + esc(s.busyLabel || 'Sending…') : esc(s.confirmLabel)) + '</button>' +
        (S.busy && S.busyHint ? '<div class="sheet-note"><span class="ap-spinner" aria-hidden="true"></span> Talking to the ledger…</div>' : '') +
        '<button class="ap-btn ghost block mt-1" type="button" data-action="closeSheet"' + (S.busy ? ' disabled' : '') + '>Cancel</button>';
    } else if (s.type === 'planTxn') {
      inner = '<p class="ap-help">' + (s.mode === 'add' ? 'Move money from your wallet into this plan.' : 'Money returns to your wallet instantly.') + '</p>' +
        '<div class="ap-amount" style="margin-top:8px"><span class="cur">₦</span><input id="plantxn-amount" inputmode="decimal" placeholder="0.00" aria-label="Amount in naira" value="' + esc(S.draft.planTxn.amount) + '" data-amount="planTxn" data-enter="planTxn" /></div>' +
        '<div class="ap-chip-row" style="margin-top:8px"><button class="ap-chip" type="button" data-planPreset="1000">₦1,000</button><button class="ap-chip" type="button" data-planPreset="5000">₦5,000</button><button class="ap-chip" type="button" data-planPreset="10000">₦10,000</button></div>' +
        '<div class="ap-help" style="margin-top:8px">' + (s.mode === 'add' ? 'Wallet available ' + money(S.wallet) : 'Plan balance ' + money(s.plan.amount)) + '</div>' +
        (s.error ? '<div class="ap-help error" style="margin-top:8px" role="alert">' + esc(s.error) + '</div>' : '') +
        '<button class="ap-btn primary block mt-2" type="button" data-action="confirmPlanTxn"' + (S.busy ? ' disabled aria-busy="true"' : '') + '>' +
          (S.busy ? '<span class="ap-spinner"></span> ' + esc(s.busyLabel || 'Sending…') : (s.mode === 'add' ? 'Add to plan' : 'Withdraw to wallet')) + '</button>' +
        (S.busy && S.busyHint ? '<div class="sheet-note"><span class="ap-spinner" aria-hidden="true"></span> Talking to the ledger…</div>' : '') +
        '<button class="ap-btn ghost block mt-1" type="button" data-action="closeSheet"' + (S.busy ? ' disabled' : '') + '>Cancel</button>';
    } else if (s.type === 'tx') {
      const t = s.tx;
      inner = '<div class="hero-amt"><div class="big" style="font-size:28px">' + (t.amount < 0 ? '−' : '+') + money(Math.abs(t.amount)) + '</div><span class="sub">' + esc(t.title) + '</span></div>' +
        '<div class="ap-card" style="background:var(--surface-soft);margin-top:10px">' +
          '<div class="ap-kv"><span>Status</span><b>Completed</b></div>' +
          '<div class="ap-kv"><span>When</span><b>' + esc(t.when) + '</b></div>' +
          (t.detail ? '<div class="ap-kv"><span>Details</span><b>' + esc(t.detail) + '</b></div>' : '') +
        '</div>' +
        '<div class="ap-ref" style="margin-top:10px"><span>' + esc(t.ref) + '</span><button type="button" data-copy="' + esc(t.ref) + '">Copy</button></div>' +
        '<button class="ap-btn primary block mt-2" type="button" data-action="closeSheet">Done</button>';
    }
    return '<div class="sheet-wrap">' +
      '<button class="dim" type="button" data-action="closeSheet" aria-label="Close dialog" tabindex="-1"></button>' +
      '<div class="ap-sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title">' +
        '<div class="grab" aria-hidden="true"></div>' +
        '<div class="sheet-head"><div><h3 id="sheet-title" tabindex="-1">' + esc(label) + '</h3>' +
          (s.sub ? '<span class="ap-help">' + esc(s.sub) + '</span>' : '') + '</div>' +
          '<button class="sheet-close" type="button" data-action="closeSheet" aria-label="Close">✕</button></div>' +
        inner +
      '</div>' +
    '</div>';
  }

  /* ---------- render ---------- */

  function bodyFor(screen) {
    switch (screen) {
      case 'splash': return screenSplash();
      case 'phone': return screenPhone();
      case 'code': return screenCode();
      case 'home': return screenHome();
      case 'wallet': return screenWallet();
      case 'add': return screenAdd();
      case 'withdraw': return screenWithdraw();
      case 'send': return screenSend();
      case 'plans': return screenPlans();
      case 'plan': return screenPlan();
      case 'planNew': return screenPlanNew();
      case 'invest': return screenInvest();
      case 'activity': return screenActivity();
      case 'profile': return screenProfile();
      case 'receipt': return screenReceipt();
      default: return screenHome();
    }
  }

  const TAB_SCREENS = ['home', 'wallet', 'plans', 'invest', 'activity'];

  function render() {
    const showNav = S.authed && TAB_SCREENS.indexOf(S.screen) !== -1 && !S.sheet;
    const content = statusbar() +
      (S.banner ? '' : '') +
      '<div class="screen-scroll">' + banner() + '<div class="proto-screen">' + bodyFor(S.screen) + '</div></div>' +
      (showNav ? nav(S.screen) : '') +
      toast() +
      sheetHtml();

    screenEl.innerHTML = content;

    const themeLabel = document.querySelector('[data-theme-label]');
    if (themeLabel) themeLabel.textContent = document.documentElement.dataset.theme === 'dark' ? 'Dark' : 'Light';

    const focusKey = S.screen + '|' + (S.sheet ? S.sheet.type + (S.sheet.mode || '') : '');
    if (focusKey !== lastFocusKey) {
      lastFocusKey = focusKey;
      clearTimeout(focusTimer);
      focusTimer = setTimeout(function () {
        const target = S.sheet
          ? document.getElementById('sheet-title')
          : screenEl.querySelector('h1, .ap-topbar b');
        if (target) {
          target.setAttribute('tabindex', '-1');
          target.focus({ preventScroll: true });
        }
        const scroll = screenEl.querySelector('.screen-scroll');
        if (scroll && !S.sheet) scroll.scrollTop = 0;
      }, 30);
    }
  }

  /* ---------- navigation ---------- */

  function go(screen) {
    if (S.screen === screen) return;
    history.push(S.screen);
    S.screen = screen;
    S.errors = {};
    S.busy = false;
    S.busyHint = false;
    S.sheet = null;
    render();
  }

  function back() {
    const prev = history.pop();
    S.screen = prev || (S.authed ? 'home' : 'splash');
    S.sheet = null;
    S.errors = {};
    S.busy = false;
    S.busyHint = false;
    render();
  }

  /* ---------- auth ---------- */

  function signin() {
    if (S.busy) return;
    const input = document.getElementById('phone');
    const value = input ? input.value.trim() : S.auth.phone;
    S.auth.phone = value;
    const digits = value.replace(/[^0-9]/g, '');
    if (digits.length < 10) {
      S.errors.phone = 'Enter a valid phone number, including the country code.';
      render();
      return;
    }
    S.errors = {};
    if (S.offline) {
      S.errors.phone = 'Could not reach the Apex server. Check your connection and try again.';
      setToast('Could not reach the Apex server.', 'error');
      return;
    }
    S.busy = true;
    log('Requested code for ' + value);
    render();
    setTimeout(function () {
      S.busy = false;
      S.screen = 'code';
      history.push('phone');
      setToast('Code sent to ' + value);
      render();
    }, S.offline ? 900 : 700);
  }

  function verify() {
    if (S.busy) return;
    const input = document.getElementById('code');
    const code = input ? input.value.trim() : S.auth.code;
    S.auth.code = code;
    if (S.offline) {
      S.errors.code = 'Could not reach the Apex server. Check your connection and try again.';
      setToast('Could not reach the Apex server.', 'error');
      render();
      return;
    }
    if (code !== '123456') {
      S.errors.code = 'That code is incorrect or has expired. Try again.';
      S.auth.code = '';
      render();
      return;
    }
    S.errors = {};
    S.busy = true;
    render();
    setTimeout(function () {
      S.busy = false;
      S.authed = true;
      history = [];
      S.screen = 'home';
      log('Signed in as +234 803 555 0147');
      setToast('Signed in as Ada');
      render();
    }, 850);
  }

  /* ---------- writes ---------- */

  function numberFrom(id) {
    const el = document.getElementById(id);
    return el ? el.value : null;
  }

  function currentDraftAmounts() {
    const add = document.getElementById('add-amount');
    const wd = document.getElementById('withdraw-amount');
    const sendAmt = document.getElementById('send-amount');
    const sendTo = document.getElementById('send-to');
    const sendNote = document.getElementById('send-note');
    const pnName = document.getElementById('plan-name');
    const pnAmt = document.getElementById('plan-amount');
    if (add) S.draft.add.amount = add.value;
    if (wd) S.draft.withdraw.amount = wd.value;
    if (sendAmt) S.draft.send.amount = sendAmt.value;
    if (sendTo) S.draft.send.phone = sendTo.value;
    if (sendNote) S.draft.send.note = sendNote.value;
    if (pnName) S.draft.planNew.name = pnName.value;
    if (pnAmt) S.draft.planNew.amount = pnAmt.value;
  }

  function review(kind) {
    currentDraftAmounts();
    let amount = 0;
    let rows = [];
    let payload = {};
    const draft = S.draft;

    if (kind === 'add') {
      amount = toKobo(draft.add.amount);
      if (!amount) { setToast('Enter an amount to add.', 'error'); return; }
      rows = [
        { k: 'From', v: draft.add.method === 'card' ? 'Card · Paystack sandbox' : 'GTBank · 6789' },
        { k: 'To', v: 'NGN wallet' },
        { k: 'Fee', v: '₦0.00' }
      ];
      payload = { amount: amount, method: draft.add.method };
    } else if (kind === 'withdraw') {
      amount = toKobo(draft.withdraw.amount);
      if (!amount) { setToast('Enter an amount to withdraw.', 'error'); return; }
      rows = [
        { k: 'To', v: 'GTBank · 0123456789' },
        { k: 'Name', v: 'Ada Obi' },
        { k: 'Fee', v: '₦0.00' }
      ];
      payload = { amount: amount };
    } else if (kind === 'send') {
      amount = toKobo(draft.send.amount);
      if (!amount) { setToast('Enter an amount to send.', 'error'); return; }
      if (!draft.send.phone || draft.send.phone.replace(/[^0-9]/g, '').length < 10) { setToast('Enter the recipient phone number.', 'error'); return; }
      rows = [
        { k: 'To', v: draft.send.phone },
        { k: 'Note', v: draft.send.note || '—' },
        { k: 'Fee', v: '₦0.00' }
      ];
      payload = { amount: amount, phone: draft.send.phone, note: draft.send.note };
    } else if (kind === 'planNew') {
      amount = toKobo(draft.planNew.amount);
      if (!draft.planNew.name.trim()) { setToast('Give the plan a name.', 'error'); return; }
      if (!amount) { setToast('Enter a starting amount.', 'error'); return; }
      rows = [
        { k: 'Plan', v: draft.planNew.name },
        { k: 'Kind', v: draft.planNew.kind },
        { k: 'Rule', v: draft.planNew.kind === 'Fixed' ? 'Locked until 31 Dec 2026' : 'Withdraw anytime' }
      ];
      payload = { amount: amount, name: draft.planNew.name, kind: draft.planNew.kind };
    } else if (kind === 'invest') {
      amount = toKobo(draft.invest.amount);
      if (!amount) { setToast('Enter an amount to invest.', 'error'); return; }
      const q = QUOTES[S.selectedSymbol];
      if (q.cur !== 'NGN') { setToast('This demo ticket trades NGN symbols only.', 'error'); return; }
      const units = amount / q.price;
      rows = [
        { k: 'Symbol', v: S.selectedSymbol },
        { k: 'Side', v: draft.invest.side },
        { k: 'Units', v: units.toFixed(2) },
        { k: 'Price', v: money(q.price) },
        { k: 'Fee', v: '₦0.00' }
      ];
      payload = { amount: amount, side: draft.invest.side, symbol: S.selectedSymbol, units: units };
    }

    S.sheet = {
      type: 'review', kind: kind,
      title: kind === 'add' ? 'Confirm deposit' : kind === 'withdraw' ? 'Confirm withdrawal' : kind === 'send' ? 'Confirm transfer' : kind === 'planNew' ? 'Open this plan' : 'Confirm trade',
      sub: kind === 'add' ? 'Funds are credited only after the ledger entry is written.' : 'Check the details before anything moves.',
      confirmLabel: kind === 'add' ? 'Confirm deposit' : kind === 'withdraw' ? 'Confirm withdrawal' : kind === 'send' ? 'Send money' : kind === 'planNew' ? 'Open plan' : 'Confirm trade',
      amount: amount, rows: rows, payload: payload, error: null,
      after: kind === 'invest'
        ? { k: 'Cash after', v: money(draft.invest.side === 'Buy' ? S.wallet - amount : S.wallet + amount) }
        : kind === 'add' ? { k: 'New wallet balance', v: money(S.wallet + amount) }
        : kind === 'planNew' ? { k: 'Wallet after', v: money(S.wallet - amount) }
        : { k: 'Wallet after', v: money(S.wallet - amount) }
    };
    render();
  }

  function confirmReview() {
    if (S.busy || !S.sheet) return;
    const sheet = S.sheet;
    const kind = sheet.kind;
    const p = sheet.payload;
    S.busy = true;
    S.busyHint = false;
    S.sheet.error = null;
    render();

    const hintTimer = setTimeout(function () {
      if (S.busy && S.sheet) { S.busyHint = true; render(); }
    }, 700);

    setTimeout(function () {
      clearTimeout(hintTimer);
      if (S.offline) {
        S.busy = false; S.busyHint = false;
        S.sheet.error = 'Could not reach the Apex server. Check your connection and try again.';
        S.banner = 'You are offline. Nothing was deducted.';
        setToast('Could not reach the Apex server.', 'error');
        log('Write refused: offline');
        render();
        return;
      }

      const failure = validate(kind, p);
      if (failure) {
        S.busy = false; S.busyHint = false;
        S.sheet.error = failure;
        log('Server refused: ' + failure);
        render();
        return;
      }

      S.busy = false; S.busyHint = false;
      S.banner = null;
      commit(kind, p);
      render();
    }, S.slow ? 2500 : 850);
  }

  function validate(kind, p) {
    if (kind === 'add') {
      if (p.amount < 10000) return 'The minimum deposit is ₦100.00.';
      if (p.amount > 1000000000) return 'The maximum deposit is ₦10,000,000.00.';
    }
    if (kind === 'withdraw' || kind === 'send' || kind === 'planNew') {
      if (p.amount > S.wallet) return 'Amount is more than your available wallet balance.';
    }
    if (kind === 'invest' && p.side === 'Buy' && p.amount > S.wallet) {
      return 'Amount is more than your available wallet balance.';
    }
    if (kind === 'invest' && p.side === 'Sell') {
      const q = QUOTES[p.symbol];
      const held = S.holdings.filter(function (h) { return h.symbol === p.symbol; })[0];
      const units = held ? held.units : 0;
      if (p.amount / q.price > units) return 'You do not hold enough ' + p.symbol + ' units to sell.';
    }
    return null;
  }

  function commit(kind, p) {
    S.sheet = null;
    if (kind === 'add') {
      S.wallet += p.amount;
      const reference = ref('DEP');
      addTx('Wallet funding', p.amount, 'in', reference, p.method === 'card' ? 'Card · Paystack sandbox' : 'GTBank · 6789');
      S.receipt = { kind: 'add', title: 'Money added', sub: 'Your wallet is updated.', amount: p.amount, balanceAfter: S.wallet, ref: reference, when: 'Today, ' + nowStamp(), rows: [{ k: 'From', v: p.method === 'card' ? 'Card · Paystack sandbox' : 'GTBank · 6789' }, { k: 'Fee', v: '₦0.00' }] };
      log('Deposit posted ' + reference);
    } else if (kind === 'withdraw') {
      S.wallet -= p.amount;
      const reference = ref('WDR');
      addTx('Withdrawal to GTBank', -p.amount, 'out', reference, 'GTBank · 0123456789');
      S.receipt = { kind: 'withdraw', title: 'Withdrawal sent', sub: 'The money has left your wallet.', amount: -p.amount, balanceAfter: S.wallet, ref: reference, when: 'Today, ' + nowStamp(), rows: [{ k: 'To', v: 'GTBank · 0123456789' }, { k: 'Fee', v: '₦0.00' }] };
      log('Withdrawal posted ' + reference);
    } else if (kind === 'send') {
      S.wallet -= p.amount;
      const reference = ref('TRF');
      addTx('Transfer to ' + p.phone, -p.amount, 'out', reference, p.note || 'Apex transfer');
      S.receipt = { kind: 'send', title: 'Money sent', sub: 'Your wallet is updated.', amount: -p.amount, balanceAfter: S.wallet, ref: reference, when: 'Today, ' + nowStamp(), rows: [{ k: 'To', v: p.phone }, { k: 'Note', v: p.note || '—' }, { k: 'Fee', v: '₦0.00' }] };
      log('Transfer posted ' + reference);
    } else if (kind === 'planNew') {
      S.wallet -= p.amount;
      const plan = {
        id: 'p' + Date.now(), name: p.name.trim(), kind: p.kind, amount: p.amount,
        goal: Math.max(p.amount * 2, p.amount + 1000000), locked: p.kind === 'Fixed', maturity: '31 Dec 2026'
      };
      S.plans.push(plan);
      S.selectedPlan = plan.id;
      const reference = ref('SAV');
      addTx(p.name + ' plan', -p.amount, 'out', reference, p.kind + ' plan opened');
      S.receipt = { kind: 'plan', title: 'Plan opened', sub: 'The money is set aside.', amount: -p.amount, balanceAfter: S.wallet, ref: reference, when: 'Today, ' + nowStamp(), rows: [{ k: 'Plan', v: p.name }, { k: 'Kind', v: p.kind }, { k: 'Rule', v: p.kind === 'Fixed' ? 'Locked until 31 Dec 2026' : 'Withdraw anytime' }] };
      log('Plan opened ' + reference);
      S.draft.planNew = { name: '', amount: '', kind: 'Fixed' };
    } else if (kind === 'invest') {
      const q = QUOTES[p.symbol];
      const held = S.holdings.filter(function (h) { return h.symbol === p.symbol; })[0];
      if (p.side === 'Buy') {
        S.wallet -= p.amount;
        if (held) held.units = Math.round((held.units + p.units) * 100) / 100;
        else S.holdings.push({ symbol: p.symbol, units: Math.round(p.units * 100) / 100, avg: q.price });
        const reference = ref('INV');
        addTx(p.symbol + ' · ' + p.units.toFixed(2) + ' units', -p.amount, 'out', reference, p.units.toFixed(2) + ' units at ' + money(q.price));
        S.receipt = { kind: 'invest', title: 'Shares bought', sub: 'Your position is updated.', amount: -p.amount, balanceAfter: S.wallet, ref: reference, when: 'Today, ' + nowStamp(), rows: [{ k: 'Symbol', v: p.symbol }, { k: 'Units', v: p.units.toFixed(2) }, { k: 'Price', v: money(q.price) }] };
        log('Buy posted ' + reference);
      } else {
        S.wallet += p.amount;
        if (held) held.units = Math.max(0, Math.round((held.units - p.units) * 100) / 100);
        const reference = ref('INV');
        addTx(p.symbol + ' · sell ' + p.units.toFixed(2) + ' units', p.amount, 'in', reference, p.units.toFixed(2) + ' units at ' + money(q.price));
        S.receipt = { kind: 'invest', title: 'Shares sold', sub: 'Proceeds are in your wallet.', amount: p.amount, balanceAfter: S.wallet, ref: reference, when: 'Today, ' + nowStamp(), rows: [{ k: 'Symbol', v: p.symbol }, { k: 'Units', v: p.units.toFixed(2) }, { k: 'Price', v: money(q.price) }] };
        log('Sell posted ' + reference);
      }
    }

    history = [];
    S.screen = 'receipt';
    setToast('Posted to the ledger');
  }

  function openPlanTxn(mode) {
    const plan = planById(S.selectedPlan);
    S.draft.planTxn = { amount: '' };
    S.sheet = { type: 'planTxn', mode: mode, plan: plan, title: mode === 'add' ? 'Add to ' + plan.name : 'Withdraw from ' + plan.name, sub: mode === 'add' ? 'Wallet → plan' : 'Plan → wallet', error: null };
    render();
  }

  function confirmPlanTxn() {
    if (S.busy || !S.sheet) return;
    const mode = S.sheet.mode;
    const plan = S.sheet.plan;
    const amount = toKobo(S.draft.planTxn.amount);
    if (!amount) { S.sheet.error = 'Enter an amount.'; render(); return; }
    S.busy = true;
    S.busyHint = false;
    render();
    setTimeout(function () {
      S.busy = false;
      S.busyHint = false;
      if (S.offline) {
        S.sheet.error = 'Could not reach the Apex server. Check your connection and try again.';
        S.banner = 'You are offline. Nothing was deducted.';
        log('Plan move refused: offline');
        render();
        return;
      }
      if (mode === 'add' && amount > S.wallet) {
        S.sheet.error = 'Amount is more than your available wallet balance.';
        render();
        return;
      }
      if (mode === 'withdraw' && amount > plan.amount) {
        S.sheet.error = 'Amount is more than this plan holds.';
        render();
        return;
      }
      if (mode === 'withdraw' && plan.locked) {
        S.sheet.error = 'This plan is locked until ' + plan.maturity + '.';
        render();
        return;
      }
      if (mode === 'add') {
        S.wallet -= amount;
        plan.amount += amount;
      } else {
        plan.amount -= amount;
        S.wallet += amount;
      }
      const reference = ref('SAV');
      addTx(plan.name + (mode === 'add' ? ' plan top-up' : ' plan withdrawal'), mode === 'add' ? -amount : amount, mode === 'add' ? 'out' : 'in', reference, mode === 'add' ? 'Wallet → plan' : 'Plan → wallet');
      S.sheet = null;
      S.banner = null;
      S.receipt = {
        kind: 'plan', title: mode === 'add' ? 'Plan topped up' : 'Plan withdrawal', sub: mode === 'add' ? 'Your plan balance is updated.' : 'The money is back in your wallet.',
        amount: mode === 'add' ? -amount : amount, balanceAfter: S.wallet, ref: reference, when: 'Today, ' + nowStamp(),
        rows: [{ k: 'Plan', v: plan.name }, { k: 'Plan balance', v: money(plan.amount) }, { k: 'Fee', v: '₦0.00' }]
      };
      history = [];
      S.screen = 'receipt';
      setToast('Posted to the ledger');
      log('Plan move posted ' + reference);
      render();
    }, S.slow ? 2200 : 800);
  }

  /* ---------- events ---------- */

  function syncSwitches() {
    document.querySelectorAll('[data-switch]').forEach(function (btn) {
      const key = btn.getAttribute('data-switch');
      btn.setAttribute('aria-checked', String(!!S[key]));
    });
    const themeSwitch = document.querySelector('[data-switch-theme]');
    if (themeSwitch) {
      const dark = document.documentElement.dataset.theme === 'dark';
      themeSwitch.setAttribute('aria-checked', String(dark));
      themeSwitch.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
    }
  }

  function reset() {
    S = fresh();
    history = [];
    lastFocusKey = '';
    if (logEl) logEl.innerHTML = '';
    log('Demo reset');
    render();
    syncSwitches();
  }

  screenEl.addEventListener('click', function (event) {
    const el = event.target.closest('[data-action], [data-go], [data-nav], [data-plan], [data-tx], [data-filter], [data-preset], [data-planfilter], [data-plankind], [data-side], [data-quote], [data-copy], [data-planPreset]');
    if (!el) return;
    const action = el.getAttribute('data-action');
    const goTo = el.getAttribute('data-go');
    const navTo = el.getAttribute('data-nav');

    if (goTo) {
      if (!S.authed && ['home', 'wallet', 'plans', 'invest', 'activity', 'profile', 'add', 'withdraw', 'send', 'plan', 'planNew', 'receipt'].indexOf(goTo) !== -1) {
        S.authed = true;
      }
      go(goTo);
      return;
    }
    if (navTo) {
      S.sheet = null;
      if (['home', 'wallet', 'plans', 'invest', 'activity'].indexOf(navTo) !== -1 && S.screen !== navTo) {
        history = [];
        S.screen = navTo;
        render();
      }
      return;
    }
    if (el.hasAttribute('data-plan')) {
      S.selectedPlan = el.getAttribute('data-plan');
      go('plan');
      return;
    }
    if (el.hasAttribute('data-tx')) {
      const tx = S.txs.filter(function (t) { return String(t.id) === el.getAttribute('data-tx'); })[0];
      if (tx) { S.sheet = { type: 'tx', tx: tx, title: 'Transaction' }; render(); }
      return;
    }
    if (el.hasAttribute('data-filter')) { S.activityFilter = el.getAttribute('data-filter'); render(); return; }
    if (el.hasAttribute('data-planfilter')) { S.planFilter = el.getAttribute('data-planfilter'); render(); return; }
    if (el.hasAttribute('data-side')) { S.draft.invest.side = el.getAttribute('data-side'); render(); return; }
    if (el.hasAttribute('data-quote')) {
      const sym = el.getAttribute('data-quote');
      S.selectedSymbol = sym;
      render();
      if (QUOTES[sym].cur === 'USD') setToast(sym + ' trades in USD — this demo ticket uses NGN.', 'error');
      else setToast(sym + ' selected');
      return;
    }
    if (el.hasAttribute('data-preset')) {
      const kind = el.getAttribute('data-preset');
      const value = el.getAttribute('data-value');
      S.draft[kind].amount = value;
      render();
      return;
    }
    if (el.hasAttribute('data-planPreset')) {
      S.draft.planTxn.amount = el.getAttribute('data-planPreset');
      render();
      return;
    }
    if (el.hasAttribute('data-plankind')) {
      S.draft.planNew.kind = el.getAttribute('data-plankind');
      currentDraftAmountsOfPlanNew();
      render();
      return;
    }
    if (el.hasAttribute('data-copy')) {
      const value = el.getAttribute('data-copy');
      const flash = function () {
        el.textContent = 'Copied';
        el.classList.add('copy-flash');
        setTimeout(function () { el.textContent = 'Copy'; el.classList.remove('copy-flash'); }, 1800);
      };
      let attempt = null;
      try { attempt = navigator.clipboard && navigator.clipboard.writeText(value); } catch (e) {}
      if (attempt && typeof attempt.then === 'function') attempt.then(flash, function () { setToast('Reference: ' + value); });
      else if (attempt) flash();
      else setToast('Reference: ' + value);
      return;
    }

    if (!action) return;
    if (action === 'start') { go('phone'); return; }
    if (action === 'signin') { signin(); return; }
    if (action === 'verify') { verify(); return; }
    if (action === 'resend') {
      if (S.offline) { setToast('Could not reach the Apex server.', 'error'); return; }
      setToast('A new code is on its way. Demo code: 123456');
      log('Resent code');
      return;
    }
    if (action === 'method') { S.draft.add.method = el.getAttribute('data-method'); render(); return; }
    if (action === 'pickContact') {
      S.draft.send.phone = el.getAttribute('data-phone');
      S.draft.send.to = el.getAttribute('data-name');
      render();
      return;
    }
    if (action === 'useMax') {
      S.draft.withdraw.amount = String(Math.floor(S.wallet / 100));
      render();
      return;
    }
    if (action === 'tryOverdraw') {
      S.draft.withdraw.amount = String(Math.floor((S.wallet + 500000) / 100));
      setToast('Amount set above the available balance — review to see the server refuse it.');
      render();
      return;
    }
    if (action === 'review') { review(el.getAttribute('data-kind')); return; }
    if (action === 'confirm') { confirmReview(); return; }
    if (action === 'confirmPlanTxn') { confirmPlanTxn(); return; }
    if (action === 'planWithdraw') { openPlanTxn('withdraw'); return; }
    if (action === 'planAdd') { openPlanTxn('add'); return; }
    if (action === 'closeSheet') {
      if (S.busy) return;
      S.sheet = null;
      render();
      return;
    }
    if (action === 'receiptDone') {
      history = [];
      S.screen = 'home';
      S.receipt = null;
      render();
      return;
    }
    if (action === 'addAgain') {
      S.draft.add.amount = '';
      go('add');
      return;
    }
    if (action === 'dismissToast') { S.toast = null; render(); return; }
    if (action === 'alerts') { setToast('No new alerts. Every movement has a receipt.'); return; }
    if (action === 'usdInfo') { setToast('USD wallet holds ' + usd(S.usd) + ' for US shares.'); return; }
    if (action === 'profileInfo') {
      const what = el.getAttribute('data-what');
      setToast(what + ' is a read-only demo in this prototype.');
      return;
    }
    if (action === 'toggleTheme') {
      const btn = document.querySelector('.kit-tools [data-theme-toggle]');
      if (btn) btn.click();
      render();
      syncSwitches();
      return;
    }
    if (action === 'signout') {
      S.authed = false;
      history = [];
      S.screen = 'splash';
      log('Signed out');
      render();
      return;
    }
    if (action === 'back') { back(); return; }
  });

  function currentDraftAmountsOfPlanNew() {
    const name = document.getElementById('plan-name');
    const amount = document.getElementById('plan-amount');
    if (name) S.draft.planNew.name = name.value;
    if (amount) S.draft.planNew.amount = amount.value;
  }

  screenEl.addEventListener('input', function (event) {
    const el = event.target;
    if (el.hasAttribute('data-amount')) {
      const kind = el.getAttribute('data-amount');
      if (kind === 'add') S.draft.add.amount = el.value;
      if (kind === 'withdraw') S.draft.withdraw.amount = el.value;
      if (kind === 'send') S.draft.send.amount = el.value;
      if (kind === 'planNew') S.draft.planNew.amount = el.value;
      if (kind === 'planTxn') S.draft.planTxn.amount = el.value;
      if (kind === 'invest') {
        S.draft.invest.amount = el.value;
        const amount = toKobo(el.value) || 0;
        const q = QUOTES[S.selectedSymbol];
        const units = amount / q.price;
        const unitsEl = document.getElementById('invest-units');
        const cashEl = document.getElementById('invest-cash');
        if (unitsEl) unitsEl.textContent = units.toFixed(2);
        if (cashEl) cashEl.textContent = money(Math.max(0, S.draft.invest.side === 'Buy' ? S.wallet - amount : S.wallet + amount));
      }
      return;
    }
    if (el.id === 'send-to') S.draft.send.phone = el.value;
    if (el.id === 'send-note') S.draft.send.note = el.value;
    if (el.id === 'plan-name') S.draft.planNew.name = el.value;
    if (el.id === 'phone') S.auth.phone = el.value;
    if (el.id === 'code') S.auth.code = el.value;
  });

  screenEl.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && S.sheet && !S.busy) {
      S.sheet = null;
      render();
      return;
    }
    if (event.key === 'Enter') {
      const el = event.target;
      if (el.hasAttribute && el.hasAttribute('data-enter')) {
        event.preventDefault();
        const kind = el.getAttribute('data-enter');
        if (kind === 'signin') signin();
        else if (kind === 'verify') verify();
        else if (kind === 'planTxn') confirmPlanTxn();
        else review(kind);
        return;
      }
    }
    if (event.key === 'Tab' && S.sheet) {
      const focusables = Array.prototype.slice.call(
        document.querySelectorAll('#screen .ap-sheet button:not([disabled]), #screen .ap-sheet input:not([disabled])')
      ).filter(function (n) { return n.offsetParent !== null; });
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });

  document.querySelectorAll('[data-switch]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const key = btn.getAttribute('data-switch');
      S[key] = !S[key];
      if (key === 'offline') {
        S.banner = S.offline ? 'You are offline. Money actions will be refused — nothing will be deducted.' : null;
        log(S.offline ? 'Offline simulation on' : 'Offline simulation off');
      }
      if (key === 'slow') log(S.slow ? 'Slow network simulation on' : 'Slow network simulation off');
      render();
      syncSwitches();
    });
  });

  const themeSwitch = document.querySelector('[data-switch-theme]');
  if (themeSwitch) {
    themeSwitch.addEventListener('click', function () {
      const btn = document.querySelector('.kit-tools [data-theme-toggle]');
      if (btn) btn.click();
      syncSwitches();
      render();
    });
  }

  document.addEventListener('apex:theme', function () {
    syncSwitches();
    render();
  });

  document.querySelectorAll('[data-reset]').forEach(function (el) {
    el.addEventListener('click', function (event) {
      event.preventDefault();
      reset();
    });
  });

  document.querySelectorAll('[data-jump]').forEach(function (el) {
    el.addEventListener('click', function (event) {
      event.preventDefault();
      const target = el.getAttribute('data-jump');
      if (target === 'splash') { S.authed = false; S.screen = 'splash'; history = []; }
      else { S.authed = true; S.screen = target; history = []; }
      S.sheet = null;
      S.busy = false;
      render();
    });
  });

  log('Prototype ready — try Add money, then turn Offline on and try again.');
  render();
  syncSwitches();
})();
