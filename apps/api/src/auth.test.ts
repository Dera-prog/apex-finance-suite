import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import pg from 'pg';
import { demoMobileState } from '../../../packages/shared/demo-state.js';
import { testDatabaseUrl } from '../scripts/database-url.js';

process.env.DATABASE_URL ??= testDatabaseUrl;

const { AuthError, canonicalPhone, ownerForToken, requestCode, signOut, verifyCode } = await import('./auth.js');
const { enforceRateLimit, RateLimitError } = await import('./rate-limit.js');
const { readLedgerState } = await import('./ledger.js');
const { deposit } = await import('./writes.js');

const { Client } = pg;

const connect = async () => {
  const client = new Client({ connectionString: testDatabaseUrl });
  await client.connect();
  return client;
};

let phoneSeq = 0;
const owners = new Set<string>();
const phones: string[] = [];
const rateSubjects: string[] = [];

const freshPhone = () => {
  phoneSeq += 1;
  return `0803${String(Date.now()).slice(-4)}${String(phoneSeq).padStart(3, '0')}`;
};

const signUp = async (phone = freshPhone(), name = 'Test User') => {
  const issued = await requestCode({ phone });
  const auth = await verifyCode({
    challengeId: issued.challengeId,
    code: issued.devCode!,
    name,
    email: 'test@example.com',
  });
  owners.add(auth.owner);
  phones.push(canonicalPhone(phone));
  return auth;
};

after(async () => {
  const client = await connect();
  try {
    const ids = [...owners];
    if (ids.length > 0) {
      await client.query('alter table postings disable trigger postings_no_delete');
      await client.query('delete from entries where owner_id = any($1::text[])', [ids]);
      await client.query('alter table postings enable trigger postings_no_delete');
      await client.query('delete from sessions where owner_id = any($1::text[])', [ids]);
      await client.query('delete from users where owner_id = any($1::text[])', [ids]);
      await client.query('delete from accounts where owner_id = any($1::text[])', [ids]);
      await client.query('delete from profiles where owner_id = any($1::text[])', [ids]);
    }
    if (phones.length > 0) {
      await client.query('delete from auth_challenges where phone = any($1::text[])', [phones]);
    }
    for (const subject of rateSubjects) {
      await client.query('delete from rate_limits where subject = $1', [subject]);
    }
  } finally {
    await client.end();
  }
});

test('phone numbers normalise to one canonical form', () => {
  assert.equal(canonicalPhone('0803 555 0147'), '2348035550147');
  assert.equal(canonicalPhone('+234 803 555 0147'), '2348035550147');
  assert.equal(canonicalPhone('2348035550147'), '2348035550147');
  assert.equal(canonicalPhone('8035550147'), '2348035550147');
  assert.throws(() => canonicalPhone('12345'), /Nigerian phone number/);
});

test('signing up provisions an empty ledger account', async () => {
  const auth = await signUp();
  assert.equal(auth.state.account, 'new');
  assert.equal(auth.state.walletNgnKobo, 0);
  assert.equal(auth.state.walletUsdCents, 0);
  assert.deepEqual(auth.state.plans, []);
  assert.deepEqual(auth.state.holdings, []);
  assert.deepEqual(auth.state.txns, []);
  assert.equal(auth.state.profile.name, 'Test User');
  assert.match(auth.state.profile.phone, /^\+234 80/);
  assert.ok(auth.state.notifications.some((notification) => notification.id === 'nt-welcome'));

  const client = await connect();
  try {
    const accounts = await client.query<{ code: string }>('select code from accounts where owner_id = $1 order by code', [
      auth.owner,
    ]);
    assert.deepEqual(
      accounts.rows.map((row) => row.code),
      ['external:NGN', 'external:USD', 'wallet:NGN', 'wallet:USD'],
    );
  } finally {
    await client.end();
  }
});

test('a wrong code is refused and a used code cannot be replayed', async () => {
  const phone = freshPhone();
  const issued = await requestCode({ phone });
  phones.push(canonicalPhone(phone));
  const wrong = issued.devCode === '000000' ? '111111' : '000000';

  await assert.rejects(
    () => verifyCode({ challengeId: issued.challengeId, code: wrong }),
    (error: unknown) => error instanceof AuthError && error.code === 'invalid_code',
  );

  const auth = await verifyCode({ challengeId: issued.challengeId, code: issued.devCode! });
  owners.add(auth.owner);

  await assert.rejects(
    () => verifyCode({ challengeId: issued.challengeId, code: issued.devCode! }),
    (error: unknown) => error instanceof AuthError && error.code === 'invalid_code',
  );
});

test('an expired or exhausted challenge is refused', async () => {
  const phone = freshPhone();
  const issued = await requestCode({ phone });
  phones.push(canonicalPhone(phone));
  const client = await connect();
  try {
    await client.query("update auth_challenges set expires_at = now() - interval '1 minute' where id = $1", [
      issued.challengeId,
    ]);
  } finally {
    await client.end();
  }
  await assert.rejects(
    () => verifyCode({ challengeId: issued.challengeId, code: issued.devCode! }),
    (error: unknown) => error instanceof AuthError && error.code === 'challenge_expired',
  );

  const second = await requestCode({ phone });
  const wrong = second.devCode === '000000' ? '111111' : '000000';
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await assert.rejects(() => verifyCode({ challengeId: second.challengeId, code: wrong }));
  }
  await assert.rejects(
    () => verifyCode({ challengeId: second.challengeId, code: second.devCode! }),
    (error: unknown) => error instanceof AuthError && error.code === 'too_many_attempts',
  );
});

test('requesting code after code is rate limited', async () => {
  const phone = freshPhone();
  phones.push(canonicalPhone(phone));
  for (let attempt = 0; attempt < 5; attempt += 1) await requestCode({ phone });
  await assert.rejects(
    () => requestCode({ phone }),
    (error: unknown) => error instanceof AuthError && error.code === 'too_many_requests',
  );
});

test('a session scopes reads and writes to its owner', async () => {
  const first = await signUp(freshPhone(), 'First Owner');
  const second = await signUp(freshPhone(), 'Second Owner');

  await deposit(
    { amountMinor: 25_000, source: 'Test bank', reference: 'APX-TEST-AUTH-01' },
    first.owner,
  );

  const firstState = await readLedgerState(first.owner);
  const secondState = await readLedgerState(second.owner);
  assert.ok(firstState && secondState);
  assert.equal(firstState.walletNgnKobo, 25_000);
  assert.equal(firstState.txns.length, 1);
  assert.equal(firstState.txns[0]!.ref, 'APX-TEST-AUTH-01');
  assert.equal(secondState.walletNgnKobo, 0);
  assert.equal(secondState.txns.length, 0);

  const client = await connect();
  try {
    const { rows } = await client.query<{ owner_id: string; total: string }>(
      `select a.owner_id, sum(p.amount_minor)::text as total
         from postings p
         join accounts a on a.id = p.account_id
        where a.owner_id = any($1::text[])
        group by a.owner_id`,
      [[first.owner, second.owner]],
    );
    assert.equal(rows.length, 1);
    assert.equal(Number(rows[0]!.total), 0);
  } finally {
    await client.end();
  }
});

test('the demo phone signs in to the demo account', async () => {
  const demo = demoMobileState();
  const phone = demo.profile.phone;
  const issued = await requestCode({ phone });
  phones.push(canonicalPhone(phone));
  const auth = await verifyCode({ challengeId: issued.challengeId, code: issued.devCode! });
  try {
    assert.equal(auth.owner, 'demo');
    assert.equal(auth.state.account, 'seed');
    assert.equal(auth.state.walletNgnKobo, demo.walletNgnKobo);
    assert.equal(auth.state.txns.length, demo.txns.length);
  } finally {
    await signOut(auth.token);
  }
});

test('signing out revokes the token', async () => {
  const auth = await signUp();
  assert.equal(await ownerForToken(auth.token), auth.owner);
  await signOut(auth.token);
  assert.equal(await ownerForToken(auth.token), null);
});

test('rate limits hold per subject and per window', async () => {
  const subject = `ip:test-${Date.now()}`;
  rateSubjects.push(subject);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await enforceRateLimit({ bucket: 'test', subject, limit: 3, windowSeconds: 60 });
  }
  await assert.rejects(
    () => enforceRateLimit({ bucket: 'test', subject, limit: 3, windowSeconds: 60 }),
    (error: unknown) => error instanceof RateLimitError && error.code === 'too_many_requests',
  );

  // A different subject has its own budget.
  const other = `${subject}-other`;
  rateSubjects.push(other);
  await enforceRateLimit({ bucket: 'test', subject: other, limit: 3, windowSeconds: 60 });

  // A window that has already elapsed does not count.
  const client = await connect();
  try {
    await client.query("update rate_limits set occurred_at = now() - interval '2 hours' where subject = $1", [subject]);
  } finally {
    await client.end();
  }
  await enforceRateLimit({ bucket: 'test', subject, limit: 3, windowSeconds: 60 });
});
