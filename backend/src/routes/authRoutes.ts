import { Router } from "express";
import { authController } from "../controllers/authController";
import { validate } from "../middlewares/validate";
import { authenticate } from "../middlewares/auth";
import { strictLimiter } from "../middlewares/rateLimiter";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  refreshTokenSchema,
} from "../validators/auth";

const router = Router();

// Stricter rate limits on credential endpoints.
router.post("/register", strictLimiter, validate(registerSchema), authController.register);
router.post("/login", strictLimiter, validate(loginSchema), authController.login);
router.post("/refresh", strictLimiter, validate(refreshTokenSchema), authController.refresh);
router.post("/logout", authController.logout);
router.post("/forgot-password", strictLimiter, validate(forgotPasswordSchema), authController.forgotPassword);
router.post("/reset-password", strictLimiter, validate(resetPasswordSchema), authController.resetPassword);
router.get("/me", authenticate, authController.me);

export default router;
