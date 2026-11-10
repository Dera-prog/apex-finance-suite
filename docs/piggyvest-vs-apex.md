# PiggyVest vs Apex Finance

**Observed:** 10 November 2026
**Method:** PiggyVest was inspected live on its public site and app entry points — home, login, sign-up, FAQ, savings calculator and stories — without an account. In-app rules attributed to PiggyVest below are quoted from PiggyVest's own FAQ pages. Apex is described from the live mobile and desktop builds and their source. Nothing here was purchased, deposited or traded.

> Apex Finance is a portfolio concept, not a licensed financial institution. Demo balances, rates and receipts are illustrative and do not represent real money or real returns.

---

## The short version

**PiggyVest is better at explaining savings.** Its schedule, limits, penalties and payout rules are written down per product, with numbers, and its public calculator turns a goal into a saving plan before you sign up. Its sign-in is also more complete: passkey, phone-or-email, forgot-password and stay-signed-in.

**Apex is better at being one place for money.** The home screen holds wallet, savings and invest together, with add money, withdraw, send and a stock portfolio in the same session, in a light or deep royal-blue dark theme. PiggyVest's public product range is savings and investments only.

**The gap that matters is disclosure, not features.** Apex already stores plan rate, target date, monthly auto-save, maturity and progress. It does not yet show the next debit, the interest earned so far, the payout at maturity, whether you are on track, or what leaving early costs — the four things PiggyVest documents best.

---

## 1. Authentication and onboarding

| | PiggyVest (observed) | Apex today | Gap |
|---|---|---|---|
| Sign-in options | Phone number, with a **Use Email** toggle, password with show/hide, **Sign in with Passkey**, **Stay signed in** | Phone number → demo code `123456` → PIN. **Passkey sign-in added** (create on first use, then one-tap sign-in) | Apex has no email identifier option; passkey is client-side demo only |
| Sign-up length | One field: first and last name. Copy: *"Start saving and investing in about two minutes."* | Name, email, phone → OTP → 6-digit PIN, all before the dashboard | **Progressive signup is the biggest onboarding gap** |
| Account recovery | Visible **Forgot Password?** link on login | No forgot-password or reset path; PIN and passkey live on the device | **Recovery is the biggest trust gap** |
| Theme | — | Full light/dark app theme; auth screens intentionally stay light | Deliberate Apex difference, keep it |
| Security messaging | *"Secured by 256 bits SSL security encryption"* — generic transport copy | Demo-boundary disclaimers, KYC tier sheet, device-local settings | Apex should replace generic claims with device/session controls messaging |

**What this means:** PiggyVest lets a curious user inside in two minutes and lets a returning user back in without a password. Apex asks for everything up front and offers no way back in if the device changes.

---

## 2. Savings schedules — where PiggyVest is clearest

PiggyVest publishes the mechanics of every savings product in its FAQ. Verified values:

| Product | Schedule / limit | Early-exit cost |
|---|---|---|
| **AutoSave** | Daily ₦50–₦200,000 · Weekly ₦800–₦1,000,000 · Monthly ₦3,000–₦5,000,000. Free bank debits. Top up anytime with QuickSave | — |
| **PiggyBank** | Free withdrawals only on fixed quarterly dates: 31 Mar, 30 Jun, 30 Sep, 31 Dec. Minimum withdrawal ₦3,000 | **3.5% of the withdrawal amount** outside free dates |
| **SafeLock** | 10–30 days **14% p.a.**, 31–60 **15%**, 61–90 **16%**, 91–180 **17%**, prorated for the duration set. Terms shown clearly before creation | Break before maturity: **all accrued interest is forfeited** |
| **Target Savings** | Personal or group goal; save toward a date | Break anytime: funds go to Flex wallet, **accrued interest lost + 1% processing fee** before maturity |
| **Flex Naira** | Withdraw free anytime; one withdrawal every 10 hours; minimum ₦2,000 | More than 4 bank withdrawals or 6 Pocket transfers in a month: **all interest for that month is lost** |
| **Investify** | Fixed-income investments; interest paid daily, monthly, quarterly or at the end of term | Exit early by selling units to other customers; **1–3% trade commission**, price set by you |

**Apex today:** each plan stores a rate, an opened date, a target or maturity date, an optional monthly auto-save amount, and a locked/withdraw-anytime flag. The Save screen shows a single annualised "Projected interest" figure for the whole portfolio.

**Missing on Apex:** next debit date, debit frequency and amount range, interest earned to date, payout at maturity, warning when a plan is behind schedule, and any stated cost for early exit. The plan sheet says "Locked until maturity" but does not say what leaving would cost.

---

## 3. Forecasts — PiggyVest's public calculator vs Apex's illustrative rate

PiggyVest runs a **public savings calculator at `/savings-calculator`** that asks three questions — goal amount, date the money is needed, and saving frequency — and returns how much to save. It needs no account, so it works as a top-of-funnel tool as well as a planning aid.

PiggyVest also gives each product a payout model: SafeLock prorates a declared rate over the exact lock duration, and Investify states when interest is paid (daily, monthly, quarterly or at maturity).

**Apex today:** the Save screen's "Projected interest" is one annualised figure across all plans, labelled *"annualised, illustrative"*. Plan sheets show the rate but not the projected payout, the interest already accrued, or the gap to the target date.

**What to build:** per-plan forecast — *projected interest at maturity, balance at maturity, amount still to save, and on-track / behind by ₦X*, plus a public goal calculator on the website that hands off into sign-up with the plan pre-filled.

---

## 4. Cost before you confirm

PiggyVest's strongest habit is stating the cost at the moment of decision: SafeLock's rate and break rule are shown before the lock is created; the 3.5%, 1% and 1–3% costs are written down; the interest forfeiture rules for Flex are explicit.

Apex currently confirms money movements (add, withdraw, send, plan deposit) and shows a receipt afterwards, but the cost-bearing confirmations — breaking a fixed plan, withdrawing from a target plan, selling a stock position — do not quote the cost first.

**What to build:** a cost line inside the confirm sheet, for example *"Leaving now: accrued interest ₦4,120 forfeited · processing ₦1,000 · you receive ₦103,400"*, with the same figures repeated on the receipt.

---

## 5. Trust, proof, statements and help

| Trust surface | PiggyVest (observed) | Apex today |
|---|---|---|
| Statement of account | A dedicated **Statement of Account** help category, alongside per-product help | "Account Statements" opens the Activity ledger (filterable, demo receipts). No date range, no PDF or CSV export |
| Regulatory / partner disclosure | Names the warehousing partner (PV Capital Limited, RC 1760152) and the Flex Dollar partner (Oval Technologies Ltd / Graph Finance, CBN-licensed IMTO) | Clear demo disclaimers on every surface and a KYC tier explanation; no real-world partner disclosure, which is correct for a concept but must be replaced by real ones in a live build |
| Customer proof | "Recently verified customer stories" with read-more stories | No testimonial or proof section in the app |
| Help centre | Public FAQs with product-by-product answers and hard numbers | Single "Help & Support" row; copy says support runs 8am–8pm WAT in the live product. Not a real help centre |
| Security explanation | Generic SSL sentence | Demo honesty, KYC tiers, hidden balances | 

**What to build:** a dated statement export (date range → PDF/CSV with opening and closing balance), a genuine help centre with per-product answers and numbers, and dated proof — real testimonials with a date and the outcome, refreshed on a schedule.

---

## 6. The structural difference: savings-only vs savings + money movement + equities

PiggyVest's public product list is savings and investments: PiggyBank, SafeLock, Target Savings, Flex Naira, Flex Dollar, HouseMoney, Investify, Kids and Joint accounts. Money moves through wallets to fund those products.

Apex's home screen puts **Wallet ₦268,400 · Savings ₦807,500 · Invest ₦164,500** under one balance, with Add money, Withdraw, Send and Invest as the four primary actions, plus a holdings view with buy/sell and receipts. That is the structural advantage the brief names — keep it visible rather than copying PiggyVest's savings-first layout.

Apex should not weaken this by becoming a savings clone. Instead, make the savings experience disclose as well as PiggyVest, while the home screen keeps showing that the same money can move and can hold equities.

---

## 7. Where PiggyVest is better than Apex today

1. **Recovery.** A visible forgot-password path; Apex has none.
2. **Progressive onboarding.** One name field before entering; Apex gates the dashboard behind name, email, phone, OTP and PIN.
3. **Sign-in breadth.** Email-or-phone plus passkey plus stay-signed-in; Apex has phone plus a new passkey.
4. **Documented schedules.** Daily/weekly/monthly ranges and next-debit mechanics are written down; Apex stores only a monthly amount.
5. **Documented exit costs.** 3.5% / 1% / forfeited interest / 1–3% commission are stated; Apex states none.
6. **Forecast tooling.** A public goal calculator and prorated payout models; Apex shows one annualised illustrative number.
7. **Statement of account.** A named, dedicated help topic; Apex's statement row opens the activity ledger.
8. **Help depth.** Product-by-product FAQ with numbers; Apex has one support note.

## 8. Where Apex is ahead

1. **One place for money.** Wallet, savings and equities with send/withdraw in one home; PiggyVest's public range is savings and investments.
2. **Equities.** Real stock positions, buy/sell sheets, contract-note receipts; PiggyVest's public range has no equities trading.
3. **Theme.** A full deep royal-blue dark mode across the app; PiggyVest's public surfaces are light.
4. **Demo honesty.** Every screen is explicit about sample data and non-real money; PiggyVest makes real-product claims that a concept cannot.
5. **Four coherent surfaces.** Case study, marketing site, desktop and mobile share one design system and cross-link; PiggyVest runs a marketing site and a separate dashboard app.
6. **KYC tiers explained.** A tier ladder with limits is visible in the app.
7. **Passkey consent.** Apex asks before creating a passkey and explains what it does; it does not silently register one.

## 9. PiggyVest weaknesses worth exploiting

- **Strict liquidity windows.** PiggyBank money is only free on four dates a year, and 3.5% applies outside them. Apex can win the "I might need it" user with clear flexible plans and a stated cost, without the surprise.
- **Rules buried in long FAQ answers.** The numbers exist but are spread across product pages. Apex can surface the same discipline as a schedule and a forecast on the plan itself.
- **Savings-only DNA.** No equities, no bank-style transfers as the primary story. Apex already has both.
- **Generic security copy.** "256-bit SSL" describes transport, not account protection. Apex can talk about device passkeys, sessions and recovery instead.
- **Undated proof.** The stories page advertises "recently verified" stories but the list I read showed no dates. Dated proof is cheap to do better.
- **Calculator is anonymous.** PiggyVest's calculator does not become a plan. Apex can make the calculator hand off into a pre-filled plan.

---

## 10. Priority plan

### P0 — close the auth and disclosure gaps (this sprint)

| Work | Done when |
|---|---|
| Passkeys on mobile sign-in | Create passkey → dashboard; sign out → "Sign in with a passkey" → dashboard (shipped 10 Nov 2026, verified with a virtual authenticator) |
| Progressive signup | Name (or phone) alone enters a limited dashboard; email/KYC completes the account, and the tier ladder shows what is unlocked |
| Recovery | "Forgot PIN / passcode" and "Use another device" paths that end in a verified reset, with a clear demo explanation |
| Plan schedule | Each plan shows next debit date, frequency, amount and the range it must stay within |
| Plan forecast | Earned to date, projected interest at maturity, balance at maturity, amount still to save, on-track/behind |
| Cost before confirm | Break/withdraw/sell confirm sheets quote the cost and net amount before the user confirms |

### P1 — trust surfaces

| Work | Done when |
|---|---|
| Free statement | Date range → PDF and CSV with opening balance, closing balance and every movement; works offline from the ledger |
| Help centre | Per-product answers with real numbers, limits and exit costs, searchable, linked from the row that currently says "Help & Support" |
| Dated proof | Testimonials carrying a date and a concrete outcome, refreshed monthly; no undated claims |
| Security page | Device passkeys, sessions, hiding balances, KYC limits and what is demo-only |

### P2 — reach and depth

| Work | Done when |
|---|---|
| Public goal calculator | Goal + date + frequency → required amount and projected interest; hands off into sign-up with the plan pre-filled |
| Group targets | Invite another user to a shared target, with per-person progress |
| Equities made legible | Portfolio performance beside savings, so the "one place for money" claim is visible on the home screen, not just in the Invest tab |

---

## Appendix — verified observations (10 Nov 2026)

**PiggyVest login** (`dashboard.piggyvest.com/login`): "Let's Login!", "Phone Number", "Use Email", "Password", "Show", "Forgot Password?", "Sign in with Passkey", "Stay signed in", "Proceed".

**PiggyVest sign-up** (`dashboard.piggyvest.com/signup`): "Start saving and investing in about two minutes.", "First & Last Name", "Create my account".

**PiggyVest home** (`app.piggyvest.com`): "Earn 6% - 15.5% interests on savings. Earn over 25% return on investments."; SafeLock "over 13% p.a."; "Join over 100,000 users… PiggyBank"; security copy "256 bits SSL security encryption".

**PiggyVest FAQ** (`piggyvest.com/faq`): AutoSave ranges as in section 2; PiggyBank free dates and 3.5% penalty; SafeLock 14/15/16/17% p.a. bands, prorated, break forfeits accrued interest; Target Savings break → Flex, accrued interest lost + 1% processing; Flex monthly withdrawal thresholds and 10-hour spacing; Investify payout frequency and 1–3% early-exit commission; Statement of Account listed as a help category.

**PiggyVest calculator** (`piggyvest.com/savings-calculator`): "See how much you need to save to reach your goal." Inputs: goal amount, date the money is needed, saving frequency.

**Apex mobile** (`apps/mobile`): passkey helper and consent panel; plan sheet with rate, opened date, maturity/target date, monthly auto-save, early-access flag; Save screen "Projected interest … annualised, illustrative"; Activity ledger with filters and demo receipts; KYC tiers 0–3; Help & Support informs about live support hours; no forgot-password path.
