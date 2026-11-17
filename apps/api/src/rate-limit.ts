import { db } from './db.js';

export class RateLimitError extends Error {
  readonly status = 429;
  readonly code = 'too_many_requests';

  constructor(message = 'Too many requests. Wait a minute and try again.') {
    super(message);
  }
}

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

    const { rows } = await client.query<{ used: number }>(
      `select count(*)::int as used
         from rate_limits
        where bucket = $1 and subject = $2 and occurred_at > now() - make_interval(secs => $3)`,
      [bucket, subject, windowSeconds],
    );
    if ((rows[0]?.used ?? 0) >= limit) {
      await client.query('rollback');
      throw new RateLimitError();
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
