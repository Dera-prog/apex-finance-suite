import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleRequest } from '../src/app.js';

/**
 * One function for the whole API. Vercel's Hobby plan allows 12 serverless
 * functions per deployment, so routing lives in handleRequest instead of the
 * file tree; req.url keeps the original /api/... path.
 */
export default function api(req: IncomingMessage, res: ServerResponse) {
  return handleRequest(req, res);
}
