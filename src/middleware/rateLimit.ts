/**
 * middleware/rateLimit.ts — per-IP sliding-window rate limiting.
 *
 * Port of ck_rate_check / ck_rate_record, kept database-backed on the existing
 * rate_limits table rather than swapped for express-rate-limit. Two reasons:
 * the counters survive a restart, and a second app process shares them. An
 * in-memory limiter would reset on every deploy, which is exactly when abuse
 * is easiest.
 *
 * The important behaviour, carried over from the PHP: an attempt is only
 * *recorded* once the action actually succeeds, so a visitor who fills the form
 * in wrong does not burn their hourly quota on validation errors.
 */

import type { RowDataPacket } from 'mysql2';
import { execute, logError, queryOne } from '../db';

export type Bucket = 'submit' | 'track' | 'login';

interface CountRow extends RowDataPacket {
  c: number;
}

/**
 * True when the caller is still under the limit.
 *
 * A limiter that has itself broken must not lock users out of a public service,
 * so a failure here logs and allows the request through.
 */
export async function rateCheck(
  bucket: Bucket,
  identifier: string,
  max: number,
  windowSeconds: number,
): Promise<boolean> {
  try {
    const cutoff = new Date(Date.now() - windowSeconds * 1000);
    const row = await queryOne<CountRow>(
      'SELECT COUNT(*) AS c FROM rate_limits WHERE bucket = ? AND identifier = ? AND occurred_at > ?',
      [bucket, identifier, cutoff],
    );
    return Number(row?.c ?? 0) < max;
  } catch (err) {
    logError(`Rate limit check failed for bucket ${bucket}`, err);
    return true;
  }
}

/**
 * Record one event against a bucket, and occasionally prune old rows so the
 * table does not grow without bound.
 */
export async function rateRecord(bucket: Bucket, identifier: string): Promise<void> {
  try {
    await execute('INSERT INTO rate_limits (bucket, identifier, occurred_at) VALUES (?, ?, ?)', [
      bucket,
      identifier,
      new Date(),
    ]);

    // Roughly 2% of calls sweep entries older than a day.
    if (Math.floor(Math.random() * 50) === 0) {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
      await execute('DELETE FROM rate_limits WHERE occurred_at < ?', [cutoff]);
    }
  } catch (err) {
    // Failing to record is not worth failing the user's request over — the
    // action they asked for has already succeeded at this point.
    logError(`Rate limit record failed for bucket ${bucket}`, err);
  }
}
