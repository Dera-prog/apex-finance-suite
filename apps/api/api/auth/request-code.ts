import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleRequest } from '../../src/app.js';

/** Served at /api/auth/request-code. */
export default function requestCode(req: IncomingMessage, res: ServerResponse) {
  return handleRequest(req, res);
}
