import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { getUserSubscriptionTier } from "@/lib/subscription";

export type RateLimitType = "chat" | "arrangement" | "audio";

function getEnvInt(key: string, fallback: number): number {
  const val = process.env[key];
  const parsed = val ? parseInt(val, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

interface LimiterPair {
  free: Ratelimit;
  pro: Ratelimit;
}

interface AllLimiters {
  chat: LimiterPair;
  arrangement: LimiterPair;
  audio: LimiterPair;
}

function buildAllLimiters(): AllLimiters | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  const redis = new Redis({ url, token });

  // Chat: per hour
  const chatFree = getEnvInt("RATE_LIMIT_CHAT_PER_HOUR", 20);
  const chatPro = chatFree * 10;

  // Arrangement: per hour
  const arrangementFree = getEnvInt("RATE_LIMIT_ARRANGEMENT_PER_HOUR", 5);
  const arrangementPro = arrangementFree * 10;

  // Audio: per 24h (daily)
  const audioFree = getEnvInt("RATE_LIMIT_AUDIO_PER_DAY", 3);
  const audioPro = audioFree * 10;

  return {
    chat: {
      free: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(chatFree, "1 h"),
        prefix: "rl:chat:free",
      }),
      pro: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(chatPro, "1 h"),
        prefix: "rl:chat:pro",
      }),
    },
    arrangement: {
      free: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(arrangementFree, "1 h"),
        prefix: "rl:arrangement:free",
      }),
      pro: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(arrangementPro, "1 h"),
        prefix: "rl:arrangement:pro",
      }),
    },
    audio: {
      free: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(audioFree, "24 h"),
        prefix: "rl:audio:free",
      }),
      pro: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(audioPro, "24 h"),
        prefix: "rl:audio:pro",
      }),
    },
  };
}

// Lazily initialised — null means credentials not configured (fail-open)
let allLimiters: AllLimiters | null | undefined;

function getAllLimiters(): AllLimiters | null {
  if (allLimiters === undefined) {
    allLimiters = buildAllLimiters();
  }
  return allLimiters;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number;
}

export async function checkRateLimit(
  userId: string,
  type: RateLimitType = "chat",
): Promise<RateLimitResult> {
  const rl = getAllLimiters();

  // Fail open — no credentials configured
  if (!rl) return { allowed: true };

  const tier = await getUserSubscriptionTier(userId);
  const limiter = tier === "pro" ? rl[type].pro : rl[type].free;

  const { success, reset } = await limiter.limit(userId);

  if (success) return { allowed: true };

  const retryAfter = Math.ceil((reset - Date.now()) / 1000);
  return { allowed: false, retryAfter: Math.max(retryAfter, 1) };
}
