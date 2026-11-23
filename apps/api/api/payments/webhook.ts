import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleRequest } from '../../src/app.js';

/** Served at /api/payments/webhook. It reads the raw body itself to verify the signature. */
export default function webhook(req: IncomingMessage, res: ServerResponse) {
  return handleRequest(req, res);
}
