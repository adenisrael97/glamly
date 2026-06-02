import { PrismaClient } from "@prisma/client";
import { config } from "../config";

declare global {
  // Prevent multiple instances in dev hot-reload
  var __prisma: PrismaClient | undefined;
}

export const prisma =
  global.__prisma ??
  new PrismaClient({
    log: config.NODE_ENV === "development" ? ["query", "warn", "error"] : ["warn", "error"],
  });

if (config.NODE_ENV !== "production") {
  global.__prisma = prisma;
}
