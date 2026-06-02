import { Router } from "express";
import { z } from "zod";
import { servicesController } from "../../controllers/services.controller";
import { validateQuery } from "../../middleware/validate";

const listQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((v) => (v !== undefined ? Number(v) : undefined))
    .pipe(z.number().int().min(1).optional()),
  limit: z
    .string()
    .optional()
    .transform((v) => (v !== undefined ? Number(v) : undefined))
    .pipe(z.number().int().min(1).max(50).optional()),
  category: z.string().min(1).max(50).optional(),
  stylistId: z.string().cuid().optional(),
});

const router = Router();

router.get("/", validateQuery(listQuerySchema), servicesController.list);
router.get("/categories", servicesController.getCategories);
router.get("/:id", servicesController.getById);

export default router;
