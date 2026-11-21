import { useState } from 'react';
import { ChevronDown, MessageCircleQuestion } from 'lucide-react';
import { PageCta, PageHero, SectionHead, Note } from './common';
import { isLive, links } from '@shared/links';

type Group = {
  id: string;
  eyebrow: string;
  title: string;
  copy: string;
  items: { q: string; a: string }[];
};

const groups: Group[] = [
  {
    id: 'accounts',
    eyebrow: 'Accounts & verification',
    title: 'Getting in, and what it takes.',
    copy: 'Sign-in is a phone number and a code. Limits grow with verification, and each level says what it unlocks.',
    items: [
      {
        q: 'Do I need a BVN to sign up?',
        a: 'No. Level 1 opens an account with a phone number and an email address, enough to explore products and hold small balances. Level 2 adds BVN and NIN for full wallet, savings and investing limits. Level 3 raises limits further after address and income checks.',
      },
      {
        q: 'How does the sign-in code work?',
        a: 'You request a six-digit code for your phone number. It is hashed before storage, expires after 10 minutes and is retired after five wrong attempts. A new code can only be requested five times per phone in 10 minutes. Until an SMS gateway is configured, the demo shows the code on the OTP screen.',
      },
      {
        q: 'Can two people share one phone number?',
        a: 'No. One phone number maps to one ledger owner, with its own balances and activity. A different phone number provisions a separate, zeroed account the first time it verifies.',
      },
      {
        q: 'What happens if I lose my phone?',
        a: 'Sessions last 30 days and logging out revokes the token immediately. Recovery for a lost phone is on the “not built yet” list — a live product would verify ownership through the email on file and a support review before restoring access.',
      },
      {
        q: 'Can I delete my account?',
        a: 'Not in the demo. There is no data export or deletion tool yet. A live product would need both, and they are listed as open gaps on the security page.',
      },
    ],
  },
  {
    id: 'money',
    eyebrow: 'Money & transfers',
    title: 'Where money goes, and when.',
    copy: 'Pending money is never shown as spendable, and every movement keeps a reference you can point at.',
    items: [
      {
        q: 'How do I add money?',
        a: 'A bank transfer into your wallet through licensed payment rails. The ledger records the deposit when the payment settles; until then it is shown as pending, not as spendable balance.',
      },
      {
        q: 'How fast are Apex-to-Apex transfers?',
        a: 'Instant, and free. You can send by Apex tag, phone number or account number, and the balance updates for both sides as one ledger posting.',
      },
      {
        q: 'What happens if a transfer fails?',
        a: 'The money returns to your wallet and the activity list states the reason. A failure is never left as a silent pending row.',
      },
      {
        q: 'Why is my deposit still pending?',
        a: 'Because it has not settled yet. The app separates “arrived at the bank” from “spendable in Apex” so you cannot spend money that has not cleared.',
      },
      {
        q: 'Are there transfer limits?',
        a: 'Yes, set by verification level. Level 1 covers everyday exploration, Level 2 opens full wallet and savings limits, and Level 3 raises them after address and income checks.',
      },
    ],
  },
  {
    id: 'savings',
    eyebrow: 'Savings',
    title: 'Flexible, fixed and target.',
    copy: 'Same wallet, three different promises about access and rate. The plan card states the trade-off before you open it.',
    items: [
      {
        q: 'What is the difference between the three plans?',
        a: 'Everyday is flexible and withdrawable at any time at a lower illustrative rate. Fixed locks the balance for a term in exchange for a higher rate. Target is a goal plan that moves money on a schedule you set.',
      },
      {
        q: 'Can I withdraw a fixed plan early?',
        a: 'You can request early access, but the rule — including any loss of accrued interest or an early-exit fee — is shown on the plan card before opening and again before you confirm the withdrawal.',
      },
      {
        q: 'When is interest paid?',
        a: 'The concept shows illustrative interest: accrued daily and credited monthly on the flexible plan, at maturity on a fixed plan. A live product would publish the exact schedule from its partner before accepting a deposit.',
      },
      {
        q: 'What happens if I miss an auto-save?',
        a: 'The schedule is a setting, not a contract. You can pause it or change the amount without a penalty; the goal card simply shows the revised date.',
      },
      {
        q: 'Is my savings balance separate from my wallet?',
        a: 'Separate position, same ledger. Moving between them is a posting, and the activity list reconciles to the totals on the home screen.',
      },
    ],
  },
  {
    id: 'investing',
    eyebrow: 'Investing',
    title: 'Shares, quotes and risk.',
    copy: 'Apex routes orders to a broker and shows the delayed price, the estimated units and the fees first.',
    items: [
      {
        q: 'Which markets can I invest in?',
        a: 'NGX-listed Nigerian companies and NASDAQ-listed US companies, bought in small amounts. US purchases include an FX conversion that is quoted with the order.',
      },
      {
        q: 'Why are share prices delayed?',
        a: 'The demo shows prices delayed by at least 15 minutes and labels them as such. The price you see is context for the order, not a live execution price.',
      },
      {
        q: 'What fees apply to a trade?',
        a: 'The broker’s brokerage fee plus statutory levies, itemised separately and quoted in naira before the order is sent. Apex does not set a retail tariff in this concept.',
      },
      {
        q: 'Can I buy fractional shares?',
        a: 'The demo quotes whole units at the delayed price. Unit sizes for a live product would be set by the executing broker and stated in the order preview.',
      },
      {
        q: 'Can I lose money?',
        a: 'Yes. Share prices can fall as well as rise, fees are charged either way, and FX can move against you. No return is promised anywhere in the product.',
      },
    ],
  },
  {
    id: 'security',
    eyebrow: 'Security & data',
    title: 'What is protected, and what is not.',
    copy: 'The controls are real for the demo database. They are not protecting real deposits, because there are none.',
    items: [
      {
        q: 'Is my money safe with Apex?',
        a: 'In this concept, deposits are described as held with licensed partner banks and payments run on licensed rails. Deposit insurance only applies where a partner bank’s cover applies, and it does not protect share prices. A live product would publish the exact partner, custody and coverage terms first.',
      },
      {
        q: 'How are sign-in codes stored?',
        a: 'As SHA-256 hashes with a server-side pepper, never as plain text. They expire after 10 minutes and are retired after five wrong attempts.',
      },
      {
        q: 'What does the demo store about me?',
        a: 'Your phone number, an optional name and email, hashed session tokens, and the ledger entries created by your account — in a Postgres database. Nothing is shared with an SMS or KYC provider, because neither is connected.',
      },
      {
        q: 'How do I end a session?',
        a: 'Logging out deletes the session row on the server, so the token stops working immediately rather than expiring later.',
      },
      {
        q: 'Can I test the limits?',
        a: 'Yes. Request codes repeatedly from one IP, guess a code five times, or push past the write limits, and the API answers 429. The counters live in the database, so they hold across serverless instances.',
      },
    ],
  },
  {
    id: 'demo',
    eyebrow: 'About this demo',
    title: 'What this actually is.',
    copy: 'A design and engineering prototype built from a PRD and a Figma file — not a bank, a broker or an offer.',
    items: [
      {
        q: 'Is this a real financial product?',
        a: 'No. The site and its connected apps are a design and engineering prototype. All balances, plans, prices and transactions are demo data, and no real money moves.',
      },
      {
        q: 'What actually works?',
        a: 'Phone-code sign-in against the live API, per-phone ledger accounts, deposits, trades and plan funding through the ledger, database-backed rate limits, session revocation and daily backups.',
      },
      {
        q: 'What is still local-only?',
        a: 'Withdrawals, transfers, new plans and plan withdrawals are handled inside the desktop and mobile apps and are not yet API endpoints. The shared demo account also remains reachable without signing in.',
      },
      {
        q: 'How do I try it?',
        a: 'Open the mobile or desktop app and sign in with any Nigerian phone number in the demo format. A new number gets its own zeroed account; the seeded demo number already has sample activity.',
      },
    ],
  },
];

export default function FaqPage() {
  const [open, setOpen] = useState<string | null>('accounts-0');
  const mobileHref = isLive(links.mobile) ? links.mobile : '#install';
  const desktopHref = isLive(links.desktop) ? links.desktop : '#install';

  return (
    <>
      <PageHero
        eyebrow="FAQ"
        title={
          <>
            The questions people <em>actually</em> ask.
          </>
        }
        lede="Short answers, grouped by what you are trying to do. Where the demo stops short of a real product, the answer says so instead of dressing up a mock as a feature."
        chips={[
          { value: '6', label: 'answer groups' },
          { value: '30', label: 'questions answered' },
          { value: 'Live', label: 'demo to test' },
        ]}
        nav={groups.map((group) => ({ href: `#${group.id}`, label: group.eyebrow.split(' ')[0] }))}
      />

      {groups.map((group, groupIndex) => (
        <section
          className={`page-section${groupIndex % 2 === 1 ? ' alt' : ''}`}
          id={group.id}
          key={group.id}
        >
          <div className="wrap">
            <SectionHead eyebrow={group.eyebrow} title={group.title} copy={group.copy} />
            <div className="faq faq-page">
              {group.items.map((item, index) => {
                const key = `${group.id}-${index}`;
                const isOpen = open === key;
                return (
                  <div className={`faq-item${isOpen ? ' open' : ''}`} key={item.q}>
                    <button
                      type="button"
                      className="faq-q"
                      id={`faq-q-${key}`}
                      aria-expanded={isOpen}
                      aria-controls={`faq-${key}`}
                      onClick={() => setOpen(isOpen ? null : key)}
                    >
                      {item.q}
                      <ChevronDown size={18} />
                    </button>
                    <div
                      className="faq-a"
                      id={`faq-${key}`}
                      role="region"
                      aria-labelledby={`faq-q-${key}`}
                      aria-hidden={!isOpen}
                    >
                      <div>
                        <p>{item.a}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      ))}

      <section className="page-section alt">
        <div className="wrap">
          <div className="page-card page-gap-note">
            <MessageCircleQuestion size={18} />
            <div>
              <h3>Still stuck?</h3>
              <p>
                A live product would open a support thread from the app’s Profile tab with the
                transaction reference attached. In the demo, the honest answer is the one above — or try
                the{' '}
                <a href={mobileHref} {...(isLive(links.mobile) ? { target: '_blank', rel: 'noreferrer' } : {})}>
                  mobile
                </a>{' '}
                and{' '}
                <a href={desktopHref} {...(isLive(links.desktop) ? { target: '_blank', rel: 'noreferrer' } : {})}>
                  desktop
                </a>{' '}
                apps and see the behaviour for yourself.
              </p>
            </div>
          </div>
          <Note>This site and the apps are a prototype. No real money moves and no real security is held.</Note>
        </div>
      </section>

      <PageCta current="/faq" title={<>Go back to the start.</>} />
    </>
  );
}
