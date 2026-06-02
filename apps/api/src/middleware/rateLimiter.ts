import rateLimit, { type Store } from "express-rate-limit";
import { RedisStore, type RedisReply } from "rate-limit-redis";
import { config } from "../config";
import { redis } from "../lib/redis";
import { logger } from "../lib/logger";

const rateLimitResponse = (message: string, code = "RATE_LIMIT_EXCEEDED") => ({
  success: false,
  message,
  error: { code, message },
});

// Disable throttling under the test runner so the integration suite (which fires
// many auth requests from one IP) isn't tripped by the limiter. Real behaviour
// is exercised separately; this never affects dev or prod. Because `skip` returns
// true in tests, the Redis store below is never touched — tests need no Redis.
const skipInTest = () => config.NODE_ENV === "test";

// Bridge Winston to express-rate-limit's minimal Logger so store problems land in
// the structured logs (with the correlation id) instead of stdout.
const limiterLogger = {
  error: (err: unknown, message?: string): void => {
    logger.error(message ?? "Rate limiter store error", {
      error: err instanceof Error ? err.message : String(err),
    });
  },
  warn: (err: unknown, message?: string): void => {
    logger.warn(message ?? "Rate limiter store warning", {
      error: err instanceof Error ? err.message : String(err),
    });
  },
};

// Redis-backed store so limit buckets are SHARED across instances (§2) — in-memory
// buckets would let N pods each allow the full quota, weakening auth brute-force
// protection on scale-out. A fresh store per limiter (the library forbids sharing
// one instance) with its own key prefix. ioredis `call` implements `sendCommand`.
function createRedisStore(prefix: string): Store {
  return new RedisStore({
    prefix,
    sendCommand: (...args: string[]): Promise<RedisReply> =>
      redis.call(args[0], ...args.slice(1)) as Promise<RedisReply>,
  });
}

export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 500,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: skipInTest,
  store: createRedisStore("rl:global:"),
  // Fail OPEN: if Redis blips, serve the request (logged) rather than 500 every
  // user. Availability over a perfect limit when the limiter's backend is down.
  passOnStoreError: true,
  logger: limiterLogger,
  message: rateLimitResponse("Too many requests, please try again later."),
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: skipInTest,
  store: createRedisStore("rl:auth:"),
  passOnStoreError: true,
  logger: limiterLogger,
  message: rateLimitResponse(
    "Too many authentication attempts, please try again later.",
  ),
});
