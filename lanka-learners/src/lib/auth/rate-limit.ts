import "server-only";

/**
 * Best-effort login throttle.
 *
 * Deliberately in-memory: it adds no infrastructure and blunts online password
 * guessing against a single instance. On serverless it is per-instance, so it
 * is a speed bump rather than a guarantee — put a WAF rate limit in front of
 * /api/auth/login if the deployment needs a hard limit.
 */

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;
const MAX_TRACKED_KEYS = 5_000;

type Bucket = { count: number; resetAt: number };

const globalForLimiter = globalThis as unknown as {
  loginAttempts: Map<string, Bucket> | undefined;
};

const attempts: Map<string, Bucket> =
  globalForLimiter.loginAttempts ?? new Map<string, Bucket>();
globalForLimiter.loginAttempts = attempts;

function prune(now: number) {
  for (const [key, bucket] of attempts) {
    if (bucket.resetAt <= now) attempts.delete(key);
  }
  // Hard cap so a flood of unique keys cannot grow the map without bound.
  if (attempts.size > MAX_TRACKED_KEYS) attempts.clear();
}

export type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

export function checkLoginRateLimit(key: string): RateLimitResult {
  const now = Date.now();
  prune(now);

  const bucket = attempts.get(key);

  if (!bucket || bucket.resetAt <= now) {
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (bucket.count >= MAX_ATTEMPTS) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

export function recordFailedLogin(key: string): void {
  const now = Date.now();
  const bucket = attempts.get(key);

  if (!bucket || bucket.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }

  bucket.count += 1;
}

export function clearLoginAttempts(key: string): void {
  attempts.delete(key);
}
