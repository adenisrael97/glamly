import { z } from "zod";
import { limitQueryField, pageQueryField } from "./query";

export const createPackageSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional(),
  price: z.number().int().positive(),
  duration: z.number().int().positive(),
  serviceIds: z.array(z.string().cuid()).min(1).max(10),
  imageUrl: z.string().url().optional(),
});
export type CreatePackageInput = z.infer<typeof createPackageSchema>;

export const updatePackageSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().max(500).optional(),
  price: z.number().int().positive().optional(),
  duration: z.number().int().positive().optional(),
  serviceIds: z.array(z.string().cuid()).min(1).max(10).optional(),
  imageUrl: z.string().url().optional(),
  isActive: z.boolean().optional(),
});
export type UpdatePackageInput = z.infer<typeof updatePackageSchema>;

export const listPackagesQuerySchema = z.object({
  page: pageQueryField,
  limit: limitQueryField,
  active: z.enum(["true", "false"]).optional().transform((v) => (v === undefined ? undefined : v === "true")),
});
export type ListPackagesQuery = z.infer<typeof listPackagesQuerySchema>;

export const packageIdParamSchema = z.object({
  id: z.string().cuid("Invalid package id"),
});
