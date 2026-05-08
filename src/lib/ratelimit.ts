import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { getUserSubscriptionTier } from "@/lib/subscription";

const FREE_REQUESTS = 10;
const PRO_REQUESTS = 100;
const WINDOW_SECONDS = 60;

function buildRatelimiters(): {
  free: Ratelimit;
  pro: Ratelimit;
} | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  const redis = new Redis({ url, token });

  return {
    free: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(FREE_REQUESTS, `${WINDOW_SECONDS} s`),
      prefix: "rl:free",
    }),
    pro: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(PRO_REQUESTS, `${WINDOW_SECONDS} s`),
      prefix: "rl:pro",
    }),
  };
}

// Lazily initialised — null means credentials not configured (fail-open)
let limiters: ReturnType<typeof buildRatelimiters> | undefined;

function getLimiters() {
  if (limiters === undefined) {
    limiters = buildRatelimiters();
  }
  return limiters;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number;
}

export async function checkRateLimit(
  userId: string,
): Promise<RateLimitResult> {
  const rl = getLimiters();

  // Fail open — no credentials configured
  if (!rl) return { allowed: true };

  const tier = await getUserSubscriptionTier(userId);
  const limiter = tier === "pro" ? rl.pro : rl.free;

  const { success, reset } = await limiter.limit(userId);

  if (success) return { allowed: true };

  const retryAfter = Math.ceil((reset - Date.now()) / 1000);
  return { allowed: false, retryAfter: Math.max(retryAfter, 1) };
}
