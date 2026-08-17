import { z } from "zod";
import { emailSchema, passwordSchema } from "./auth";

export const updateProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100).optional(),
  email: emailSchema.optional(),
  avatar: z.string().url("Avatar must be a valid URL").max(500).nullable().optional(),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: passwordSchema,
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "New password must be different from the current password",
    path: ["newPassword"],
  });

export const createAddressSchema = z.object({
  label: z.string().max(50).default("Home"),
  recipientName: z.string().min(2).max(100),
  phone: z.string().min(6).max(20),
  line1: z.string().min(2).max(255),
  line2: z.string().max(255).optional(),
  city: z.string().min(2).max(100),
  state: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
  country: z.string().max(100).default("Myanmar"),
  isDefault: z.boolean().optional(),
});

export const updateAddressSchema = createAddressSchema.partial();

export const updateUserRoleSchema = z.object({
  role: z.enum(["CUSTOMER", "ADMIN"]),
});

export const updateUserStatusSchema = z.object({
  isActive: z.boolean(),
});
