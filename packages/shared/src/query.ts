import { z } from "zod";
import { PAGINATION_MAX_PAGE_SIZE } from "./constants";

// Query-string params arrive as strings; these fields coerce them to validated
// integers while leaving `undefined` (the param was absent) untouched so the
// service layer can apply its own defaults. Shared so every list endpoint
// paginates identically (CLAUDE.md §12: pagination is mandatory, hard cap 50).

export const pageQueryField = z
  .string()
  .optional()
  .transform((v) => (v !== undefined ? Number(v) : undefined))
  .pipe(z.number().int().min(1).optional());

export const limitQueryField = z
  .string()
  .optional()
  .transform((v) => (v !== undefined ? Number(v) : undefined))
  .pipe(z.number().int().min(1).max(PAGINATION_MAX_PAGE_SIZE).optional());

/** Coerce an optional numeric query param within [min, max]. */
export const numericQueryField = (min: number, max: number) =>
  z
    .string()
    .optional()
    .transform((v) => (v !== undefined ? Number(v) : undefined))
    .pipe(z.number().min(min).max(max).optional());

/** Coerce an optional "true"/"false" query param to a boolean. */
export const booleanQueryField = z
  .enum(["true", "false"])
  .optional()
  .transform((v) => (v === undefined ? undefined : v === "true"));
