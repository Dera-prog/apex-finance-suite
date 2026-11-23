import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleRequest } from '../src/app.js';

/** Served at /api/transfer. */
export default function transfer(req: IncomingMessage, res: ServerResponse) {
  return handleRequest(req, res);
}
