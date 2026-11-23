import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleRequest } from '../../src/app.js';

/** Served at /api/auth/verify-code. */
export default function verifyCode(req: IncomingMessage, res: ServerResponse) {
  return handleRequest(req, res);
}
