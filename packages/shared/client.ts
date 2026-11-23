import { API, planFundPath, planWithdrawPath } from './api.js';
import type {
  AuthResponse,
  DepositRequest,
  MobileStateResponse,
  OpenPlanRequest,
  PlanFundRequest,
  PlanWithdrawRequest,
  RequestCodeRequest,
  RequestCodeResponse,
  TradeRequest,
  TransferRequest,
  VerifyCodeRequest,
  WithdrawRequest,
} from './api.js';

/**
 * Every ledger write answers with the whole account state. A rejected call
 * carries the API's own code and message; an offline call means the server
 * never saw the request, so a signed-in client must not fake the outcome.
 */
export type LedgerOutcome =
  | { status: 'ok'; state: MobileStateResponse }
  | { status: 'rejected'; code: string; error: string }
  | { status: 'offline' };

export type AuthOutcome =
  | { status: 'ok'; auth: AuthResponse }
  | { status: 'rejected'; code: string; error: string }
  | { status: 'offline' };

export type CodeOutcome =
  | { status: 'ok'; challengeId: string; expiresAt: string; devCode?: string }
  | { status: 'rejected'; code: string; error: string }
  | { status: 'offline' };

export type SyncOutcome =
  | { status: 'ok'; state: MobileStateResponse }
  | { status: 'unauthorized' }
  | { status: 'offline' };

const rejection = (payload: unknown): { code: string; error: string } => {
  const body = (typeof payload === 'object' && payload !== null ? payload : {}) as { error?: unknown; message?: unknown };
  return {
    code: typeof body.error === 'string' ? body.error : 'request_failed',
    error: typeof body.message === 'string' ? body.message : 'That did not go through.',
  };
};

const authHeaders = (token?: string | null): Record<string, string> =>
  token ? { authorization: `Bearer ${token}` } : {};

async function post(base: string, path: string, body: unknown, token?: string | null): Promise<LedgerOutcome> {
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json', ...authHeaders(token) },
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

export const depositToLedger = (base: string, input: DepositRequest, token?: string | null) =>
  post(base, API.deposit, input, token);

export const tradeInLedger = (base: string, input: TradeRequest, token?: string | null) =>
  post(base, API.trade, input, token);

export const withdrawFromLedger = (base: string, input: WithdrawRequest, token?: string | null) =>
  post(base, API.withdraw, input, token);

export const transferFromLedger = (base: string, input: TransferRequest, token?: string | null) =>
  post(base, API.transfer, input, token);

export const fundPlanInLedger = (base: string, planId: string, input: PlanFundRequest, token?: string | null) =>
  post(base, planFundPath(planId), input, token);

export const openPlanInLedger = (base: string, input: OpenPlanRequest, token?: string | null) =>
  post(base, API.openPlan, input, token);

export const withdrawPlanInLedger = (base: string, planId: string, input: PlanWithdrawRequest, token?: string | null) =>
  post(base, planWithdrawPath(planId), input, token);

export async function requestSignInCode(base: string, input: RequestCodeRequest): Promise<CodeOutcome> {
  let res: Response;
  try {
    res = await fetch(`${base}${API.requestCode}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(input),
    });
  } catch {
    return { status: 'offline' };
  }

  const payload: unknown = await res.json().catch(() => null);
  if (res.ok) return { status: 'ok', ...(payload as RequestCodeResponse) };
  if (res.status === 503) return { status: 'offline' };
  return { status: 'rejected', ...rejection(payload) };
}

export async function verifySignInCode(base: string, input: VerifyCodeRequest): Promise<AuthOutcome> {
  let res: Response;
  try {
    res = await fetch(`${base}${API.verifyCode}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(input),
    });
  } catch {
    return { status: 'offline' };
  }

  const payload: unknown = await res.json().catch(() => null);
  if (res.ok) return { status: 'ok', auth: payload as AuthResponse };
  if (res.status === 503) return { status: 'offline' };
  return { status: 'rejected', ...rejection(payload) };
}

/** Reads the signed-in owner's state. A 401 means the stored token is no longer valid. */
export async function syncLedgerState(base: string, token: string): Promise<SyncOutcome> {
  let res: Response;
  try {
    res = await fetch(`${base}${API.demoState}`, {
      headers: { accept: 'application/json', ...authHeaders(token) },
    });
  } catch {
    return { status: 'offline' };
  }
  if (res.status === 401) return { status: 'unauthorized' };
  if (!res.ok) return { status: 'offline' };
  try {
    return { status: 'ok', state: (await res.json()) as MobileStateResponse };
  } catch {
    return { status: 'offline' };
  }
}

export async function signOutLedger(base: string, token: string): Promise<void> {
  try {
    await fetch(`${base}${API.logout}`, { method: 'POST', headers: { accept: 'application/json', ...authHeaders(token) } });
  } catch {
    /* the local token is dropped either way */
  }
}
