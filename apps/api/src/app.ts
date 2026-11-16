import type { IncomingMessage, ServerResponse } from 'node:http';
import { API } from '../../../packages/shared/api.js';
import type {
  DepositRequest,
  HealthResponse,
  MobileStateResponse,
  PlanFundRequest,
  TradeRequest,
} from '../../../packages/shared/api.js';
import { demoMobileState } from '../../../packages/shared/demo-state.js';
import { ledgerConnected, readLedgerState } from './ledger.js';
import { deposit, fundPlan, LedgerError, trade } from './writes.js';
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

async function state(_req: IncomingMessage, res: ServerResponse) {
  const fromLedger = await readLedgerState();
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

/** A write answers with the whole state so the caller never has to reassemble it. */
async function respondWithState(res: ServerResponse) {
  const next: MobileStateResponse | null = await readLedgerState();
  if (!next) throw new LedgerError('ledger_unavailable', 503, 'The ledger database is not configured.');
  sendJson(res, 200, next);
}

async function depositHandler(req: IncomingMessage, res: ServerResponse) {
  const body = await readBody(req);
  await deposit(body as unknown as DepositRequest);
  await respondWithState(res);
}

async function tradeHandler(req: IncomingMessage, res: ServerResponse) {
  const body = await readBody(req);
  await trade(body as unknown as TradeRequest);
  await respondWithState(res);
}

function fundPlanHandler(planId: string): Handler {
  return async (req, res) => {
    const body = await readBody(req);
    await fundPlan(planId, body as unknown as PlanFundRequest);
    await respondWithState(res);
  };
}

const routes = new Map<string, Partial<Record<Method, Handler>>>([
  [API.health, { GET: health }],
  [API.demoState, { GET: state }],
  [API.deposit, { POST: depositHandler }],
  [API.trade, { POST: tradeHandler }],
]);

const planFundRoute = /^\/api\/plans\/([^/]+)\/fund$/;

const routeFor = (pathname: string): Partial<Record<Method, Handler>> | undefined => {
  const exact = routes.get(pathname);
  if (exact) return exact;

  const match = planFundRoute.exec(pathname);
  if (!match?.[1]) return undefined;

  return { POST: fundPlanHandler(decodeURIComponent(match[1])) };
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
    if (error instanceof LedgerError || error instanceof HttpError) {
      sendJson(res, error.status, { error: error.code, message: error.message });
      return;
    }
    console.error(error);
    if (!res.headersSent) sendJson(res, 500, { error: 'internal_error' });
  }
}
