import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";
import { ValidationError } from "../errors/AppError";

function formatZodError(err: ZodError): string {
  return err.errors.map((e) => `${e.path.join(".") || "value"}: ${e.message}`).join("; ");
}

export const validateBody =
  (schema: ZodSchema) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      next(err instanceof ZodError ? new ValidationError(formatZodError(err)) : err);
    }
  };

export const validateQuery =
  (schema: ZodSchema) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.query = schema.parse(req.query) as typeof req.query;
      next();
    } catch (err) {
      next(err instanceof ZodError ? new ValidationError(formatZodError(err)) : err);
    }
  };

export const validateParams =
  (schema: ZodSchema) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.params = schema.parse(req.params) as typeof req.params;
      next();
    } catch (err) {
      next(err instanceof ZodError ? new ValidationError(formatZodError(err)) : err);
    }
  };
