/**
 * Paystack checkout for wallet funding. Nothing here runs until a test secret key
 * is configured, so the demo deposit path keeps working with no keys at all.
 * Cards are entered on Paystack's hosted page; Apex never sees them.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';

const PAYSTACK_BASE = 'https://api.paystack.co';
const TIMEOUT_MS = 10_000;

export class PaymentError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

const secretKey = () => (process.env.PAYSTACK_SECRET_KEY ?? '').trim();
export const paymentsConfigured = () => secretKey().length > 0;
export const publicKey = () => (process.env.PAYSTACK_PUBLIC_KEY ?? '').trim();

type PaystackInit = {
  status?: boolean;
  message?: string;
  data?: { authorization_url?: string; access_code?: string; reference?: string };
};

export async function initializeCheckout(input: {
  email: string;
  amountMinor: number;
  reference: string;
  callbackUrl?: string;
  owner: string;
}) {
  const secret = secretKey();
  if (!secret) {
    throw new PaymentError('payments_not_configured', 503, 'Card payments are not switched on yet.');
  }

  let res: Response;
  try {
    res = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${secret}`,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        email: input.email,
        amount: input.amountMinor,
        reference: input.reference,
        callback_url: input.callbackUrl,
        metadata: { owner: input.owner, product: 'apex-wallet' },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    console.error('paystack initialize failed', error);
    throw new PaymentError('payment_init_failed', 502, 'Could not reach the payment provider. Try again.');
  }

  const body = (await res.json().catch(() => ({}))) as PaystackInit;
  if (!res.ok || body.status !== true || !body.data?.authorization_url) {
    throw new PaymentError('payment_init_failed', 502, body.message ?? 'The payment provider refused the request.');
  }

  return {
    authorizationUrl: body.data.authorization_url,
    accessCode: body.data.access_code ?? '',
    reference: body.data.reference ?? input.reference,
  };
}

/** Paystack signs the raw request body with HMAC-SHA512 using the secret key. */
export function verifyWebhookSignature(rawBody: string, signature: string | undefined | string[]) {
  const secret = secretKey();
  if (!secret || typeof signature !== 'string' || signature.length === 0) return false;

  const expected = createHmac('sha512', secret).update(rawBody).digest('hex');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(signature.trim().toLowerCase(), 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

export type ChargeEvent = {
  event?: string;
  data?: {
    status?: string;
    reference?: string;
    amount?: number;
    currency?: string;
    metadata?: { owner?: string };
  };
};
