import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleRequest } from '../../src/app.js';

/** Served at /api/payments/checkout and /api/payments/webhook. */
export default function payments(req: IncomingMessage, res: ServerResponse) {
  return handleRequest(req, res);
}
