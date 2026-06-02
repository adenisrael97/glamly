import Redis from "ioredis";
import { config } from "../config";
import { logger } from "./logger";

declare global {
  var __redis: Redis | undefined;
}

function createClient(): Redis {
  const client = new Redis(config.REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
  });

  client.on("connect", () => {
    logger.info("Redis connected");
  });

  client.on("error", (err: Error) => {
    logger.error("Redis error", { error: err.message });
  });

  return client;
}

export const redis: Redis = global.__redis ?? createClient();

if (config.NODE_ENV !== "production") {
  global.__redis = redis;
}
