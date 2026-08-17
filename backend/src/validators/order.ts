import { z } from "zod";

export const createOrderSchema = z.object({
  addressId: z.string().min(1, "Shipping address is required"),
  paymentMethod: z.enum(["CARD", "CASH_ON_DELIVERY"]),
  couponCode: z.string().trim().max(50).optional(),
  notes: z.string().max(1000).optional(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"]),
});

export const orderQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  status: z
    .enum(["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"])
    .optional(),
  search: z.string().trim().max(100).optional(),
});

export const createReviewSchema = z.object({
  rating: z.number().int().min(1, "Rating must be between 1 and 5").max(5),
  comment: z.string().trim().min(3, "Comment must be at least 3 characters").max(2000).optional(),
});

export const updateReviewSchema = createReviewSchema.partial();

export const validateCouponSchema = z.object({
  code: z.string().trim().min(1).max(50),
  subtotal: z.number().nonnegative().default(0),
});

const couponBaseSchema = z.object({
  code: z
    .string()
    .trim()
    .min(3)
    .max(50)
    .regex(/^[A-Za-z0-9_-]+$/, "Code may only contain letters, numbers, _ and -"),
  type: z.enum(["PERCENTAGE", "FIXED"]),
  value: z.number().positive("Discount value must be positive").max(1_000_000),
  minOrderAmount: z.number().nonnegative().default(0),
  maxDiscount: z.number().positive().optional(),
  startsAt: z.coerce.date().optional(),
  expiresAt: z.coerce.date().optional(),
  usageLimit: z.number().int().positive().optional(),
  isActive: z.boolean().default(true),
});

export const createCouponSchema = couponBaseSchema
  .refine((data) => data.type !== "PERCENTAGE" || data.value <= 100, {
    message: "Percentage discount cannot exceed 100",
    path: ["value"],
  })
  .refine(
    (data) => !data.expiresAt || !data.startsAt || data.expiresAt > data.startsAt,
    { message: "expiresAt must be after startsAt", path: ["expiresAt"] },
  );

export const updateCouponSchema = couponBaseSchema.partial();
