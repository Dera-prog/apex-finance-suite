import { db } from './db.js';

export class RateLimitError extends Error {
  readonly status = 429;
  readonly code = 'too_many_requests';

  constructor(message = 'Too many requests. Wait a minute and try again.') {
    super(message);
  }
}

/** "48 seconds" / "3 minutes" — the client shows this verbatim, so keep it sentence-ready. */
export const waitCopy = (seconds: number) => {
  const secs = Math.max(1, Math.round(seconds));
  return secs < 90 ? `${secs} second${secs === 1 ? '' : 's'}` : `${Math.ceil(secs / 60)} minutes`;
};

type Limit = {
  bucket: string;
  subject: string;
  limit: number;
  windowSeconds: number;
};

/** Counts one attempt and rejects once the subject is over the limit for the window. */
export async function enforceRateLimit({ bucket, subject, limit, windowSeconds }: Limit): Promise<void> {
  const pool = db();
  if (!pool) return;

  const client = await pool.connect();
  try {
    await client.query('begin');
    // Serialise per subject so simultaneous requests cannot both slip under the limit.
    await client.query('select pg_advisory_xact_lock(hashtext($1))', [`${bucket}:${subject}`]);

    const { rows } = await client.query<{ used: number; wait: number }>(
      `select count(*)::int as used,
              coalesce(
                greatest(1, ceil(extract(epoch from (min(occurred_at) + make_interval(secs => $3) - now())))),
                1
              )::int as wait
         from rate_limits
        where bucket = $1 and subject = $2 and occurred_at > now() - make_interval(secs => $3)`,
      [bucket, subject, windowSeconds],
    );
    const used = rows[0]?.used ?? 0;
    if (used >= limit) {
      const wait = rows[0]?.wait ?? (windowSeconds <= 600 ? windowSeconds : 60);
      await client.query('rollback');
      throw new RateLimitError(`Too many requests. Try again in ${waitCopy(wait)}.`);
    }

    await client.query('insert into rate_limits (bucket, subject) values ($1, $2)', [bucket, subject]);
    if (Math.random() < 0.02) {
      await client.query("delete from rate_limits where occurred_at < now() - interval '2 days'");
    }
    await client.query('commit');
  } catch (error) {
    if (!(error instanceof RateLimitError)) await client.query('rollback').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
