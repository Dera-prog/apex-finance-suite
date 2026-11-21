import { BadgeCheck, CircleDollarSign, Fingerprint, Landmark, LineChart, RefreshCw, Send, Smartphone, Target, Wallet } from 'lucide-react';
import { PageCta, PageHero, SectionHead, CheckList, Note } from './common';

const steps = [
  {
    id: 'open',
    icon: <Smartphone size={18} />,
    title: 'Open an account with a phone number',
    copy: 'Enter your phone and email, receive a six-digit code and verify it. The code is hashed at rest, valid for ten minutes, and the fifth wrong attempt retires it. Verification creates your own ledger owner — separate balances, separate activity.',
    points: ['Six-digit code, ten-minute expiry', 'Five attempts per code', 'Limits start at Level 1'],
  },
  {
    id: 'verify',
    icon: <BadgeCheck size={18} />,
    title: 'Add BVN and NIN when you need more',
    copy: 'Level 1 is enough to explore products and hold small balances. Level 2 adds BVN and NIN for full wallet limits, savings and share investing. Level 3 raises limits further after address and income checks. Each level explains what it unlocks before you start it.',
    points: ['Plain-language explanation of each level', 'Upgrade any time from Profile', 'No support ticket needed'],
  },
  {
    id: 'fund',
    icon: <Landmark size={18} />,
    title: 'Fund the wallet from your bank',
    copy: 'Deposits arrive through licensed payment rails. The ledger records the amount when the payment settles, and until then the money is shown as pending rather than spendable — so the balance you see is the money you can actually use.',
    points: ['Pending is not spendable', 'Deposits land in your own wallet', 'Every deposit gets a reference'],
  },
  {
    id: 'allocate',
    icon: <Target size={18} />,
    title: 'Give every naira a job',
    copy: 'Move money into a flexible plan for access, a fixed plan for a higher rate, or a target plan with monthly auto-save. The plan card states the rate, the term and the early-access rule before you open it.',
    points: ['Flexible, fixed or target', 'Auto-save you can pause', 'Progress visible on the card'],
  },
  {
    id: 'move',
    icon: <Send size={18} />,
    title: 'Spend, withdraw or invest',
    copy: 'Send from the wallet by Apex tag, phone number or account number, withdraw to your verified bank, or preview a share order. Money movement asks for your PIN or device confirmation first.',
    points: ['Fee preview before confirming', 'Delayed share prices labelled', 'Receipt on every movement'],
  },
  {
    id: 'track',
    icon: <RefreshCw size={18} />,
    title: 'Read the whole story in one place',
    copy: 'The activity list mixes wallet moves, savings interest, plan funding and share orders, newest first, each with a status and reference. Desktop adds a year of filterable history and a statement export when you need a record.',
    points: ['One list, every surface', 'Filter by type and month on desktop', 'Statement export in the desktop app'],
  },
];

export default function HowPage() {
  return (
    <>
      <PageHero
        eyebrow="How it works"
        title={
          <>
            From phone number <em>to portfolio.</em>
          </>
        }
        lede="No branch visit and no guessing. Six steps explain what the app asks for, what it shows you before money moves, and where the money actually sits at each stage."
        chips={[
          { value: '3', label: 'verification levels' },
          { value: '6', label: 'steps to a portfolio' },
          { value: '1', label: 'activity list' },
        ]}
        nav={steps.map((step) => ({ href: `#${step.id}`, label: step.title.split(' ')[0] }))}
      />

      <section className="page-section">
        <div className="wrap">
          <SectionHead
            eyebrow="The journey"
            title={
              <>
                Set up once. <em>Use it daily.</em>
              </>
            }
            copy="Each step below is a real screen in the apps. The demo skips the licensed parts — a live product would add partner checks at funding, withdrawal and order routing."
          />
          <ol className="timeline">
            {steps.map((step, index) => (
              <li className="timeline-step" id={step.id} key={step.id}>
                <span className="timeline-num">{index + 1}</span>
                <div className="timeline-body">
                  <span className="timeline-icon">{step.icon}</span>
                  <h3>{step.title}</h3>
                  <p>{step.copy}</p>
                  <CheckList items={step.points} />
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="page-section alt" id="confirm">
        <div className="wrap">
          <SectionHead
            eyebrow="Before you confirm"
            title={
              <>
                The screen you <em>never skip.</em>
              </>
            }
            copy="Apex treats confirmation as the product, not a formality. Every money movement repeats the facts that matter on the final screen:"
          />
          <div className="page-grid three">
            {[
              {
                icon: <CircleDollarSign size={18} />,
                title: 'What it costs',
                copy: 'Fees, levies and pass-through network charges are listed separately, so the total debit is the number you agreed to.',
              },
              {
                icon: <Target size={18} />,
                title: 'What it promises',
                copy: 'Savings rates and tenors are stated in full. Fixed plans show the maturity date and the early-exit rule before opening.',
              },
              {
                icon: <LineChart size={18} />,
                title: 'What can go wrong',
                copy: 'Share orders label delayed pricing, FX conversion and market risk. No return is ever promised for investing.',
              },
            ].map((item) => (
              <div className="mini-panel" key={item.title}>
                {item.icon}
                <h3>{item.title}</h3>
                <p>{item.copy}</p>
              </div>
            ))}
          </div>
          <div className="page-grid two">
            <div className="page-card">
              <h3>What the demo actually does</h3>
              <CheckList
                items={[
                  'Signs in with a real one-time code from the API',
                  'Provisions a zeroed ledger owner for a new phone number',
                  'Posts deposits, trades and plan funding through the ledger',
                  'Keeps rate limits and sessions in Postgres',
                ]}
              />
            </div>
            <div className="page-card">
              <h3>What a live product would add</h3>
              <CheckList
                items={[
                  'A KYC provider for BVN and NIN checks',
                  'An SMS gateway so codes never appear on screen',
                  'Partner rails for real deposits and withdrawals',
                  'Broker confirmation and settlement reporting',
                ]}
              />
            </div>
          </div>
          <Note>
            This site and the apps are a design and engineering prototype. All balances, plans and
            transactions are demo data; no real money moves.
          </Note>
        </div>
      </section>

      <PageCta current="/how-it-works" title={<>Now see what it costs.</>} />
    </>
  );
}
