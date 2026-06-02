import "dotenv/config";
import { createApp } from "./server";
import { config } from "./config";
import { logger } from "./lib/logger";
import { initSentry } from "./lib/sentry";
import { prisma } from "./lib/prisma";
import { redis } from "./lib/redis";
import { scheduleExpireBookings } from "./jobs/expireBookings";
import { scheduleSendReminders } from "./jobs/sendReminders";
import { scheduleCleanTokens } from "./jobs/cleanTokens";
import { initRealtime, closeRealtime } from "./realtime/io";

async function bootstrap() {
  // Initialise error reporting before anything can throw (no-op without a DSN).
  initSentry();

  const app = createApp();

  const server = app.listen(config.PORT, () => {
    logger.info(`Glamly API running on http://localhost:${config.PORT}`, {
      env: config.NODE_ENV,
    });
  });

  // Attach Socket.io to the same HTTP server (live availability + booking status).
  initRealtime(server);

  // Background jobs:
  //  • Sweep abandoned (unpaid) bookings back to CANCELLED every minute (§11).
  //  • Send 24h appointment reminders hourly (§5).
  //  • Purge expired/revoked refresh tokens daily (§10).
  const stopExpiry = scheduleExpireBookings();
  const stopReminders = scheduleSendReminders();
  const stopCleanTokens = scheduleCleanTokens();

  const shutdown = async (signal: string) => {
    logger.info(`${signal} received — shutting down gracefully`);
    stopExpiry();
    stopReminders();
    stopCleanTokens();
    await closeRealtime();
    server.close(async () => {
      await prisma.$disconnect();
      redis.disconnect();
      logger.info("Server closed cleanly");
      process.exit(0);
    });
    // Force-kill after 10 s if graceful shutdown hangs
    setTimeout(() => {
      logger.error("Graceful shutdown timed out — forcing exit");
      process.exit(1);
    }, 10_000).unref();
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

bootstrap().catch((err: unknown) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});
