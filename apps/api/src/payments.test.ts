import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { test } from 'node:test';
import { initializeCheckout, PaymentError, paymentsConfigured, verifyWebhookSignature } from './payments.js';

const KEY = 'sk_test_apex_local';

const signed = (body: string, key = KEY) => createHmac('sha512', key).update(body).digest('hex');

type Reply = { status?: number; body?: unknown; refuse?: boolean };
let reply: Reply = {};

globalThis.fetch = (async () => {
  if (reply.refuse) throw new TypeError('network down');
  return new Response(JSON.stringify(reply.body ?? {}), {
    status: reply.status ?? 200,
    headers: { 'content-type': 'application/json' },
  });
}) as typeof fetch;

test('without a secret key card funding is off and webhooks are refused', async () => {
  delete process.env.PAYSTACK_SECRET_KEY;
  assert.equal(paymentsConfigured(), false);
  assert.equal(verifyWebhookSignature('{}', signed('{}')), false);

  await assert.rejects(
    initializeCheckout({ email: 'ada@example.com', amountMinor: 500_000, reference: 'APX-1', owner: 'demo' }),
    (error: unknown) =>
      error instanceof PaymentError && error.code === 'payments_not_configured' && error.status === 503,
  );
});

test('a webhook signature must match the exact bytes and the configured key', () => {
  process.env.PAYSTACK_SECRET_KEY = KEY;
  const raw = JSON.stringify({ event: 'charge.success', data: { reference: 'APX-1', amount: 500_000 } });

  assert.equal(verifyWebhookSignature(raw, signed(raw)), true);
  assert.equal(verifyWebhookSignature(raw, signed(raw).toUpperCase()), true, 'header case does not matter');
  assert.equal(verifyWebhookSignature(raw, signed(raw, 'sk_test_someone_else')), false);
  assert.equal(verifyWebhookSignature(`${raw} `, signed(raw)), false);
  assert.equal(verifyWebhookSignature(raw, undefined), false);
  assert.equal(verifyWebhookSignature(raw, ''), false);
});

test('checkout returns the provider authorization URL for the requested reference', async () => {
  process.env.PAYSTACK_SECRET_KEY = KEY;
  reply = {
    body: {
      status: true,
      data: { authorization_url: 'https://checkout.paystack.com/abc123', access_code: 'abc123', reference: 'APX-1' },
    },
  };

  const checkout = await initializeCheckout({
    email: 'ada@example.com',
    amountMinor: 500_000,
    reference: 'APX-1',
    callbackUrl: 'https://apex-finance-desktop.vercel.app/wallet',
    owner: 'demo',
  });

  assert.equal(checkout.authorizationUrl, 'https://checkout.paystack.com/abc123');
  assert.equal(checkout.reference, 'APX-1');
});

test('a refused or unreachable provider surfaces as 502 instead of a fake success', async () => {
  process.env.PAYSTACK_SECRET_KEY = KEY;
  const input = { email: 'ada@example.com', amountMinor: 500_000, reference: 'APX-2', owner: 'demo' };

  reply = { status: 400, body: { status: false, message: 'Invalid amount' } };
  await assert.rejects(
    initializeCheckout(input),
    (error: unknown) => error instanceof PaymentError && error.code === 'payment_init_failed' && error.status === 502,
  );

  reply = { refuse: true };
  await assert.rejects(
    initializeCheckout(input),
    (error: unknown) => error instanceof PaymentError && error.code === 'payment_init_failed' && error.status === 502,
  );
});
