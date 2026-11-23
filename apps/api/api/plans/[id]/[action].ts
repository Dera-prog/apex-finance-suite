import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleRequest } from '../../../src/app.js';

/** Served at /api/plans/:id/fund and /api/plans/:id/withdraw. */
export default function planAction(req: IncomingMessage, res: ServerResponse) {
  return handleRequest(req, res);
}
