import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleRequest } from '../src/app.js';

/** Served at /api/trade. */
export default function trade(req: IncomingMessage, res: ServerResponse) {
  return handleRequest(req, res);
}
