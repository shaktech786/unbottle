import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Returns undefined when env vars are missing (local dev without Redis configured).
function createRateLimiter(
  requests: number,
  window: `${number} s` | `${number} m` | `${number} h` | `${number} d`
): Ratelimit | undefined {
  if (
    !process.env.UPSTASH_REDIS_REST_URL ||
    !process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    return undefined;
  }
  return new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(requests, window),
    analytics: true,
  });
}

// Chat endpoint: 20 requests per minute per user
export const chatRateLimit = createRateLimiter(20, "1 m");

// Arrangement generation: 10 per hour per user
export const arrangementRateLimit = createRateLimiter(10, "1 h");

// Audio generation: 5 per hour per user
export const audioRateLimit = createRateLimiter(5, "1 h");
