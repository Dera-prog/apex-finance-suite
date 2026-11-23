import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleRequest } from '../../src/app.js';

/** Served at /api/auth/logout. */
export default function logout(req: IncomingMessage, res: ServerResponse) {
  return handleRequest(req, res);
}
