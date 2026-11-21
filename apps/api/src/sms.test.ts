import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import pg from 'pg';
import { testDatabaseUrl } from '../scripts/database-url.js';

process.env.DATABASE_URL ??= testDatabaseUrl;
process.env.SMS_PROVIDER = 'termii';
process.env.TERMII_API_KEY = 'test-key';

type SentSms = { url: string; body: Record<string, string> };
let mode: 'ok' | 'fail' = 'ok';
const sent: SentSms[] = [];
sent.length = 0;

globalThis.fetch = (async (input: unknown, init?: { body?: unknown }) => {
  if (mode === 'fail') return new Response('{"message":"down"}', { status: 500 });
  sent.push({ url: String(input), body: JSON.parse(String(init?.body ?? '{}')) as Record<string, string> });
  return new Response('{"code":"ok"}', { status: 200, headers: { 'content-type': 'application/json' } });
}) as typeof fetch;

const { AuthError, requestCode } = await import('./auth.js');
const { smsConfigured } = await import('./sms.js');
const { SmsError } = await import('./sms.js');

const { Client } = pg;
const phones: string[] = [];

after(async () => {
  const client = new Client({ connectionString: testDatabaseUrl });
  await client.connect();
  try {
    if (phones.length > 0) {
      await client.query('delete from auth_challenges where phone = any($1::text[])', [phones]);
    }
  } finally {
    await client.end();
  }
});

test('a configured provider sends the code and the response omits it', async () => {
  assert.equal(smsConfigured, true);
  const phone = '0809 000 7711';
  phones.push('2348090007711');

  const issued = await requestCode({ phone });
  assert.equal(issued.devCode, undefined);
  assert.match(issued.challengeId, /^[0-9a-f-]{36}$/i);

  assert.equal(sent.length, 1);
  const [message] = sent;
  assert.equal(message!.url, 'https://api.ng.termii.com/api/sms/send');
  assert.equal(message!.body.to, '2348090007711');
  assert.equal(message!.body.api_key, 'test-key');
  assert.equal(message!.body.type, 'plain');
  assert.match(message!.body.sms ?? '', /code is \d{6}/);
});

test('a failed send rolls the challenge back and can be retried', async () => {
  mode = 'fail';
  const phone = '0809 000 7712';
  phones.push('2348090007712');

  await assert.rejects(
    () => requestCode({ phone }),
    (error: unknown) => error instanceof SmsError && error.code === 'sms_failed',
  );

  const client = new Client({ connectionString: testDatabaseUrl });
  await client.connect();
  try {
    const { rows } = await client.query<{ count: string }>(
      "select count(*)::text as count from auth_challenges where phone = '2348090007712'",
    );
    assert.equal(rows[0]?.count, '0');
  } finally {
    await client.end();
  }

  mode = 'ok';
  const sentBefore = sent.length;
  const issued = await requestCode({ phone });
  assert.equal(sent.length, sentBefore + 1);
  assert.equal(issued.devCode, undefined);
  assert.equal(sent.at(-1)!.body.to, '2348090007712');
});

test('an invalid phone never reaches the provider', async () => {
  const sentBefore = sent.length;
  await assert.rejects(
    () => requestCode({ phone: '12345' }),
    (error: unknown) => error instanceof AuthError && error.code === 'invalid_phone',
  );
  assert.equal(sent.length, sentBefore);
});
