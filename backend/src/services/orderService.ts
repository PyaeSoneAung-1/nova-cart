import { OrderStatus, PaymentMethod, PaymentStatus, Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import { ApiError } from "../utils/ApiError";
import { serializeData } from "../utils/serialize";
import { computeCartTotals, CartTotals } from "./cartService";
import { validateCoupon } from "./couponService";
import { generateOrderNumber, generateTransactionId, ORDER_STATUS_FLOW, CUSTOMER_CANCELLABLE } from "../utils/order";
import { parsePagination, buildPaginationMeta } from "../utils/pagination";

const orderInclude = {
  items: { orderBy: { id: "asc" as const } },
  payment: true,
  coupon: { select: { id: true, code: true, type: true, value: true } },
  user: { select: { id: true, name: true, email: true } },
};

/**
 * Creates an order from the user's cart and runs the mock payment flow.
 * The server is the source of truth for every price and stock check.
 */
export async function createOrder(
  userId: string,
  data: { addressId: string; paymentMethod: PaymentMethod; couponCode?: string; notes?: string },
) {
  const [address, cart] = await Promise.all([
    prisma.address.findFirst({ where: { id: data.addressId, userId } }),
    prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                price: true,
                discountPrice: true,
                stock: true,
                isPublished: true,
                images: { orderBy: { sortOrder: "asc" }, take: 1 },
              },
            },
            variant: true,
          },
        },
      },
    }),
  ]);

  if (!address) throw ApiError.notFound("Shipping address not found");
  const items = cart?.items ?? [];
  if (items.length === 0) throw ApiError.badRequest("Your cart is empty");

  // ── 1. Validate availability & build line items (server-side prices) ──
  const lineItems: {
    productId: string;
    variantId: string | null;
    name: string;
    sku: string;
    image: string | null;
    unitPrice: number;
    quantity: number;
    total: number;
  }[] = [];

  for (const item of items) {
    const product = item.product;
    if (!product.isPublished) {
      throw ApiError.conflict(`"${product.name}" is no longer available`);
    }
    const stock = item.variant ? item.variant.stock : product.stock;
    if (stock < item.quantity) {
      throw ApiError.conflict(
        `Only ${stock} unit(s) of "${product.name}" available (you have ${item.quantity} in cart)`,
      );
    }

    const price = product.discountPrice
      ? Math.min(product.discountPrice.toNumber(), product.price.toNumber())
      : product.price.toNumber();

    lineItems.push({
      productId: product.id,
      variantId: item.variantId,
      name: item.variant
        ? `${product.name} (${[item.variant.color, item.variant.size].filter(Boolean).join(" / ")})`
        : product.name,
      sku: item.variant ? item.variant.sku : product.sku,
      image: product.images[0]?.url ?? null,
      unitPrice: price,
      quantity: item.quantity,
      total: Math.round(price * item.quantity * 100) / 100,
    });
  }

  // ── 2. Recalculate totals on the server ──
  const productTotals = computeCartTotals(
    items as unknown as Parameters<typeof computeCartTotals>[0],
  );

  let couponDiscount = 0;
  let couponId: string | null = null;
  if (data.couponCode) {
    const result = await validateCoupon(data.couponCode, productTotals.subtotal);
    couponDiscount = result.discount;
    couponId = (result.coupon as unknown as { id: string }).id;
  }

  const totals: CartTotals = {
    subtotal: productTotals.subtotal,
    discount: Math.round((productTotals.discount + couponDiscount) * 100) / 100,
    shippingFee: productTotals.shippingFee,
    total:
      Math.round(
        (productTotals.subtotal - productTotals.discount - couponDiscount + productTotals.shippingFee) *
          100,
      ) / 100,
  };

  // ── 3. Create order + payment + line items atomically, decrement stock ──
  const orderNumber = generateOrderNumber();
  const isCard = data.paymentMethod === "CARD";

  try {
    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          orderNumber,
          userId,
          status: "PENDING",
          paymentStatus: isCard ? "PAID" : "PENDING",
          paymentMethod: data.paymentMethod,
          subtotal: totals.subtotal,
          discount: totals.discount,
          shippingFee: totals.shippingFee,
          total: totals.total,
          couponId,
          notes: data.notes,
          addressSnapshot: {
            label: address.label,
            recipientName: address.recipientName,
            phone: address.phone,
            line1: address.line1,
            line2: address.line2,
            city: address.city,
            state: address.state,
            postalCode: address.postalCode,
            country: address.country,
          },
          items: { create: lineItems },
          payment: {
            create: {
              method: data.paymentMethod,
              status: isCard ? "PAID" : "PENDING",
              transactionId: isCard ? generateTransactionId() : null,
              amount: totals.total,
              paidAt: isCard ? new Date() : null,
            },
          },
        },
        include: { items: true, payment: true },
      });

      // ── 4. Decrement inventory (conditional update → never negative) ──
      for (const item of lineItems) {
        const result =
          item.variantId !== null
            ? await tx.productVariant.updateMany({
                where: { id: item.variantId, stock: { gte: item.quantity } },
                data: { stock: { decrement: item.quantity } },
              })
            : await tx.product.updateMany({
                where: { id: item.productId, stock: { gte: item.quantity } },
                data: { stock: { decrement: item.quantity } },
              });

        if (result.count === 0) {
          throw ApiError.conflict(
            `Insufficient stock for "${item.name}". Please refresh your cart.`,
          );
        }

        await tx.inventoryLog.create({
          data: {
            productId: item.productId,
            variantId: item.variantId,
            change: -item.quantity,
            reason: `Order ${orderNumber} placed`,
          },
        });
      }

      if (couponId) {
        await tx.coupon.update({
          where: { id: couponId },
          data: { usedCount: { increment: 1 } },
        });
      }

      // ── 5. Clear the cart ──
      await tx.cartItem.deleteMany({ where: { cartId: cart!.id } });

      return created;
    });

    return serializeData(
      await prisma.order.findUniqueOrThrow({ where: { id: order.id }, include: orderInclude }),
    );
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) throw err;
    throw err;
  }
}

/** Customer cancels their own order (PENDING / CONFIRMED only). */
export async function cancelOrder(userId: string, orderId: string) {
  const order = await prisma.order.findFirst({ where: { id: orderId, userId } });
  if (!order) throw ApiError.notFound("Order not found");
  if (!CUSTOMER_CANCELLABLE.includes(order.status)) {
    throw ApiError.badRequest(`Orders in ${order.status} status cannot be cancelled`);
  }
  return transitionOrderStatus(order, "CANCELLED");
}

/** Admin moves an order along the valid status flow. */
export async function updateOrderStatus(orderId: string, nextStatus: OrderStatus) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw ApiError.notFound("Order not found");

  if (order.status === nextStatus) {
    return serializeData(await prisma.order.findUniqueOrThrow({ where: { id: orderId }, include: orderInclude }));
  }

  const allowed = ORDER_STATUS_FLOW[order.status];
  if (!allowed.includes(nextStatus)) {
    throw ApiError.badRequest(
      `Cannot move order from ${order.status} to ${nextStatus}. Allowed: ${allowed.join(", ") || "none"}`,
    );
  }
  return transitionOrderStatus(order, nextStatus);
}

async function transitionOrderStatus(
  order: { id: string; status: OrderStatus; paymentStatus: PaymentStatus },
  nextStatus: OrderStatus,
) {
  const isCancel = nextStatus === "CANCELLED";

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.order.update({
      where: { id: order.id },
      data: {
        status: nextStatus,
        paymentStatus:
          isCancel && order.paymentStatus === "PAID"
            ? "REFUNDED"
            : order.paymentStatus,
      },
      include: { items: true, payment: true },
    });

    // Restore stock for cancelled orders.
    if (isCancel && order.status !== "CANCELLED") {
      for (const item of updated.items) {
        if (item.variantId) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stock: { increment: item.quantity } },
          });
        } else {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
        }
        await tx.inventoryLog.create({
          data: {
            productId: item.productId,
            variantId: item.variantId,
            change: item.quantity,
            reason: `Order ${updated.orderNumber} cancelled — stock restored`,
          },
        });
      }
    }

    if (isCancel && updated.payment) {
      await tx.payment.update({
        where: { id: updated.payment.id },
        data: { status: "REFUNDED" },
      });
    }

    return updated;
  });

  return serializeData(result);
}

export const orderService = {
  create: createOrder,
  cancel: cancelOrder,
  updateStatus: updateOrderStatus,

  /** Customer's own orders. */
  async listForUser(userId: string, query: { page?: number; limit?: number; status?: string; search?: string }) {
    const { page, limit, skip } = parsePagination(query);
    const where: Prisma.OrderWhereInput = {
      userId,
      ...(query.status && { status: query.status as OrderStatus }),
      ...(query.search && { orderNumber: { contains: query.search.toUpperCase(), mode: "insensitive" as const } }),
    };
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          items: { include: { product: { select: { id: true, slug: true } } } },
          payment: true,
          coupon: { select: { code: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);
    return { items: serializeData(orders), meta: buildPaginationMeta(page, limit, total) };
  },

  async getForUser(userId: string, orderId: string) {
    const order = await prisma.order.findFirst({
      where: { id: orderId, userId },
      include: {
        items: { include: { product: { select: { id: true, slug: true } } } },
        payment: true,
        coupon: { select: { code: true } },
      },
    });
    if (!order) throw ApiError.notFound("Order not found");
    return serializeData(order);
  },

  /** Admin: all orders with filters. */
  async adminList(query: { page?: number; limit?: number; status?: string; search?: string }) {
    const { page, limit, skip } = parsePagination(query);
    const where: Prisma.OrderWhereInput = {
      ...(query.status && { status: query.status as OrderStatus }),
      ...(query.search && {
        OR: [
          { orderNumber: { contains: query.search.toUpperCase(), mode: "insensitive" as const } },
          { user: { email: { contains: query.search, mode: "insensitive" as const } } },
          { user: { name: { contains: query.search, mode: "insensitive" as const } } },
        ],
      }),
    };
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: orderInclude,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);
    return { items: serializeData(orders), meta: buildPaginationMeta(page, limit, total) };
  },

  async adminGet(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: orderInclude,
    });
    if (!order) throw ApiError.notFound("Order not found");
    return serializeData(order);
  },
};
