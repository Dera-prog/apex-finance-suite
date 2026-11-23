import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleRequest } from '../src/app.js';

/** Served at /api/withdraw. */
export default function withdraw(req: IncomingMessage, res: ServerResponse) {
  return handleRequest(req, res);
}
