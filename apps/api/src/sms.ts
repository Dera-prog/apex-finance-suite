/**
 * Sends sign-in codes over SMS. Providers are selected with SMS_PROVIDER so the
 * app code stays the same whichever gateway is used. When no provider is set
 * (the current demo), request-code returns the code instead and the OTP screen
 * shows it.
 */

const provider = (process.env.SMS_PROVIDER ?? '').trim().toLowerCase();

export type SmsProvider = 'termii' | 'twilio' | 'africastalking' | '';

export const smsProvider = provider as SmsProvider;
export const smsConfigured = provider.length > 0;

export class SmsError extends Error {
  readonly status = 502;
  readonly code = 'sms_failed';

  constructor(message = 'Could not send the code by SMS. Try again.') {
    super(message);
  }
}

const TIMEOUT_MS = 10_000;

const messageFor = (code: string) =>
  `Apex Finance: your sign-in code is ${code}. It expires in 10 minutes. Do not share it.`;

const requireEnv = (name: string) => {
  const value = (process.env[name] ?? '').trim();
  if (!value) throw new SmsError(`SMS is not configured: set ${name}.`);
  return value;
};

const failure = (name: string, status: number, detail: string) => {
  console.error(`sms ${name} failed with ${status}: ${detail.slice(0, 200)}`);
  return new SmsError();
};

async function sendWithTermii(to: string, message: string) {
  const apiKey = requireEnv('TERMII_API_KEY');
  const from = (process.env.TERMII_SENDER_ID ?? 'N-Alert').trim();

  const res = await fetch('https://api.ng.termii.com/api/sms/send', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ api_key: apiKey, to, from, sms: message, type: 'plain', channel: 'generic' }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const body = (await res.json().catch(() => ({}))) as { code?: unknown; message?: unknown };
  if (!res.ok || (typeof body.code === 'string' && body.code.toLowerCase() !== 'ok')) {
    throw failure('termii', res.status, String(body.message ?? body.code ?? ''));
  }
}

async function sendWithTwilio(to: string, message: string) {
  const sid = requireEnv('TWILIO_ACCOUNT_SID');
  const token = requireEnv('TWILIO_AUTH_TOKEN');
  const from = requireEnv('TWILIO_FROM');

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`, {
    method: 'POST',
    headers: {
      authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
      'content-type': 'application/x-www-form-urlencoded',
      accept: 'application/json',
    },
    body: new URLSearchParams({ To: `+${to}`, From: from, Body: message }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw failure('twilio', res.status, await res.text().catch(() => ''));
}

async function sendWithAfricasTalking(to: string, message: string) {
  const username = requireEnv('AT_USERNAME');
  const apiKey = requireEnv('AT_API_KEY');
  const from = (process.env.AT_SENDER_ID ?? '').trim();

  const form = new URLSearchParams({ username, to: `+${to}`, message });
  if (from) form.set('from', from);

  const res = await fetch('https://api.africastalking.com/version1/messaging', {
    method: 'POST',
    headers: { apiKey, 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
    body: form,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const body = (await res.json().catch(() => ({}))) as {
    SMSMessageData?: { Recipients?: Array<{ status?: string }> };
  };
  const status = body.SMSMessageData?.Recipients?.[0]?.status;
  if (!res.ok || status !== 'Success') throw failure('africastalking', res.status, String(status ?? ''));
}

/** Sends the six-digit code to a canonical 234XXXXXXXXXX number. */
export async function sendLoginCode(phone: string, code: string): Promise<void> {
  const message = messageFor(code);
  switch (smsProvider) {
    case 'termii':
      return sendWithTermii(phone, message);
    case 'twilio':
      return sendWithTwilio(phone, message);
    case 'africastalking':
      return sendWithAfricasTalking(phone, message);
    default:
      throw new SmsError(`Unknown SMS_PROVIDER "${provider}". Use termii, twilio or africastalking.`);
  }
}
