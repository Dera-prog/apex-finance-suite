import { API, planFundPath } from './api.js';
import type { DepositRequest, MobileStateResponse, PlanFundRequest, TradeRequest } from './api.js';

/**
 * The three writes the ledger accepts. A rejected call carries the API's own
 * code and message; an offline call means the client should fall back to the
 * packaged demo state instead of failing the user.
 */
export type LedgerOutcome =
  | { status: 'ok'; state: MobileStateResponse }
  | { status: 'rejected'; code: string; error: string }
  | { status: 'offline' };

const rejection = (payload: unknown): { code: string; error: string } => {
  const body = (typeof payload === 'object' && payload !== null ? payload : {}) as { error?: unknown; message?: unknown };
  return {
    code: typeof body.error === 'string' ? body.error : 'request_failed',
    error: typeof body.message === 'string' ? body.message : 'That did not go through.',
  };
};

async function post(base: string, path: string, body: unknown): Promise<LedgerOutcome> {
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    return { status: 'offline' };
  }

  const payload: unknown = await res.json().catch(() => null);
  if (res.ok) return { status: 'ok', state: payload as MobileStateResponse };
  if (res.status === 503) return { status: 'offline' };
  return { status: 'rejected', ...rejection(payload) };
}

export const depositToLedger = (base: string, input: DepositRequest) => post(base, API.deposit, input);

export const tradeInLedger = (base: string, input: TradeRequest) => post(base, API.trade, input);

export const fundPlanInLedger = (base: string, planId: string, input: PlanFundRequest) =>
  post(base, planFundPath(planId), input);
