import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import { config } from "./config";
import { logger } from "./lib/logger";
import { prisma } from "./lib/prisma";
import { redis } from "./lib/redis";
import { globalRateLimiter } from "./middleware/rateLimiter";
import { errorHandler } from "./middleware/errorHandler";
import { runWithCorrelationId } from "./lib/logContext";
import router from "./routes";
import { sendSuccess } from "./lib/apiResponse";
import { ERROR_CODES } from "@glamly/shared";

async function checkDb(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

async function checkRedis(): Promise<boolean> {
  try {
    const pong = await redis.ping();
    return pong === "PONG";
  } catch {
    return false;
  }
}

export function createApp() {
  const app = express();

  // Behind a single reverse proxy in production (Render/Vercel/etc.), trust the
  // first proxy hop so `req.ip` resolves to the real client from X-Forwarded-For.
  // Without this every request appears to come from the proxy's IP, which (a)
  // collapses all clients into ONE express-rate-limit bucket — turning the /auth
  // limiter into a platform-wide lockout — and (b) trips express-rate-limit's
  // X-Forwarded-For validation. `1` (not `true`) avoids the permissive-trust-proxy
  // warning while still honouring the single hop. Dev/local has no proxy, so this
  // stays off there to avoid trusting a spoofable header.
  if (config.NODE_ENV === "production") {
    app.set("trust proxy", 1);
  }

  // Attach + echo correlation ID on every request for log tracing (§13). The
  // request is run inside an AsyncLocalStorage scope so EVERY log line emitted
  // while handling it carries the same id — no need to thread `req` through the
  // service/repository layers.
  app.use((req, res, next) => {
    const id = (req.headers["x-request-id"] as string | undefined) ?? crypto.randomUUID();
    req.headers["x-request-id"] = id;
    res.setHeader("x-request-id", id);
    runWithCorrelationId(id, () => next());
  });

  // Security headers
  app.use(helmet());

  // CORS — strict allowlist from env (never wildcard in prod)
  const allowedOrigins = config.CORS_ORIGINS.split(",").map((o) => o.trim());
  app.use(
    cors({
      origin: allowedOrigins,
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    }),
  );

  // HTTP request logging — no client IP (PII) in log output (§10)
  if (config.NODE_ENV !== "test") {
    app.use(
      morgan(":method :url :status :res[content-length] - :response-time ms", {
        stream: { write: (msg) => logger.info(msg.trim(), { type: "http" }) },
      }),
    );
  }

  // Body parsing — 1 MB cap prevents payload-based DoS. The `verify` hook stashes
  // the raw bytes on req.rawBody so the Paystack webhook can validate its HMAC
  // signature against exactly what was received (re-serialising would break it).
  app.use(
    express.json({
      limit: "1mb",
      verify: (req, _res, buf) => {
        (req as express.Request).rawBody = buf.length ? Buffer.from(buf) : undefined;
      },
    }),
  );
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));

  // Parse cookies so the auth layer can read the httpOnly refresh-token cookie.
  app.use(cookieParser());

  // ── Health endpoints BEFORE rate limiter — LB probes must never be throttled ─
  //    Liveness: process is alive (no external deps checked)
  app.get("/health", (_req, res) => {
    sendSuccess(res, { status: "ok" }, "API is healthy");
  });

  //    Readiness: DB + Redis reachable — load balancer routes to this instance
  //    only when both are up (§13)
  app.get("/ready", async (_req, res, next) => {
    try {
      const [dbOk, redisOk] = await Promise.all([
        checkDb(),
        checkRedis(),
      ]);

      if (!dbOk || !redisOk) {
        res.status(503).json({
          success: false,
          message: "Service unavailable",
          data: {
            status: "degraded",
            db: dbOk ? "ok" : "unreachable",
            redis: redisOk ? "ok" : "unreachable",
          },
        });
        return;
      }

      sendSuccess(res, { status: "ok", db: "ok", redis: "ok" }, "API is ready");
    } catch (err) {
      next(err);
    }
  });

  // Global rate limiter applied AFTER health probes (§6)
  app.use(globalRateLimiter);

  // ── API routes ───────────────────────────────────────────────────────────────
  app.use(router);

  // 404 — unmatched routes
  app.use((_req, res) => {
    res.status(404).json({
      success: false,
      message: "Route not found",
      error: { code: ERROR_CODES.NOT_FOUND, message: "Route not found" },
    });
  });

  // Global error handler — must be the last middleware registered
  app.use(errorHandler);

  return app;
}
