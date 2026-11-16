import { createServer } from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { API } from '../../../packages/shared/api.ts';
import type { HealthResponse } from '../../../packages/shared/api.ts';
import { sendJson } from './respond.ts';
import { getDemoState } from './routes/state.ts';

const PORT = Number(process.env.PORT ?? 4000);
const HOST = process.env.HOST ?? '127.0.0.1';
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN ?? '*';

type Method = 'GET' | 'POST';
type Handler = (req: IncomingMessage, res: ServerResponse) => void;

const startedAt = Date.now();

function getHealth(_req: IncomingMessage, res: ServerResponse) {
  const body: HealthResponse = {
    ok: true,
    service: 'apex-api',
    uptime: Math.round((Date.now() - startedAt) / 1000),
  };
  sendJson(res, 200, body);
}

const routes = new Map<string, Partial<Record<Method, Handler>>>([
  [API.health, { GET: getHealth }],
  [API.demoState, { GET: getDemoState }],
]);

const server = createServer((req, res) => {
  const started = Date.now();
  const method = (req.method ?? 'GET').toUpperCase();
  const pathname = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`).pathname;

  res.setHeader('access-control-allow-origin', ALLOWED_ORIGIN);
  res.setHeader('access-control-allow-methods', 'GET, POST, OPTIONS');
  res.setHeader('access-control-allow-headers', 'content-type, authorization');
  res.setHeader('vary', 'origin');

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
    handler(req, res);
  } catch (error) {
    console.error(error);
    if (!res.headersSent) sendJson(res, 500, { error: 'internal_error' });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`apex api listening on http://${HOST}:${PORT}`);
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}
