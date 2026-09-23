import "server-only";

import { createHash } from "node:crypto";
import { eq, lt, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { authRateLimits } from "@/db/schema";

export type RateLimitRule = { key: string; limit: number; windowSeconds: number };
export type RateLimitResult = { allowed: true } | { allowed: false; retryAfterSeconds: number };

/** Keys never store raw emails or IPs. */
export function rateLimitKey(scope: string, value: string) {
  return `${scope}:${createHash("sha256").update(value).digest("hex").slice(0, 48)}`;
}

/**
 * Counts one attempt against each rule atomically in PostgreSQL, so the limit holds across instances.
 * The attempt is counted before the password is checked; callers clear per-account keys on success.
 */
export async function consumeRateLimit(rules: RateLimitRule[]): Promise<RateLimitResult> {
  const db = getDb();
  let retryAfterSeconds = 0;
  for (const rule of rules) {
    const window = sql`make_interval(secs => ${rule.windowSeconds})`;
    const result = await db.execute<{ count: number; retry_after: number }>(sql`
      INSERT INTO ${authRateLimits} (key, count, window_start) VALUES (${rule.key}, 1, now())
      ON CONFLICT (key) DO UPDATE SET
        count = CASE WHEN ${authRateLimits.windowStart} <= now() - ${window} THEN 1 ELSE ${authRateLimits.count} + 1 END,
        window_start = CASE WHEN ${authRateLimits.windowStart} <= now() - ${window} THEN now() ELSE ${authRateLimits.windowStart} END
      RETURNING count, CEIL(EXTRACT(EPOCH FROM (window_start + ${window} - now())))::int AS retry_after`);
    const row = result.rows[0];
    if (row && Number(row.count) > rule.limit) retryAfterSeconds = Math.max(retryAfterSeconds, Number(row.retry_after), 1);
  }
  if (Math.random() < 0.02) void pruneRateLimits().catch(() => undefined);
  return retryAfterSeconds > 0 ? { allowed: false, retryAfterSeconds } : { allowed: true };
}

export async function resetRateLimit(key: string) {
  await getDb().delete(authRateLimits).where(eq(authRateLimits.key, key));
}

async function pruneRateLimits() {
  await getDb().delete(authRateLimits).where(lt(authRateLimits.windowStart, sql`now() - interval '1 day'`));
}
