interface RateLimitRecord {
  count: number;
  resetAt: number;
}

// In-memory sliding window rate limiter store
const rateLimitStore = new Map<string, RateLimitRecord>();

/**
 * Clean up expired entries every 5 minutes to prevent memory leaks
 */
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitStore.entries()) {
      if (record.resetAt <= now) {
        rateLimitStore.delete(key);
      }
    }
  }, 5 * 60 * 1000).unref?.();
}

export interface RateLimitOptions {
  limit: number;       // Maximum requests allowed in the window
  windowSeconds: number; // Time window in seconds
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetSeconds: number;
  totalLimit: number;
}

/**
 * Checks and updates rate limit for a specific identifier (e.g. userId + action)
 */
export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions = { limit: 60, windowSeconds: 60 }
): RateLimitResult {
  const now = Date.now();
  const windowMs = options.windowSeconds * 1000;
  const record = rateLimitStore.get(identifier);

  if (!record || record.resetAt <= now) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetAt: now + windowMs,
    });
    return {
      allowed: true,
      remaining: options.limit - 1,
      resetSeconds: options.windowSeconds,
      totalLimit: options.limit,
    };
  }

  if (record.count >= options.limit) {
    const resetSeconds = Math.ceil((record.resetAt - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      resetSeconds,
      totalLimit: options.limit,
    };
  }

  record.count += 1;
  const resetSeconds = Math.ceil((record.resetAt - now) / 1000);
  return {
    allowed: true,
    remaining: options.limit - record.count,
    resetSeconds,
    totalLimit: options.limit,
  };
}
