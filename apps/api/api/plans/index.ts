import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleRequest } from '../../src/app.js';

/** Served at /api/plans. */
export default function plans(req: IncomingMessage, res: ServerResponse) {
  return handleRequest(req, res);
}
