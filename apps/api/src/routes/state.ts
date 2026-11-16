import type { IncomingMessage, ServerResponse } from 'node:http';
import { demoMobileState } from '../../../../packages/shared/demo-state.ts';
import { sendJson } from '../respond.ts';

export function getDemoState(_req: IncomingMessage, res: ServerResponse) {
  sendJson(res, 200, demoMobileState());
}
