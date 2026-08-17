import { prisma } from "../config/prisma";
import { ApiError } from "../utils/ApiError";
import { serializeData } from "../utils/serialize";
import { parsePagination, buildPaginationMeta } from "../utils/pagination";

export interface CouponDiscountResult {
  coupon: Record<string, unknown>;
  discount: number;
}

/** Validates a coupon against a subtotal and returns the discount amount. */
export async function validateCoupon(
  code: string,
  subtotal: number,
): Promise<CouponDiscountResult> {
  const coupon = await prisma.coupon.findUnique({
    where: { code: code.toUpperCase().trim() },
  });

  if (!coupon || !coupon.isActive) {
    throw ApiError.badRequest("Invalid or inactive coupon code");
  }

  const now = new Date();
  if (coupon.startsAt > now) {
    throw ApiError.badRequest("This coupon is not active yet");
  }
  if (coupon.expiresAt && coupon.expiresAt < now) {
    throw ApiError.badRequest("This coupon has expired");
  }
  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
    throw ApiError.badRequest("This coupon has reached its usage limit");
  }
  if (subtotal < coupon.minOrderAmount.toNumber()) {
    throw ApiError.badRequest(
      `Minimum order amount for this coupon is $${coupon.minOrderAmount.toNumber()}`,
    );
  }

  let discount = 0;
  if (coupon.type === "PERCENTAGE") {
    discount = (subtotal * coupon.value.toNumber()) / 100;
    if (coupon.maxDiscount) {
      discount = Math.min(discount, coupon.maxDiscount.toNumber());
    }
  } else {
    discount = Math.min(coupon.value.toNumber(), subtotal);
  }

  return { coupon: serializeData(coupon), discount: Math.round(discount * 100) / 100 };
}

export const couponService = {
  validate: validateCoupon,

  async listAdmin(query: Record<string, unknown>) {
    const { page, limit, skip } = parsePagination(query);
    const [coupons, total] = await Promise.all([
      prisma.coupon.findMany({ orderBy: { createdAt: "desc" }, skip, take: limit }),
      prisma.coupon.count(),
    ]);
    return { items: serializeData(coupons), meta: buildPaginationMeta(page, limit, total) };
  },

  async create(data: {
    code: string;
    type: "PERCENTAGE" | "FIXED";
    value: number;
    minOrderAmount?: number;
    maxDiscount?: number;
    startsAt?: Date;
    expiresAt?: Date;
    usageLimit?: number;
    isActive?: boolean;
  }) {
    const code = data.code.toUpperCase().trim();
    const existing = await prisma.coupon.findUnique({ where: { code } });
    if (existing) throw ApiError.conflict("A coupon with this code already exists");
    const coupon = await prisma.coupon.create({ data: { ...data, code } });
    return serializeData(coupon);
  },

  async update(
    id: string,
    data: {
      code?: string;
      type?: "PERCENTAGE" | "FIXED";
      value?: number;
      minOrderAmount?: number;
      maxDiscount?: number;
      startsAt?: Date;
      expiresAt?: Date;
      usageLimit?: number;
      isActive?: boolean;
    },
  ) {
    const existing = await prisma.coupon.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound("Coupon not found");

    if (data.code && data.code.toUpperCase().trim() !== existing.code) {
      const clash = await prisma.coupon.findUnique({
        where: { code: data.code.toUpperCase().trim() },
      });
      if (clash) throw ApiError.conflict("A coupon with this code already exists");
    }

    const coupon = await prisma.coupon.update({
      where: { id },
      data: { ...data, ...(data.code && { code: data.code.toUpperCase().trim() }) },
    });
    return serializeData(coupon);
  },

  async remove(id: string) {
    const existing = await prisma.coupon.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound("Coupon not found");
    await prisma.coupon.delete({ where: { id } });
  },
};
