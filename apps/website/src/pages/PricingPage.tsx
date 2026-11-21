import { BadgeCheck, Check, CircleAlert, Landmark, LineChart, RefreshCw, Wallet } from 'lucide-react';
import { PageCta, PageHero, SectionHead, CheckList, Note } from './common';

const fees = [
  { what: 'Account opening', how: 'No Apex fee', launch: 'Free' },
  { what: 'Apex-to-Apex transfer', how: 'Instant, by Apex tag or phone number', launch: 'Free' },
  { what: 'Bank withdrawal', how: 'Network fee passed through, shown before confirmation', launch: 'Pass-through' },
  { what: 'Savings plans', how: 'No maintenance fee; early-access rules on each plan', launch: 'Free' },
  { what: 'Share orders', how: 'Brokerage fee + statutory levies, quoted up front', launch: 'Quoted' },
  { what: 'US shares', how: 'FX rate and conversion fee shown before the order', launch: 'Quoted' },
];

export default function PricingPage() {
  return (
    <>
      <PageHero
        eyebrow="Pricing"
        title={
          <>
            Know the cost <em>before</em> you commit.
          </>
        }
        lede="Apex is designed around one rule: the amount that leaves your balance is the amount you agreed to. Nothing is deducted after the fact, and no return is ever promised to make a fee look smaller."
        chips={[
          { value: '₦0', label: 'account opening' },
          { value: 'Free', label: 'Apex-to-Apex transfers' },
          { value: 'Quoted', label: 'share fees and FX' },
        ]}
        nav={[
          { href: '#fees', label: 'Everyday fees' },
          { href: '#savings', label: 'Savings rates' },
          { href: '#shares', label: 'Share orders' },
          { href: '#fx', label: 'US shares' },
          { href: '#disclosures', label: 'Disclosures' },
        ]}
      />

      <section className="page-section" id="fees">
        <div className="wrap">
          <SectionHead
            eyebrow="Everyday fees"
            title={
              <>
                Six surfaces. <em>No fine print fee.</em>
              </>
            }
            copy="These are the intended fee surfaces in the concept. Where a partner sets the cost, the app passes it through and names it on the confirmation screen."
          />
          <div className="fee-grid">
            <div className="fee-table">
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
            <aside className="fee-note">
              <h3>No surprise deductions</h3>
              <p>
                Final rates, tenors and fees are set with licensed partners and shown inside the app
                before a plan or order is confirmed. Numbers on this page are illustrative.
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

      <section className="page-section alt" id="savings">
        <div className="wrap">
          <SectionHead
            eyebrow="Savings rates"
            title={
              <>
                What the rates <em>would</em> pay.
              </>
            }
            copy="Worked examples using simple interest on a 365-day basis. They show the arithmetic, not a promise: the rate printed on a live plan card is the one that applies."
          />
          <div className="page-grid three">
            <div className="mini-panel">
              <Wallet size={18} />
              <h3>Everyday Fund · 12% p.a.</h3>
              <p className="cost-line">
                <strong>₦50,000</strong>
                <span>kept for 30 days</span>
                <b>≈ ₦493 interest</b>
              </p>
              <p>Withdraw any time. A variable rate would be repriced and shown before it changed.</p>
            </div>
            <div className="mini-panel">
              <Landmark size={18} />
              <h3>Fixed deposit · 16% p.a.</h3>
              <p className="cost-line">
                <strong>₦100,000</strong>
                <span>locked for 90 days</span>
                <b>≈ ₦3,945 interest</b>
              </p>
              <p>The rate is fixed at opening. Early access follows the rule printed on the plan card.</p>
            </div>
            <div className="mini-panel">
              <RefreshCw size={18} />
              <h3>Target plan · auto-save</h3>
              <p className="cost-line">
                <strong>₦850,000</strong>
                <span>goal at ₦50,000/month</span>
                <b>17 months</b>
              </p>
              <p>No separate rate promise. You can pause the schedule without a penalty.</p>
            </div>
          </div>
          <div className="spec-table compact-table">
            <div className="spec-row spec-head">
              <span>Plan</span>
              <span>Rate basis</span>
              <span>Interest timing</span>
            </div>
            <div className="spec-row">
              <b data-label="Plan">Everyday Fund</b>
              <span data-label="Rate basis">12% p.a. illustrative, variable</span>
              <span data-label="Interest timing">Accrued daily, credited monthly</span>
            </div>
            <div className="spec-row">
              <b data-label="Plan">Fixed deposit</b>
              <span data-label="Rate basis">16% p.a. illustrative, fixed at opening</span>
              <span data-label="Interest timing">At maturity, or per plan terms</span>
            </div>
            <div className="spec-row">
              <b data-label="Plan">Target plan</b>
              <span data-label="Rate basis">Follows the plan you attach</span>
              <span data-label="Interest timing">Depends on the underlying plan</span>
            </div>
          </div>
          <Note>
            Interest examples are arithmetic illustrations, not offers. Final rates and crediting
            schedules depend on the partner bank and would be published in the app before a deposit.
          </Note>
        </div>
      </section>

      <section className="page-section" id="shares">
        <div className="wrap">
          <div className="page-split">
            <div>
              <SectionHead
                eyebrow="Share orders"
                title={
                  <>
                    A trade is a <em>quote,</em> not a guess.
                  </>
                }
                copy="Apex does not set a retail brokerage tariff in this concept. The broker’s fee and the statutory levies are added to the order value and shown in naira before you send it, so the total debit is known in advance."
              />
              <CheckList
                items={[
                  'Brokerage fee quoted in naira, not a vague percentage',
                  'Statutory levies itemised separately',
                  'Order value, fees and total debit on one screen',
                  'Prices delayed at least 15 minutes, and labelled',
                  'No Apex execution fee for routing the order',
                ]}
              />
              <p className="page-body">
                On the NGX a buy order also needs settlement timing that the app shows before
                confirmation. If a fee cannot be quoted at that moment, the order stops here — it is not
                sent with an estimated deduction.
              </p>
            </div>
            <div className="mock-card" aria-hidden="true">
              <div className="mock-card-head">
                <b>Order cost</b>
                <span className="mock-badge">NGX · buy</span>
              </div>
              <div className="mock-order">
                <div>
                  <i style={{ background: '#DCE9FF', color: '#0034A8' }}>
                    <LineChart size={15} />
                  </i>
                  <div>
                    <b>Dangote Cement</b>
                    <small>DANGCEM · delayed quote</small>
                  </div>
                </div>
                <b>₦50,000.00</b>
              </div>
              <div className="mock-lines">
                <div>
                  <span>Order value</span>
                  <b>₦50,000.00</b>
                </div>
                <div>
                  <span>Brokerage fee</span>
                  <b>Quoted up front</b>
                </div>
                <div>
                  <span>Statutory levies</span>
                  <b>Itemised</b>
                </div>
                <div>
                  <span>Total debit</span>
                  <b>Before you confirm</b>
                </div>
              </div>
              <div className="mock-risk">
                <span>Risk</span>
                Share prices can fall. Fees are charged whether the position gains or loses.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="page-section alt" id="fx">
        <div className="wrap">
          <div className="page-split reverse">
            <div>
              <SectionHead
                eyebrow="US shares"
                title={
                  <>
                    The exchange rate is <em>part of</em> the price.
                  </>
                }
                copy="Buying a NASDAQ-listed share means converting naira to dollars. The FX rate and the conversion fee are quoted together with the share price, so the naira total is visible before the order."
              />
              <CheckList
                items={[
                  'One naira total for the share, the FX and the fee',
                  'Conversion rate locked for the quote window',
                  'A move in the rate after the window re-quotes loudly',
                  'US holdings shown separately from NGX holdings',
                  'No promise that the dollar value will hold',
                ]}
              />
              <p className="page-body">
                Currency can move against you. A quote that expires is not silently refreshed — the app
                asks you to review the new rate first.
              </p>
            </div>
            <div className="mock-card" aria-hidden="true">
              <div className="mock-card-head">
                <b>FX quote</b>
                <span className="mock-badge">NASDAQ · delayed 15 min</span>
              </div>
              <div className="mock-order">
                <div>
                  <i style={{ background: '#DCE9FF', color: '#0034A8' }}>
                    <BadgeCheck size={15} />
                  </i>
                  <div>
                    <b>NVIDIA</b>
                    <small>NVDA · 10 units</small>
                  </div>
                </div>
                <b>$1,382.50</b>
              </div>
              <div className="mock-lines">
                <div>
                  <span>Share cost</span>
                  <b>$1,382.50</b>
                </div>
                <div>
                  <span>FX rate</span>
                  <b>Quoted at order time</b>
                </div>
                <div>
                  <span>Conversion fee</span>
                  <b>Quoted up front</b>
                </div>
                <div>
                  <span>Naira total</span>
                  <b>Before you confirm</b>
                </div>
              </div>
              <div className="mock-risk">
                <span>Risk</span>
                Both the share price and the exchange rate can move against you.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="page-section" id="disclosures">
        <div className="wrap">
          <SectionHead
            eyebrow="Disclosures"
            title={
              <>
                The short version, <em>in words.</em>
              </>
            }
            copy="The footer carries the full disclaimer. These are the parts that change how you should read every number on this site."
          />
          <div className="page-grid two">
            <div className="page-card">
              <h3>About this site</h3>
              <CheckList
                items={[
                  'A concept product, not a licensed financial institution',
                  'All balances, prices, plans and receipts are demo data',
                  'No real money moves and no real security is held',
                  'Nothing here is an offer to accept deposits or give investment advice',
                  'Rates and limits are illustrative, not a tariff',
                ]}
              />
            </div>
            <div className="page-card">
              <h3>About returns and risk</h3>
              <CheckList
                items={[
                  'Savings rates are examples, not guarantees',
                  'A fixed plan withdrawn early may lose some or all accrued interest',
                  'Share prices can fall as well as rise',
                  'Prices shown are delayed by at least 15 minutes',
                  'FX rates can move between quote and settlement',
                ]}
              />
            </div>
          </div>
          <div className="quote-band">
            <p>
              <CircleAlert size={16} /> If a fee or rate is not on the confirmation screen, it is not part
              of the agreement — that is the rule the whole pricing model is built on.
            </p>
          </div>
        </div>
      </section>

      <PageCta current="/pricing" title={<>Still have a question?</>} />
    </>
  );
}
