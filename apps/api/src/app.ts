import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { API } from '../../../packages/shared/api.js';
import type {
  DepositRequest,
  HealthResponse,
  MobileStateResponse,
  OpenPlanRequest,
  PlanFundRequest,
  PlanWithdrawRequest,
  RequestCodeRequest,
  TradeRequest,
  TransferRequest,
  VerifyCodeRequest,
  WithdrawRequest,
} from '../../../packages/shared/api.js';
import { demoMobileState } from '../../../packages/shared/demo-state.js';
import { AuthError, ownerForToken, requestCode, signOut, verifyCode } from './auth.js';
import { db } from './db.js';
import { LEDGER_OWNER } from './env.js';
import { ledgerConnected, readLedgerState } from './ledger.js';
import {
  initializeCheckout,
  PaymentError,
  verifyWebhookSignature,
} from './payments.js';
import type { ChargeEvent } from './payments.js';
import { enforceRateLimit, RateLimitError } from './rate-limit.js';
import { SmsError } from './sms.js';
import {
  deposit,
  fundPlan,
  LedgerError,
  openPlan,
  trade,
  transfer,
  withdraw,
  withdrawPlan,
} from './writes.js';
import { sendJson } from './respond.js';

type Method = 'GET' | 'POST';
type Handler = (req: IncomingMessage, res: ServerResponse) => void | Promise<void>;

const startedAt = Date.now();
const BODY_LIMIT = 8 * 1024;

class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

async function health(_req: IncomingMessage, res: ServerResponse) {
  const body: HealthResponse = {
    ok: true,
    service: 'apex-api',
    uptime: Math.round((Date.now() - startedAt) / 1000),
    storage: (await ledgerConnected()) ? 'postgres' : 'demo-seed',
  };
  sendJson(res, 200, body);
}

const bearer = (req: IncomingMessage): string | null => {
  const header = req.headers.authorization;
  if (!header) return null;
  const match = /^Bearer\s+(\S+)$/i.exec(header);
  if (!match?.[1]) throw new HttpError(401, 'unauthorized', 'Send the token from sign-in as a bearer token.');
  return match[1];
};

const clientIp = (req: IncomingMessage): string => {
  const forwarded = req.headers['x-forwarded-for'];
  const first = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return first?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
};

/** Throttles a caller before the handler does any work. Limits are per instance-shared window. */
async function limitIp(req: IncomingMessage, bucket: string, limit: number, windowSeconds: number) {
  await enforceRateLimit({ bucket, subject: `ip:${clientIp(req)}`, limit, windowSeconds });
}

/** Money moves are limited per account and per caller, so one client cannot drain a shared IP budget. */
async function limitWrite(req: IncomingMessage, owner: string) {
  await enforceRateLimit({ bucket: 'write', subject: `owner:${owner}`, limit: 30, windowSeconds: 60 });
  await limitIp(req, 'write', 60, 60);
}

/** The signed-in owner, or null for the public demo when no token was sent. */
async function ownerFrom(req: IncomingMessage): Promise<string | null> {
  const token = bearer(req);
  if (!token) return null;
  const owner = await ownerForToken(token);
  if (!owner) throw new HttpError(401, 'session_expired', 'That sign-in has expired. Sign in again.');
  return owner;
}

async function state(req: IncomingMessage, res: ServerResponse) {
  await limitIp(req, 'state', 300, 60);
  const owner = await ownerFrom(req);
  const fromLedger = await readLedgerState(owner ?? undefined);
  sendJson(res, 200, fromLedger ?? demoMobileState());
}

async function readBody(req: IncomingMessage) {
  const chunks: Buffer[] = [];
  let size = 0;

  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > BODY_LIMIT) throw new HttpError(413, 'payload_too_large', 'Request body is too large.');
    chunks.push(buffer);
  }

  if (size === 0) return {} as Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {};
  } catch {
    throw new HttpError(400, 'invalid_json', 'Request body must be JSON.');
  }
}

/** Webhooks are signed over the exact bytes sent, so they need the unparsed body. */
async function readRawBody(req: IncomingMessage, limit = 64 * 1024) {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > limit) throw new HttpError(413, 'payload_too_large', 'Request body is too large.');
    chunks.push(buffer);
  }
  return Buffer.concat(chunks).toString('utf8');
}

/** A write answers with the whole state so the caller never has to reassemble it. */
async function respondWithState(res: ServerResponse, owner = LEDGER_OWNER) {
  const next: MobileStateResponse | null = await readLedgerState(owner);
  if (!next) throw new LedgerError('ledger_unavailable', 503, 'The ledger database is not configured.');
  sendJson(res, 200, next);
}

async function depositHandler(req: IncomingMessage, res: ServerResponse) {
  const body = await readBody(req);
  const owner = (await ownerFrom(req)) ?? LEDGER_OWNER;
  await limitWrite(req, owner);
  await deposit(body as unknown as DepositRequest, owner);
  await respondWithState(res, owner);
}

async function withdrawHandler(req: IncomingMessage, res: ServerResponse) {
  const body = await readBody(req);
  const owner = (await ownerFrom(req)) ?? LEDGER_OWNER;
  await limitWrite(req, owner);
  await withdraw(body as unknown as WithdrawRequest, owner);
  await respondWithState(res, owner);
}

async function transferHandler(req: IncomingMessage, res: ServerResponse) {
  const body = await readBody(req);
  const owner = (await ownerFrom(req)) ?? LEDGER_OWNER;
  await limitWrite(req, owner);
  await transfer(body as unknown as TransferRequest, owner);
  await respondWithState(res, owner);
}

async function openPlanHandler(req: IncomingMessage, res: ServerResponse) {
  const body = await readBody(req);
  const owner = (await ownerFrom(req)) ?? LEDGER_OWNER;
  await limitWrite(req, owner);
  await openPlan(body as unknown as OpenPlanRequest, owner);
  await respondWithState(res, owner);
}

async function tradeHandler(req: IncomingMessage, res: ServerResponse) {
  const body = await readBody(req);
  const owner = (await ownerFrom(req)) ?? LEDGER_OWNER;
  await limitWrite(req, owner);
  await trade(body as unknown as TradeRequest, owner);
  await respondWithState(res, owner);
}

function fundPlanHandler(planId: string): Handler {
  return async (req, res) => {
    const body = await readBody(req);
    const owner = (await ownerFrom(req)) ?? LEDGER_OWNER;
    await limitWrite(req, owner);
    await fundPlan(planId, body as unknown as PlanFundRequest, owner);
    await respondWithState(res, owner);
  };
}

function withdrawPlanHandler(planId: string): Handler {
  return async (req, res) => {
    const body = await readBody(req);
    const owner = (await ownerFrom(req)) ?? LEDGER_OWNER;
    await limitWrite(req, owner);
    await withdrawPlan(planId, body as unknown as PlanWithdrawRequest, owner);
    await respondWithState(res, owner);
  };
}

async function checkoutHandler(req: IncomingMessage, res: ServerResponse) {
  await limitIp(req, 'checkout', 20, 600);
  const token = bearer(req);
  if (!token) throw new HttpError(401, 'sign_in_required', 'Sign in before funding your wallet.');
  const owner = await ownerForToken(token);
  if (!owner) throw new HttpError(401, 'session_expired', 'That sign-in has expired. Sign in again.');

  const body = await readBody(req);
  const amount = body.amountMinor;
  if (typeof amount !== 'number' || !Number.isInteger(amount)) {
    throw new HttpError(400, 'invalid_amount', 'Amount must be a whole number of kobo.');
  }
  if (amount < 10_000) throw new HttpError(400, 'amount_below_minimum', 'Enter at least ₦100.');
  if (amount > 1_000_000_000) throw new HttpError(400, 'amount_above_limit', 'Amount is above the ₦10,000,000 demo limit.');

  const pool = db();
  if (!pool) throw new HttpError(503, 'ledger_unavailable', 'The ledger database is not configured.');
  const profile = await pool.query<{ email: string }>('select email from profiles where owner_id = $1', [owner]);
  const email = (
    (typeof body.email === 'string' ? body.email.trim() : '') || profile.rows[0]?.email || ''
  ).trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpError(400, 'email_required', 'Add an email address before paying by card.');
  }

  const supplied = typeof body.reference === 'string' ? body.reference.trim() : '';
  const reference = /^[A-Za-z0-9._-]{4,40}$/.test(supplied) ? supplied : `APX-PSK-${randomUUID().slice(0, 12)}`;
  const callbackUrl = (process.env.PAYMENT_RETURN_URL ?? '').trim() || undefined;

  const checkout = await initializeCheckout({ email, amountMinor: amount, reference, callbackUrl, owner });
  sendJson(res, 200, { authorizationUrl: checkout.authorizationUrl, reference: checkout.reference });
}

async function paymentWebhookHandler(req: IncomingMessage, res: ServerResponse) {
  const raw = await readRawBody(req);
  if (!verifyWebhookSignature(raw, req.headers['x-paystack-signature'])) {
    sendJson(res, 401, { error: 'bad_signature' });
    return;
  }

  let event: ChargeEvent;
  try {
    event = JSON.parse(raw) as ChargeEvent;
  } catch {
    throw new HttpError(400, 'invalid_json', 'Webhook body must be JSON.');
  }

  if (event.event !== 'charge.success' || event.data?.status !== 'success' || event.data.currency !== 'NGN') {
    res.writeHead(200);
    res.end();
    return;
  }

  const owner = typeof event.data.metadata?.owner === 'string' ? event.data.metadata.owner.trim() : '';
  const amount = event.data.amount;
  const paystackRef = typeof event.data.reference === 'string' ? event.data.reference.trim() : '';
  if (!owner || !paystackRef || typeof amount !== 'number' || !Number.isInteger(amount)) {
    res.writeHead(200);
    res.end();
    return;
  }

  const pool = db();
  if (!pool) throw new HttpError(503, 'ledger_unavailable', 'The ledger database is not configured.');
  const known = await pool.query('select 1 from profiles where owner_id = $1', [owner]);
  if (known.rows.length === 0) {
    console.warn('paystack webhook for unknown owner', owner);
    res.writeHead(200);
    res.end();
    return;
  }

  const reference = `PSK-${paystackRef}`.slice(0, 40);
  try {
    await deposit({ amountMinor: amount, source: 'Paystack card', reference }, owner);
  } catch (error) {
    if (error instanceof LedgerError && error.code === 'duplicate_reference') {
      // Paystack retries a webhook it did not see acknowledged; the credit already landed.
      res.writeHead(200);
      res.end();
      return;
    }
    throw error;
  }

  res.writeHead(200);
  res.end();
}

async function requestCodeHandler(req: IncomingMessage, res: ServerResponse) {
  await limitIp(req, 'code-request', 10, 600);
  const body = await readBody(req);
  sendJson(res, 200, await requestCode(body as unknown as RequestCodeRequest));
}

async function verifyCodeHandler(req: IncomingMessage, res: ServerResponse) {
  await limitIp(req, 'code-verify', 40, 600);
  const body = await readBody(req);
  sendJson(res, 200, await verifyCode(body as unknown as VerifyCodeRequest));
}

async function logoutHandler(req: IncomingMessage, res: ServerResponse) {
  const token = bearer(req);
  if (token) await signOut(token);
  res.writeHead(204);
  res.end();
}

const routes = new Map<string, Partial<Record<Method, Handler>>>([
  [API.health, { GET: health }],
  [API.demoState, { GET: state }],
  [API.deposit, { POST: depositHandler }],
  [API.withdraw, { POST: withdrawHandler }],
  [API.transfer, { POST: transferHandler }],
  [API.trade, { POST: tradeHandler }],
  [API.openPlan, { POST: openPlanHandler }],
  [API.checkout, { POST: checkoutHandler }],
  [API.paymentWebhook, { POST: paymentWebhookHandler }],
  [API.requestCode, { POST: requestCodeHandler }],
  [API.verifyCode, { POST: verifyCodeHandler }],
  [API.logout, { POST: logoutHandler }],
]);

const planActionRoute = /^\/api\/plans\/([^/]+)\/(fund|withdraw)$/;

const routeFor = (pathname: string): Partial<Record<Method, Handler>> | undefined => {
  const exact = routes.get(pathname);
  if (exact) return exact;

  const match = planActionRoute.exec(pathname);
  if (!match?.[1] || !match[2]) return undefined;

  const planId = decodeURIComponent(match[1]);
  return { POST: match[2] === 'fund' ? fundPlanHandler(planId) : withdrawPlanHandler(planId) };
};

const allowedOrigin = () => process.env.ALLOWED_ORIGIN ?? '*';

/** One request handler for both the local node server and the Vercel function. */
export async function handleRequest(req: IncomingMessage, res: ServerResponse) {
  const started = Date.now();
  const method = (req.method ?? 'GET').toUpperCase();
  const pathname = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`).pathname;

  const cors = {
    'access-control-allow-origin': allowedOrigin(),
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'content-type, authorization',
    vary: 'origin',
  };
  for (const [name, value] of Object.entries(cors)) res.setHeader(name, value);

  res.on('finish', () => {
    console.log(`${method} ${pathname} ${res.statusCode} ${Date.now() - started}ms`);
  });

  if (method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const route = routeFor(pathname);
  if (!route) {
    sendJson(res, 404, { error: 'not_found' });
    return;
  }

  const handler = route[method as Method];
  if (!handler) {
    res.setHeader('allow', Object.keys(route).join(', '));
    sendJson(res, 405, { error: 'method_not_allowed' });
    return;
  }

  try {
    await handler(req, res);
  } catch (error) {
    if (
      error instanceof LedgerError ||
      error instanceof HttpError ||
      error instanceof AuthError ||
      error instanceof PaymentError ||
      error instanceof RateLimitError ||
      error instanceof SmsError
    ) {
      sendJson(res, error.status, { error: error.code, message: error.message });
      return;
    }
    console.error(error);
    if (!res.headersSent) sendJson(res, 500, { error: 'internal_error' });
  }
}
