import { ArrowDownLeft, ArrowUpRight, BadgeCheck, Check, Landmark, LineChart, RefreshCw, Target, Wallet, Zap } from 'lucide-react';
import { PageCta, PageHero, SectionHead, CheckList, Note } from './common';

const plans = [
  {
    tone: 'blue',
    icon: <Zap size={20} />,
    name: 'Everyday Fund',
    rate: '12% p.a.',
    rateNote: 'Illustrative rate',
    term: 'No lock-in',
    access: 'Withdraw any time',
    copy: 'The flexible layer. Keep spending money earning instead of sitting idle, and pull it back to the wallet when you need it.',
    points: ['Interest credited monthly', 'No maintenance fee', 'Instant move to wallet'],
  },
  {
    tone: 'purple',
    icon: <Target size={20} />,
    name: 'Fixed deposit',
    rate: '16% p.a.',
    rateNote: 'Illustrative rate',
    term: '90-day tenor',
    access: 'Early access with rules',
    copy: 'A time-bound plan for money you will not need this quarter. The higher rate is the trade for committing the balance.',
    points: ['Rate fixed at opening', 'Maturity date on the plan card', 'Early-exit rule shown before you confirm'],
  },
  {
    tone: 'green',
    icon: <RefreshCw size={20} />,
    name: 'Target plan',
    rate: 'Auto-save',
    rateNote: 'Goal-based',
    term: 'You choose the date',
    access: 'Withdraw any time',
    copy: 'Name the goal, set the amount and let a monthly transfer keep it moving. Progress is visible on the card, not buried in a settings screen.',
    points: ['Goal amount and progress bar', 'Monthly auto-save you can pause', 'Example: ₦850,000 at ₦50,000/month'],
  },
];

export default function ProductsPage() {
  return (
    <>
      <PageHero
        eyebrow="Products"
        title={
          <>
            Three products. <em>One ledger.</em>
          </>
        }
        lede="Apex is built around the jobs people actually use money apps for: keeping cash reachable, locking some away at a better rate, and buying shares without pretending the risk is not there. Each product shows its rules before you commit."
        chips={[
          { value: '3', label: 'savings products' },
          { value: 'NGX + US', label: 'share markets' },
          { value: '1', label: 'activity list' },
        ]}
        nav={[
          { href: '#savings', label: 'Savings' },
          { href: '#wallet', label: 'Wallet & transfers' },
          { href: '#invest', label: 'Investing' },
          { href: '#balance', label: 'One balance' },
        ]}
      />

      <section className="page-section" id="savings">
        <div className="wrap">
          <SectionHead
            eyebrow="Savings"
            title={
              <>
                Savings with <em>a job.</em>
              </>
            }
            copy="Flexible money you can reach, fixed money that earns more, and target plans that keep a goal moving. Same wallet, three different promises about access and rate."
          />
          <div className="page-grid three">
            {plans.map((plan) => (
              <article className={`plan-card ${plan.tone}`} key={plan.name}>
                <div className="plan-card-top">
                  <span className="plan-icon">{plan.icon}</span>
                  <span className="plan-rate">{plan.rate}</span>
                </div>
                <h3>{plan.name}</h3>
                <p>{plan.copy}</p>
                <CheckList items={plan.points} />
                <dl className="plan-meta">
                  <div>
                    <dt>Term</dt>
                    <dd>{plan.term}</dd>
                  </div>
                  <div>
                    <dt>Access</dt>
                    <dd>{plan.access}</dd>
                  </div>
                  <div>
                    <dt>Rate basis</dt>
                    <dd>{plan.rateNote}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
          <div className="spec-table four-col">
            <div className="spec-row spec-head">
              <span>Plan</span>
              <span>Rate</span>
              <span>Term</span>
              <span>Money out</span>
            </div>
            <div className="spec-row">
              <b data-label="Plan">Everyday Fund</b>
              <span data-label="Rate">12% p.a. illustrative</span>
              <span data-label="Term">None</span>
              <span data-label="Money out">Any time, back to wallet</span>
            </div>
            <div className="spec-row">
              <b data-label="Plan">Fixed deposit</b>
              <span data-label="Rate">16% p.a. illustrative</span>
              <span data-label="Term">90 days</span>
              <span data-label="Money out">At maturity; early access shows the rule and any loss</span>
            </div>
            <div className="spec-row">
              <b data-label="Plan">Target plan</b>
              <span data-label="Rate">Auto-save schedule</span>
              <span data-label="Term">Until your date</span>
              <span data-label="Money out">Any time, progress updates</span>
            </div>
          </div>
          <Note>
            Rates, tenors and early-access rules in this concept are illustrative. A live product would
            publish the final terms agreed with its licensed partners before accepting deposits.
          </Note>
        </div>
      </section>

      <section className="page-section alt" id="wallet">
        <div className="wrap">
          <div className="page-split">
            <div>
              <SectionHead
                eyebrow="Wallet & transfers"
                title={
                  <>
                    A wallet that <em>moves.</em>
                  </>
                }
                copy="Fund from any Nigerian bank, send to an Apex tag, a phone number or an account number, and keep a receipt for every naira that leaves. Failed transfers return to the wallet with the reason attached."
              />
              <CheckList
                items={[
                  'Bank funding through licensed payment rails',
                  'Instant Apex-to-Apex transfers, no Apex fee',
                  'Account-number transfers with a fee preview',
                  'Pending, processing, failed and settled states',
                  'Reference and receipt on every movement',
                ]}
              />
              <p className="page-body">
                Limits are tied to your verification level, not to a support ticket. Level 1 covers
                everyday exploration, Level 2 opens full wallet and savings limits, and Level 3 raises
                them after address and income checks.
              </p>
            </div>
            <div className="mock-card" aria-hidden="true">
              <div className="mock-card-head">
                <b>Transfer</b>
                <span className="mock-badge">Wallet · ₦268,400</span>
              </div>
              <div className="mock-amount">
                <span>Amount</span>
                <strong>₦25,000.00</strong>
                <em>No Apex fee · instant</em>
              </div>
              <div className="mock-recipient">
                <i>CO</i>
                <div>
                  Chinedu Okafor
                  <small>@chinedu · Apex wallet</small>
                </div>
                <BadgeCheck size={15} color="#1D52CE" />
              </div>
              <ol className="mock-steps">
                <li className="done">
                  <Check size={12} /> Amount reviewed
                </li>
                <li className="done">
                  <Check size={12} /> PIN or device confirmation
                </li>
                <li>
                  <ArrowUpRight size={12} /> Sending · receipt follows
                </li>
              </ol>
            </div>
          </div>
          <div className="page-grid three compact">
            <div className="mini-panel">
              <ArrowDownLeft size={18} />
              <h3>Add money</h3>
              <p>Bank transfer into your wallet via partner rails. The balance becomes spendable only when the payment settles.</p>
            </div>
            <div className="mini-panel">
              <ArrowUpRight size={18} />
              <h3>Withdraw</h3>
              <p>Back to your verified bank account. Network fees are passed through and shown before you confirm.</p>
            </div>
            <div className="mini-panel">
              <Landmark size={18} />
              <h3>States you can see</h3>
              <p>Pending money is never shown as spendable, and a failure always explains itself in the activity list.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="page-section" id="invest">
        <div className="wrap">
          <div className="page-split reverse">
            <div>
              <SectionHead
                eyebrow="Investing"
                title={
                  <>
                    Shares without <em>the fog.</em>
                  </>
                }
                copy="Buy Nigerian and US shares in small amounts. Before an order goes out you see the delayed price, the estimated units, the brokerage fee and levies, and a plain label for the risk you are taking."
              />
              <CheckList
                items={[
                  'NGX and NASDAQ-listed companies',
                  'Quoted prices delayed at least 15 minutes',
                  'Order preview with fee breakdown',
                  'Holdings show units, average cost and position value',
                  'No promise of return — shares can fall',
                ]}
              />
              <p className="page-body">
                Orders are routed to an SEC-registered broker. Apex itself does not execute trades, and
                US share purchases involve an FX conversion whose rate and fee are quoted before the
                order.
              </p>
            </div>
            <div className="mock-card" aria-hidden="true">
              <div className="mock-card-head">
                <b>Order preview</b>
                <span className="mock-badge">NGX · delayed 15 min</span>
              </div>
              <div className="mock-order">
                <div>
                  <i style={{ background: '#DCE9FF', color: '#0034A8' }}>
                    <LineChart size={15} />
                  </i>
                  <div>
                    <b>Dangote Cement</b>
                    <small>DANGCEM</small>
                  </div>
                </div>
                <b>₦63.50</b>
              </div>
              <div className="mock-lines">
                <div>
                  <span>Estimated units</span>
                  <b>787</b>
                </div>
                <div>
                  <span>Brokerage + levies</span>
                  <b>Quoted up front</b>
                </div>
                <div>
                  <span>Settlement</span>
                  <b>T+2 · shown in app</b>
                </div>
              </div>
              <div className="mock-risk">
                <span>Risk</span>
                Share prices can fall. Past performance is not a forecast.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="page-section alt" id="balance">
        <div className="wrap">
          <SectionHead
            eyebrow="One balance"
            title={
              <>
                Four jobs, <em>one ledger.</em>
              </>
            }
            copy="Wallet, savings plans and investments are not separate accounts you have to reconcile. They are positions inside the same double-entry ledger, which is why the activity list always agrees with the totals on the home screen."
          />
          <div className="page-grid four">
            {[
              { icon: <Wallet size={18} />, title: 'Wallet', copy: 'Everyday money. Instant in, instant out.' },
              { icon: <Target size={18} />, title: 'Savings', copy: 'Flexible, fixed and target plans.' },
              { icon: <LineChart size={18} />, title: 'Invest', copy: 'NGX and US shares held at the broker.' },
              { icon: <RefreshCw size={18} />, title: 'Activity', copy: 'One list, every movement, each with a reference.' },
            ].map((item) => (
              <div className="mini-panel" key={item.title}>
                {item.icon}
                <h3>{item.title}</h3>
                <p>{item.copy}</p>
              </div>
            ))}
          </div>
          <div className="quote-band">
            <p>
              Balances are not stored on the app and edited later. They are derived from ledger postings,
              and every entry has to balance in each currency before it can be written.
            </p>
          </div>
        </div>
      </section>

      <PageCta current="/products" title={<>See how the money moves.</>} />
    </>
  );
}
