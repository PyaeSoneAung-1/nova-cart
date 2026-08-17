import { prisma } from "../config/prisma";
import { ApiError } from "../utils/ApiError";
import { serializeData } from "../utils/serialize";
import { env } from "../config/env";

const cartInclude = {
  items: {
    orderBy: { createdAt: "asc" as const },
    include: {
      product: {
        include: {
          images: { orderBy: { sortOrder: "asc" as const }, take: 1 },
          category: { select: { slug: true } },
        },
      },
      variant: true,
    },
  },
};

export interface CartTotals {
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
}

/** Server-side truth for all cart money math — never trust the client. */
export function computeCartTotals(
  items: {
    quantity: number;
    product: { price: { toNumber(): number }; discountPrice: { toNumber(): number } | null };
  }[],
): CartTotals {
  let subtotal = 0;
  let discount = 0;

  for (const item of items) {
    const price = item.product.price.toNumber();
    const discounted = item.product.discountPrice?.toNumber() ?? null;
    subtotal += price * item.quantity;
    if (discounted !== null && discounted < price) {
      discount += (price - discounted) * item.quantity;
    }
  }

  const shippingFee =
    subtotal === 0 || subtotal - discount >= env.FREE_SHIPPING_THRESHOLD
      ? 0
      : env.SHIPPING_FEE;

  return { subtotal, discount, shippingFee, total: subtotal - discount + shippingFee };
}

export const cartService = {
  /** Guarantees a cart exists for the user. */
  async ensureCart(userId: string) {
    return prisma.cart.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
  },

  async getCart(userId: string) {
    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: cartInclude,
    });
    if (!cart) return { items: [], ...computeCartTotals([]), itemCount: 0 };
    const totals = computeCartTotals(cart.items);
    return {
      items: serializeData(cart.items),
      itemCount: cart.items.reduce((sum, i) => sum + i.quantity, 0),
      ...totals,
    };
  },

  async addItem(userId: string, data: { productId: string; variantId?: string; quantity: number }) {
    const product = await prisma.product.findUnique({
      where: { id: data.productId, isPublished: true },
    });
    if (!product) throw ApiError.notFound("Product not found");

    let variant = null;
    if (data.variantId) {
      variant = await prisma.productVariant.findUnique({ where: { id: data.variantId } });
      if (!variant || variant.productId !== product.id) {
        throw ApiError.badRequest("Variant does not belong to this product");
      }
    }

    const stock = variant ? variant.stock : product.stock;
    if (stock <= 0) throw ApiError.conflict("This product is out of stock");

    const cart = await this.ensureCart(userId);

    const existingItem =
      data.variantId === undefined
        ? await prisma.cartItem.findFirst({
            where: { cartId: cart.id, productId: product.id, variantId: null },
          })
        : await prisma.cartItem.findUnique({
            where: {
              cartId_productId_variantId: {
                cartId: cart.id,
                productId: product.id,
                variantId: data.variantId,
              },
            },
          });

    const newQuantity = (existingItem?.quantity ?? 0) + data.quantity;
    if (newQuantity > stock) {
      throw ApiError.badRequest(`Only ${stock} unit(s) in stock`);
    }

    const item = existingItem
      ? await prisma.cartItem.update({
          where: { id: existingItem.id },
          data: { quantity: newQuantity },
          include: { product: { include: { images: true } }, variant: true },
        })
      : await prisma.cartItem.create({
          data: {
            cartId: cart.id,
            productId: product.id,
            variantId: data.variantId ?? null,
            quantity: data.quantity,
          },
          include: { product: { include: { images: true } }, variant: true },
        });

    return serializeData(item);
  },

  async updateItem(userId: string, itemId: string, quantity: number) {
    const cart = await this.ensureCart(userId);
    const item = await prisma.cartItem.findFirst({
      where: { id: itemId, cartId: cart.id },
      include: { product: true, variant: true },
    });
    if (!item) throw ApiError.notFound("Cart item not found");

    const stock = item.variant ? item.variant.stock : item.product.stock;
    if (quantity > stock) {
      throw ApiError.badRequest(`Only ${stock} unit(s) available in stock`);
    }

    const updated = await prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity },
      include: { product: { include: { images: true } }, variant: true },
    });
    return serializeData(updated);
  },

  async removeItem(userId: string, itemId: string) {
    const cart = await this.ensureCart(userId);
    const item = await prisma.cartItem.findFirst({ where: { id: itemId, cartId: cart.id } });
    if (!item) throw ApiError.notFound("Cart item not found");
    await prisma.cartItem.delete({ where: { id: itemId } });
  },

  async clearCart(userId: string) {
    const cart = await this.ensureCart(userId);
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  },
};

export const wishlistService = {
  async ensureWishlist(userId: string) {
    return prisma.wishlist.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
  },

  async getWishlist(userId: string) {
    const wishlist = await prisma.wishlist.findUnique({
      where: { userId },
      include: {
        items: {
          orderBy: { createdAt: "desc" },
          include: {
            product: {
              include: {
                images: { orderBy: { sortOrder: "asc" }, take: 1 },
                category: { select: { name: true, slug: true } },
                brand: { select: { name: true } },
              },
            },
          },
        },
      },
    });
    return serializeData(wishlist?.items ?? []);
  },

  async addItem(userId: string, productId: string) {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw ApiError.notFound("Product not found");

    const wishlist = await this.ensureWishlist(userId);
    const existing = await prisma.wishlistItem.findUnique({
      where: { wishlistId_productId: { wishlistId: wishlist.id, productId } },
    });
    if (existing) throw ApiError.conflict("Product is already in your wishlist");

    const item = await prisma.wishlistItem.create({
      data: { wishlistId: wishlist.id, productId },
      include: { product: { include: { images: { take: 1 } } } },
    });
    return serializeData(item);
  },

  async removeItem(userId: string, productId: string) {
    const wishlist = await this.ensureWishlist(userId);
    await prisma.wishlistItem.deleteMany({
      where: { wishlistId: wishlist.id, productId },
    });
  },
};
