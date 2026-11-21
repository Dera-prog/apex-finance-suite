import { BadgeCheck, Check, Database, Fingerprint, Landmark, Lock, ShieldCheck, LineChart } from 'lucide-react';
import { PageCta, PageHero, SectionHead, CheckList, Note } from './common';

const controls = [
  {
    control: 'Sign-in code',
    how: 'Six digits, hashed with SHA-256 and a server pepper before storage. Expires after 10 minutes, retired after five wrong attempts, and a new code can only be requested five times per phone in 10 minutes.',
    status: 'Live',
  },
  {
    control: 'Sessions',
    how: 'The bearer token is stored hashed in the sessions table with a 30-day expiry. Logging out deletes the row, so the token stops working immediately.',
    status: 'Live',
  },
  {
    control: 'Rate limits',
    how: 'Counted in Postgres, not in memory, so they hold across serverless instances: 10 code requests and 40 verifications per IP per 10 minutes, 300 reads per minute, and 30 writes per account per minute.',
    status: 'Live',
  },
  {
    control: 'Account isolation',
    how: 'Every read and write is scoped to the owner behind the verified token. A phone number that has never signed in gets its own zeroed ledger — it cannot see the demo account.',
    status: 'Live',
  },
  {
    control: 'Money integrity',
    how: 'Every movement is a balanced double-entry posting. Balances are derived from postings rather than edited in place, and a repeated reference is treated as the same write.',
    status: 'Live',
  },
  {
    control: 'Backups',
    how: 'A daily pg_dump runs at 02:00 UTC and keeps a custom-format archive for 30 days; Neon point-in-time restore covers the recent window. Enable the dump by adding the production connection string as a repository secret.',
    status: 'Configured',
  },
];

const levels = [
  {
    level: 'Level 1',
    title: 'Phone + email',
    items: ['Open an account and sign in', 'Browse products and small balances', 'Upgrade any time'],
  },
  {
    level: 'Level 2',
    title: 'BVN + NIN',
    items: ['Full wallet limits', 'Savings and transfers', 'NGX + US share investing'],
  },
  {
    level: 'Level 3',
    title: 'Address + income',
    items: ['Higher limits', 'Higher FX allowance', 'Reviewed manually'],
  },
];

export default function SecurityPage() {
  return (
    <>
      <PageHero
        eyebrow="Security"
        title={
          <>
            Trust is a <em>receipt,</em> not a slogan.
          </>
        }
        lede="The product brief made trust the main constraint. This page separates what the running demo actually enforces from what a licensed launch would still need — without using a green checkmark to stand in for a partner agreement that does not exist."
        chips={[
          { value: 'SHA-256', label: 'code hashes at rest' },
          { value: '30 days', label: 'session lifetime' },
          { value: 'Double-entry', label: 'ledger postings' },
        ]}
        nav={[
          { href: '#controls', label: 'Controls' },
          { href: '#verification', label: 'Verification' },
          { href: '#custody', label: 'Who holds what' },
          { href: '#gaps', label: 'The gaps' },
        ]}
      />

      <section className="page-section" id="controls">
        <div className="wrap">
          <SectionHead
            eyebrow="What the demo enforces"
            title={
              <>
                Controls you can <em>test.</em>
              </>
            }
            copy="These controls run in the deployed API and its Postgres database, not in a mock. Most of them can be triggered through the live apps."
          />
          <div className="spec-table">
            <div className="spec-row spec-head">
              <span>Control</span>
              <span>How it works</span>
              <span>Status</span>
            </div>
            {controls.map((row) => (
              <div className="spec-row" key={row.control}>
                <b>{row.control}</b>
                <span>{row.how}</span>
                <em className={`status-pill${row.status === 'Live' ? ' live' : ''}`}>{row.status}</em>
              </div>
            ))}
          </div>
          <Note>
            Requests without a bearer token fall back to the shared demo account so the public apps work
            without signing in. That is deliberate for the demo and would be removed in a live build.
          </Note>
        </div>
      </section>

      <section className="page-section alt" id="verification">
        <div className="wrap">
          <SectionHead
            eyebrow="Verification"
            title={
              <>
                Limits that <em>explain themselves.</em>
              </>
            }
            copy="Each level states what it unlocks before you start it. Apex does not ask for a BVN on the first screen and it does not hide a limit behind a support ticket."
          />
          <div className="kyc-levels">
            {levels.map((k) => (
              <div className="kyc" key={k.level}>
                <div className="kyc-top">
                  <span>{k.level}</span>
                  <BadgeCheck size={14} color="#1D52CE" />
                </div>
                <b>{k.title}</b>
                <ul>
                  {k.items.map((item) => (
                    <li key={item}>
                      <Check size={11} style={{ marginTop: 3, flexShrink: 0 }} /> {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <Note>
            In the demo, BVN and NIN checks are described but not performed — there is no identity
            provider wired in. A live product would verify through a licensed KYC provider and store
            only the result.
          </Note>
        </div>
      </section>

      <section className="page-section" id="custody">
        <div className="wrap">
          <SectionHead
            eyebrow="Custody"
            title={
              <>
                Apex is the interface, <em>not the custodian.</em>
              </>
            }
            copy="The design routes each job to an institution licensed to hold the risk. Apex would own the experience, the ledger records and the explanations — not the deposits, the payment licence or the brokerage."
          />
          <div className="page-grid four">
            <div className="mini-panel">
              <Landmark size={18} />
              <h3>Deposits</h3>
              <p>Held with partner banks. Deposit insurance only applies where that partner’s cover applies.</p>
            </div>
            <div className="mini-panel">
              <ShieldCheck size={18} />
              <h3>Payments</h3>
              <p>Deposits and withdrawals run on CBN-licensed payment rails, not an Apex-owned licence.</p>
            </div>
            <div className="mini-panel">
              <LineChart size={18} />
              <h3>Shares</h3>
              <p>Orders are routed to an SEC-registered broker. Apex does not execute trades itself.</p>
            </div>
            <div className="mini-panel">
              <Fingerprint size={18} />
              <h3>Data</h3>
              <p>Designed around NDPC-aligned practice: collect what the task needs, protect what is stored.</p>
            </div>
          </div>
          <div className="quote-band">
            <p>
              Custody is a signed agreement, not a feature on a website. In this concept the partner
              relationships are described as intent; a live product would publish the actual institution,
              account structure and coverage before accepting a deposit.
            </p>
          </div>
        </div>
      </section>

      <section className="page-section alt" id="gaps">
        <div className="wrap">
          <SectionHead
            eyebrow="The gaps"
            title={
              <>
                What is not <em>built yet.</em>
              </>
            }
            copy="A prototype is trustworthy when it is honest about its edges. This is the current list."
          />
          <div className="page-grid two">
            <div className="page-card">
              <h3>Working today</h3>
              <CheckList
                items={[
                  'Per-phone accounts with their own ledger owner',
                  'Hashed one-time codes with expiry and attempt limits',
                  'Database-backed rate limits across instances',
                  'Deposits, trades and plan funding through the ledger',
                  'Session revocation on logout',
                  'Daily database backups and point-in-time restore',
                ]}
              />
            </div>
            <div className="page-card">
              <h3>Not built yet</h3>
              <CheckList
                items={[
                  'An SMS gateway — until one is configured, codes appear on screen',
                  'A KYC provider for BVN and NIN checks',
                  'Real deposits, withdrawals and transfers through partner rails',
                  'Broker confirmation and settlement reporting',
                  'Account recovery when a phone is lost',
                  'Data export and deletion tools',
                ]}
              />
            </div>
          </div>
          <div className="page-card page-gap-note">
            <Lock size={18} />
            <div>
              <h3>What “security” means for a demo</h3>
              <p>
                The controls above protect the demo database, not your money — there is no money here.
                Treat any balance, price or receipt on this site as sample data, and never enter a real
                BVN, NIN or bank credential.
              </p>
            </div>
            <Database size={18} aria-hidden="true" />
          </div>
        </div>
      </section>

      <PageCta current="/security" title={<>Now read the price list.</>} />
    </>
  );
}
