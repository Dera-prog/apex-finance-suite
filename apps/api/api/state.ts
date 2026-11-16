import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleRequest } from '../src/app.js';

/** Served at /api/state. The node runtime hands these the same req/res shapes as the local server. */
export default function state(req: IncomingMessage, res: ServerResponse) {
  return handleRequest(req, res);
}
