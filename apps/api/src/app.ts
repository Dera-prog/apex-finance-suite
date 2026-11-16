import type { IncomingMessage, ServerResponse } from 'node:http';
import { API } from '../../../packages/shared/api.js';
import type { HealthResponse } from '../../../packages/shared/api.js';
import { demoMobileState } from '../../../packages/shared/demo-state.js';
import { readLedgerState } from './ledger.js';
import { sendJson } from './respond.js';

type Method = 'GET' | 'POST';
type Handler = (req: IncomingMessage, res: ServerResponse) => void | Promise<void>;

const startedAt = Date.now();

function health(_req: IncomingMessage, res: ServerResponse) {
  const body: HealthResponse = {
    ok: true,
    service: 'apex-api',
    uptime: Math.round((Date.now() - startedAt) / 1000),
  };
  sendJson(res, 200, body);
}

async function state(_req: IncomingMessage, res: ServerResponse) {
  const fromLedger = await readLedgerState();
  sendJson(res, 200, fromLedger ?? demoMobileState());
}

const routes = new Map<string, Partial<Record<Method, Handler>>>([
  [API.health, { GET: health }],
  [API.demoState, { GET: state }],
]);

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

  const route = routes.get(pathname);
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
    console.error(error);
    if (!res.headersSent) sendJson(res, 500, { error: 'internal_error' });
  }
}
