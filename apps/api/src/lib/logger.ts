import winston from "winston";
import { config } from "../config";
import { getCorrelationId } from "./logContext";

const { combine, timestamp, json, colorize, printf } = winston.format;

// Stamp every log with the current request's correlation id (CLAUDE.md §13).
// An explicit `correlationId` passed at the call site wins, so existing call
// sites (e.g. the error handler) keep working; everything else picks it up from
// AsyncLocalStorage automatically.
const withCorrelationId = winston.format((info) => {
  if (!info.correlationId) {
    const id = getCorrelationId();
    if (id) info.correlationId = id;
  }
  return info;
});

const devFormat = combine(
  withCorrelationId(),
  colorize(),
  timestamp({ format: "HH:mm:ss" }),
  printf(({ level, message, timestamp: ts, ...meta }) => {
    const extras = Object.keys(meta).length ? " " + JSON.stringify(meta) : "";
    return `${ts} [${level}] ${String(message)}${extras}`;
  }),
);

const prodFormat = combine(withCorrelationId(), timestamp(), json());

export const logger = winston.createLogger({
  level: config.NODE_ENV === "production" ? "info" : "debug",
  format: config.NODE_ENV === "production" ? prodFormat : devFormat,
  transports: [new winston.transports.Console()],
});
