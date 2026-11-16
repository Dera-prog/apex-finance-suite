import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleRequest } from '../../../src/app.js';

/** Served at /api/plans/:id/fund. */
export default function fund(req: IncomingMessage, res: ServerResponse) {
  return handleRequest(req, res);
}
