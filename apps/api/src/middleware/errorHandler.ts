import { Request, Response, NextFunction } from "express";
import multer from "multer";
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

  // Map multer errors (file size, count, unexpected field) to typed 4xx responses
  // so clients get a proper error code rather than a 500.
  if (err instanceof multer.MulterError) {
    const statusCode = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "File is too large — check the size limit for this upload"
        : err.code === "LIMIT_FILE_COUNT"
          ? "Too many files — upload one file at a time"
          : err.code === "LIMIT_UNEXPECTED_FILE"
            ? "Unexpected file field — use the field name 'file'"
            : err.message;
    logger.warn("Multer upload error", { correlationId, code: err.code, message });
    res.status(statusCode).json({
      success: false,
      message,
      error: { code: "VALIDATION_ERROR", message },
    });
    return;
  }

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
