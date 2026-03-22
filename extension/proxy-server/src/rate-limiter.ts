/** IP-based rate limiter using in-memory Map (resets on worker restart) */

const MAX_REQUESTS = 60;
const WINDOW_MS = 60 * 1000; // 1 minute

interface RateEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateEntry>();

/** Check if request is allowed. Returns retry-after seconds if blocked, or 0 if allowed. */
export function checkRateLimit(ip: string): number {
  const now = Date.now();
  const entry = store.get(ip);

  if (!entry || now > entry.resetAt) {
    store.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return 0;
  }

  entry.count++;
  if (entry.count > MAX_REQUESTS) {
    return Math.ceil((entry.resetAt - now) / 1000);
  }

  return 0;
}
