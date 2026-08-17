import { prisma } from "../config/prisma";
import { ApiError } from "../utils/ApiError";
import { serializeData } from "../utils/serialize";
import { parsePagination, buildPaginationMeta } from "../utils/pagination";
import { productService } from "./productService";

export const reviewService = {
  /** Public: reviews for a product with pagination. */
  async listForProduct(productId: string, query: { page?: number; limit?: number }) {
    const { page, limit, skip } = parsePagination(query);
    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: { productId },
        include: { user: { select: { id: true, name: true, avatar: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.review.count({ where: { productId } }),
    ]);
    return { items: serializeData(reviews), meta: buildPaginationMeta(page, limit, total) };
  },

  /** Create a review. Only customers who purchased the product may review it. */
  async create(userId: string, productId: string, data: { rating: number; comment?: string }) {
    const product = await prisma.product.findUnique({
      where: { id: productId, isPublished: true },
    });
    if (!product) throw ApiError.notFound("Product not found");

    const existing = await prisma.review.findUnique({
      where: { productId_userId: { productId, userId } },
    });
    if (existing) throw ApiError.conflict("You have already reviewed this product");

    // Verified-purchase check: a non-cancelled order containing this product.
    const purchased = await prisma.orderItem.findFirst({
      where: {
        productId,
        order: { userId, status: { not: "CANCELLED" } },
      },
      select: { id: true },
    });

    const review = await prisma.review.create({
      data: {
        productId,
        userId,
        rating: data.rating,
        comment: data.comment,
        isVerifiedPurchase: Boolean(purchased),
      },
      include: { user: { select: { id: true, name: true, avatar: true } } },
    });

    await productService.refreshRating(productId);
    return serializeData(review);
  },

  /** Update own review (rating + comment refresh product rating). */
  async update(userId: string, reviewId: string, data: { rating?: number; comment?: string }) {
    const review = await prisma.review.findFirst({ where: { id: reviewId, userId } });
    if (!review) throw ApiError.notFound("Review not found");

    const updated = await prisma.review.update({
      where: { id: reviewId },
      data,
      include: { user: { select: { id: true, name: true, avatar: true } } },
    });
    await productService.refreshRating(review.productId);
    return serializeData(updated);
  },

  async remove(userId: string, reviewId: string) {
    const review = await prisma.review.findFirst({ where: { id: reviewId, userId } });
    if (!review) throw ApiError.notFound("Review not found");
    await prisma.review.delete({ where: { id: reviewId } });
    await productService.refreshRating(review.productId);
  },

  /** Admin: the customer's own reviews across products. */
  async listForUser(userId: string, query: { page?: number; limit?: number }) {
    const { page, limit, skip } = parsePagination(query);
    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: { userId },
        include: { product: { select: { id: true, slug: true, name: true, images: { take: 1 } } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.review.count({ where: { userId } }),
    ]);
    return { items: serializeData(reviews), meta: buildPaginationMeta(page, limit, total) };
  },

  /** Admin: all reviews. */
  async adminList(query: { page?: number; limit?: number; search?: string }) {
    const { page, limit, skip } = parsePagination(query);
    const where = query.search
      ? {
          OR: [
            { user: { name: { contains: query.search, mode: "insensitive" as const } } },
            { product: { name: { contains: query.search, mode: "insensitive" as const } } },
            { comment: { contains: query.search, mode: "insensitive" as const } },
          ],
        }
      : undefined;
    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
          product: { select: { id: true, name: true, slug: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.review.count({ where }),
    ]);
    return { items: serializeData(reviews), meta: buildPaginationMeta(page, limit, total) };
  },

  async adminRemove(reviewId: string) {
    const review = await prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) throw ApiError.notFound("Review not found");
    await prisma.review.delete({ where: { id: reviewId } });
    await productService.refreshRating(review.productId);
  },
};
