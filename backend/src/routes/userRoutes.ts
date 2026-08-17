import { Router } from "express";
import { userController } from "../controllers/userController";
import { validate } from "../middlewares/validate";
import { authenticate, authorize } from "../middlewares/auth";
import { idParamSchema, paginationQuerySchema } from "../validators/catalog";
import {
  updateProfileSchema,
  changePasswordSchema,
  createAddressSchema,
  updateAddressSchema,
  updateUserRoleSchema,
  updateUserStatusSchema,
} from "../validators/user";

const router = Router();

// ── Customer profile ─────────────────────────────────────────────────────
router.patch("/me", authenticate, validate(updateProfileSchema), userController.updateProfile);
router.post(
  "/me/change-password",
  authenticate,
  validate(changePasswordSchema),
  userController.changePassword,
);

// ── Addresses ────────────────────────────────────────────────────────────
router.get("/addresses", authenticate, userController.listAddresses);
router.post("/addresses", authenticate, validate(createAddressSchema), userController.createAddress);
router.patch(
  "/addresses/:id",
  authenticate,
  validate(idParamSchema, "params"),
  validate(updateAddressSchema),
  userController.updateAddress,
);
router.delete(
  "/addresses/:id",
  authenticate,
  validate(idParamSchema, "params"),
  userController.deleteAddress,
);

// ── Admin: user management ───────────────────────────────────────────────
router.get(
  "/",
  authenticate,
  authorize("ADMIN"),
  validate(paginationQuerySchema, "query"),
  userController.adminListUsers,
);
router.get(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  validate(idParamSchema, "params"),
  userController.adminGetUser,
);
router.patch(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  validate(idParamSchema, "params"),
  validate(updateUserRoleSchema.partial().or(updateUserStatusSchema.partial())),
  userController.adminUpdateUser,
);

export default router;
