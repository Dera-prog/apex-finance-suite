import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleRequest } from '../../src/app.js';

/** Served at /api/payments/checkout. */
export default function checkout(req: IncomingMessage, res: ServerResponse) {
  return handleRequest(req, res);
}
