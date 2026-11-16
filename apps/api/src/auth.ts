import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import type { PoolClient } from 'pg';
import type {
  AuthResponse,
  MobileStateResponse,
  RequestCodeResponse,
  VerifyCodeRequest,
} from '../../../packages/shared/api.js';
import { db } from './db.js';
import { LEDGER_OWNER } from './env.js';
import { readLedgerState } from './ledger.js';

const CODE_TTL = '10 minutes';
const SESSION_TTL = '30 days';
const MAX_ATTEMPTS = 5;
const MAX_CODES_PER_WINDOW = 5;
const AUTH_SECRET = (process.env.AUTH_SECRET ?? 'apex-dev-secret').trim();

export type AuthErrorCode =
  | 'invalid_phone'
  | 'invalid_code'
  | 'challenge_expired'
  | 'too_many_attempts'
  | 'too_many_requests'
  | 'auth_unavailable';

export class AuthError extends Error {
  constructor(
    readonly code: AuthErrorCode,
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

type Query = Pick<PoolClient, 'query'>;

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');
const codeHash = (phone: string, code: string) => sha256(`${phone}:${code}:${AUTH_SECRET}`);
const tokenHash = (token: string) => sha256(`token:${token}`);
const newToken = () => randomBytes(32).toString('base64url');

const sameHash = (expected: string, actual: string) => {
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(actual, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
};

/** Nigerian numbers only for now: stored as 234XXXXXXXXXX, accepted with +234, 0 or 234 prefixes. */
export function canonicalPhone(input: unknown): string {
  const digits = typeof input === 'string' ? input.replace(/\D/g, '') : '';
  if (digits.startsWith('234') && digits.length === 13) return digits;
  if (digits.startsWith('0') && digits.length === 11) return `234${digits.slice(1)}`;
  if (digits.length === 10) return `234${digits}`;
  throw new AuthError('invalid_phone', 400, 'Enter a Nigerian phone number.');
}

const displayPhone = (phone: string) =>
  phone.length === 13 && phone.startsWith('234')
    ? `+234 ${phone.slice(3, 6)} ${phone.slice(6, 9)} ${phone.slice(9)}`
    : `+${phone}`;

async function withDb<T>(run: (query: PoolClient) => Promise<T>): Promise<T> {
  const pool = db();
  if (!pool) throw new AuthError('auth_unavailable', 503, 'Sign-in needs the ledger database.');

  const client = await pool.connect();
  try {
    await client.query('begin');
    const result = await run(client);
    await client.query('commit');
    return result;
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

export async function requestCode(input: { phone?: unknown }): Promise<RequestCodeResponse> {
  const phone = canonicalPhone(input.phone);

  return withDb(async (query) => {
    const recent = await query.query<{ count: string }>(
      `select count(*)::text as count from auth_challenges
        where phone = $1 and created_at > now() - interval '${CODE_TTL}'`,
      [phone],
    );
    if (Number(recent.rows[0]?.count ?? 0) >= MAX_CODES_PER_WINDOW) {
      throw new AuthError('too_many_requests', 429, 'Too many codes requested. Try again in a few minutes.');
    }

    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    const { rows } = await query.query<{ id: string; expires_at: Date }>(
      `insert into auth_challenges (phone, code_hash, expires_at)
       values ($1, $2, now() + interval '${CODE_TTL}')
       returning id, expires_at`,
      [phone, codeHash(phone, code)],
    );
    const challenge = rows[0]!;

    return {
      challengeId: challenge.id,
      expiresAt: challenge.expires_at.toISOString(),
      // No SMS provider is configured yet, so the code travels back with the response.
      devCode: code,
    };
  });
}

export async function verifyCode(input: VerifyCodeRequest): Promise<AuthResponse> {
  const challengeId = typeof input?.challengeId === 'string' ? input.challengeId.trim() : '';
  const code = typeof input?.code === 'string' ? input.code.replace(/\D/g, '') : '';
  if (!/^[0-9a-f-]{36}$/i.test(challengeId) || code.length !== 6) {
    throw new AuthError('invalid_code', 400, 'That code is not valid.');
  }

  const pool = db();
  if (!pool) throw new AuthError('auth_unavailable', 503, 'Sign-in needs the ledger database.');

  // Read first so a wrong code can be counted without the surrounding transaction rolling it back.
  const precheck = await pool.query<{
    phone: string;
    code_hash: string;
    attempts: number;
    expires_at: Date;
    consumed_at: Date | null;
  }>('select phone, code_hash, attempts, expires_at, consumed_at from auth_challenges where id = $1', [challengeId]);
  const known = precheck.rows[0];
  if (!known || known.consumed_at) throw new AuthError('invalid_code', 400, 'That code is not valid.');
  if (known.expires_at.getTime() <= Date.now()) {
    throw new AuthError('challenge_expired', 400, 'That code has expired. Request a new one.');
  }
  if (known.attempts >= MAX_ATTEMPTS) {
    throw new AuthError('too_many_attempts', 429, 'Too many attempts. Request a new code.');
  }
  if (!sameHash(known.code_hash, codeHash(known.phone, code))) {
    await pool.query(
      'update auth_challenges set attempts = attempts + 1 where id = $1 and consumed_at is null',
      [challengeId],
    );
    throw new AuthError('invalid_code', 400, 'That code is not valid.');
  }

  const token = newToken();
  const issued = await withDb(async (query) => {
    const found = await query.query<{
      phone: string;
      code_hash: string;
      attempts: number;
      expires_at: Date;
      consumed_at: Date | null;
    }>('select phone, code_hash, attempts, expires_at, consumed_at from auth_challenges where id = $1 for update', [
      challengeId,
    ]);
    const challenge = found.rows[0];
    if (!challenge || challenge.consumed_at) throw new AuthError('invalid_code', 400, 'That code is not valid.');
    if (challenge.expires_at.getTime() <= Date.now()) {
      throw new AuthError('challenge_expired', 400, 'That code has expired. Request a new one.');
    }
    if (challenge.attempts >= MAX_ATTEMPTS) {
      throw new AuthError('too_many_attempts', 429, 'Too many attempts. Request a new code.');
    }
    if (!sameHash(challenge.code_hash, codeHash(challenge.phone, code))) {
      throw new AuthError('invalid_code', 400, 'That code is not valid.');
    }
    await query.query('update auth_challenges set consumed_at = now() where id = $1', [challengeId]);

    const owner = await ownerForPhone(query, challenge.phone);
    await ensureUser(query, owner, challenge.phone);
    await provisionOwner(query, owner, challenge.phone, input);

    const session = await query.query<{ expires_at: Date }>(
      `insert into sessions (token_hash, owner_id, expires_at)
       values ($1, $2, now() + interval '${SESSION_TTL}')
       returning expires_at`,
      [tokenHash(token), owner],
    );

    return { token, owner, expiresAt: session.rows[0]!.expires_at.toISOString() };
  });

  const state: MobileStateResponse | null = await readLedgerState(issued.owner);
  if (!state) throw new AuthError('auth_unavailable', 503, 'Could not load this account.');

  return { ...issued, state };
}

/** Owner for the bearer token, or null when it is unknown or expired. */
export async function ownerForToken(token: string): Promise<string | null> {
  const pool = db();
  if (!pool) throw new AuthError('auth_unavailable', 503, 'Sign-in needs the ledger database.');

  try {
    const { rows } = await pool.query<{ owner_id: string }>(
      'select owner_id from sessions where token_hash = $1 and expires_at > now()',
      [tokenHash(token)],
    );
    return rows[0]?.owner_id ?? null;
  } catch (error) {
    console.error('session lookup failed', error);
    throw new AuthError('auth_unavailable', 503, 'Could not check the session.');
  }
}

export async function signOut(token: string): Promise<void> {
  const pool = db();
  if (!pool) return;
  await pool.query('delete from sessions where token_hash = $1', [tokenHash(token)]);
}

async function ownerForPhone(query: Query, phone: string): Promise<string> {
  const known = await query.query<{ owner_id: string }>('select owner_id from users where phone = $1', [phone]);
  if (known.rows[0]) return known.rows[0].owner_id;

  const demoOwner = await query.query<{ phone: string }>('select phone from profiles where owner_id = $1', [
    LEDGER_OWNER,
  ]);
  const demoPhone = demoOwner.rows[0]?.phone;
  if (demoPhone && canonicalPhone(demoPhone) === phone) return LEDGER_OWNER;

  return `u_${randomBytes(8).toString('hex')}`;
}

async function ensureUser(query: Query, owner: string, phone: string) {
  const profile = await query.query<{ name: string }>('select name from profiles where owner_id = $1', [owner]);
  await query.query(
    `insert into users (owner_id, phone, name) values ($1, $2, $3)
     on conflict (owner_id) do nothing`,
    [owner, phone, profile.rows[0]?.name ?? ''],
  );
}

/** New owners start with empty wallets, no plans and no history, matching the app's zeroed dashboard. */
async function provisionOwner(query: Query, owner: string, phone: string, input: VerifyCodeRequest) {
  const existing = await query.query('select 1 from profiles where owner_id = $1', [owner]);
  if (existing.rows.length > 0) return;

  const accounts: Array<[string, string, 'wallet' | 'external', 'NGN' | 'USD']> = [
    ['wallet:NGN', 'Naira wallet', 'wallet', 'NGN'],
    ['wallet:USD', 'Dollar wallet', 'wallet', 'USD'],
    ['external:NGN', 'External naira', 'external', 'NGN'],
    ['external:USD', 'External dollar', 'external', 'USD'],
  ];
  for (const [code, name, kind, currency] of accounts) {
    await query.query(
      'insert into accounts (owner_id, code, name, kind, currency) values ($1,$2,$3,$4,$5)',
      [owner, code, name, kind, currency],
    );
  }

  const name = (typeof input?.name === 'string' ? input.name : '').trim().slice(0, 80) || 'Apex user';
  const email = (typeof input?.email === 'string' ? input.email : '').trim().slice(0, 120);
  const parts = name.split(/\s+/).filter(Boolean);
  const firstName = parts[0] ?? 'Friend';
  const initials = parts
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const memberSince = new Date().toLocaleDateString('en-NG', { month: 'long', year: 'numeric' });

  await query.query(
    `insert into profiles (owner_id, account_kind, name, first_name, initials, phone, email, bvn, nin, kyc_level,
                           kyc_label, address, member_since, bank_account, us_stocks_account, avatar_tint)
     values ($1,'new',$2,$3,$4,$5,$6,'Not verified','Not verified',1,'Level 1 · Phone verified',
             'Not added yet',$7,'None linked','Not issued yet','#FFDCCE')`,
    [owner, name, firstName, initials, displayPhone(phone), email, memberSince],
  );
}
