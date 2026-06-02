import { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/AppError";
import { logger } from "../lib/logger";
import { config } from "../config";
import { captureException } from "../lib/sentry";
import { ERROR_CODES } from "@glamly/shared";

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  const correlationId = req.headers["x-request-id"] as string | undefined;

  if (err instanceof AppError && err.isOperational) {
    logger.warn("Operational error", {
      correlationId,
      code: err.code,
      message: err.message,
      path: req.path,
      method: req.method,
    });

    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      error: { code: err.code, message: err.message },
    });
    return;
  }

  // Programmer / unexpected error — do not leak internals to the client.
  // Report ONLY these to Sentry (operational 4xx AppErrors above are expected and
  // would be noise); tag with the correlation id so it ties back to the logs (§13).
  logger.error("Unexpected error", {
    correlationId,
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });
  captureException(err, { correlationId });

  res.status(500).json({
    success: false,
    message: "Internal server error",
    error: {
      code: ERROR_CODES.INTERNAL_ERROR,
      message:
        config.NODE_ENV === "production" ? "Internal server error" : err.message,
    },
  });
}
