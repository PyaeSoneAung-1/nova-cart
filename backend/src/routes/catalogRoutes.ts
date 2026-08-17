import { Router } from "express";
import { categoryController, brandController } from "../controllers/catalogController";
import { validate } from "../middlewares/validate";
import { authenticate, authorize } from "../middlewares/auth";
import {
  idParamSchema,
  createCategorySchema,
  updateCategorySchema,
  createBrandSchema,
  updateBrandSchema,
} from "../validators/catalog";

const categoriesRouter = Router();
const brandsRouter = Router();

// ── Categories ───────────────────────────────────────────────────────────
categoriesRouter.get("/", categoryController.listPublic);
categoriesRouter.get("/admin/list", authenticate, authorize("ADMIN"), categoryController.listAdmin);
categoriesRouter.get("/:id", validate(idParamSchema, "params"), categoryController.get);
categoriesRouter.post("/", authenticate, authorize("ADMIN"), validate(createCategorySchema), categoryController.create);
categoriesRouter.patch(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  validate(idParamSchema, "params"),
  validate(updateCategorySchema),
  categoryController.update,
);
categoriesRouter.delete(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  validate(idParamSchema, "params"),
  categoryController.remove,
);

// ── Brands ───────────────────────────────────────────────────────────────
brandsRouter.get("/", brandController.listPublic);
brandsRouter.get("/admin/list", authenticate, authorize("ADMIN"), brandController.listAdmin);
brandsRouter.post("/", authenticate, authorize("ADMIN"), validate(createBrandSchema), brandController.create);
brandsRouter.patch(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  validate(idParamSchema, "params"),
  validate(updateBrandSchema),
  brandController.update,
);
brandsRouter.delete(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  validate(idParamSchema, "params"),
  brandController.remove,
);

export { categoriesRouter, brandsRouter };
