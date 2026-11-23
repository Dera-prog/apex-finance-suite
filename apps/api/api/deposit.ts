import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleRequest } from '../src/app.js';

/** Served at /api/deposit. */
export default function deposit(req: IncomingMessage, res: ServerResponse) {
  return handleRequest(req, res);
}
