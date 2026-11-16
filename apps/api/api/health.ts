import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleRequest } from '../src/app.ts';

/** Served at /api/health. */
export default function health(req: IncomingMessage, res: ServerResponse) {
  return handleRequest(req, res);
}
