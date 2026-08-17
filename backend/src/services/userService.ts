import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import { ApiError } from "../utils/ApiError";
import { verifyPassword, hashPassword } from "../utils/password";
import { serializeData } from "../utils/serialize";
import { parsePagination, buildPaginationMeta } from "../utils/pagination";

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  avatar: true,
  isActive: true,
  emailVerified: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export const userService = {
  async updateProfile(
    userId: string,
    data: { name?: string; email?: string; avatar?: string | null },
  ) {
    if (data.email) {
      const existing = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
      if (existing && existing.id !== userId) {
        throw ApiError.conflict("This email is already in use");
      }
    }
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.name !== undefined && { name: data.name.trim() }),
        ...(data.email !== undefined && { email: data.email.toLowerCase() }),
        ...(data.avatar !== undefined && { avatar: data.avatar }),
      },
      select: userSelect,
    });
    return serializeData(user);
  },

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw ApiError.notFound("User not found");

    const valid = await verifyPassword(currentPassword, user.password);
    if (!valid) throw ApiError.badRequest("Current password is incorrect");

    const passwordHash = await hashPassword(newPassword);
    await prisma.user.update({ where: { id: userId }, data: { password: passwordHash } });
    // Log out everywhere else.
    await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },

  // ── Addresses ──────────────────────────────────────────────────────────

  async listAddresses(userId: string) {
    const addresses = await prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });
    return serializeData(addresses);
  },

  async createAddress(userId: string, data: Prisma.AddressUncheckedCreateInput) {
    const count = await prisma.address.count({ where: { userId } });
    if (count >= 10) throw ApiError.badRequest("Maximum of 10 addresses allowed");

    return prisma.$transaction(async (tx) => {
      const makeDefault = data.isDefault === true || count === 0;
      if (makeDefault) {
        await tx.address.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      }
      const address = await tx.address.create({
        data: { ...data, userId, isDefault: makeDefault },
      });
      return serializeData(address);
    });
  },

  async updateAddress(userId: string, addressId: string, data: Prisma.AddressUncheckedUpdateInput) {
    const address = await prisma.address.findFirst({ where: { id: addressId, userId } });
    if (!address) throw ApiError.notFound("Address not found");

    return prisma.$transaction(async (tx) => {
      if (data.isDefault === true) {
        await tx.address.updateMany({
          where: { userId, isDefault: true, id: { not: addressId } },
          data: { isDefault: false },
        });
      }
      const updated = await tx.address.update({ where: { id: addressId }, data });
      return serializeData(updated);
    });
  },

  async deleteAddress(userId: string, addressId: string) {
    const address = await prisma.address.findFirst({ where: { id: addressId, userId } });
    if (!address) throw ApiError.notFound("Address not found");
    await prisma.address.delete({ where: { id: addressId } });
  },

  // ── Admin: user management ─────────────────────────────────────────────

  async adminListUsers(query: { page?: number; limit?: number; search?: string; role?: string }) {
    const { page, limit, skip } = parsePagination(query);

    const where: Prisma.UserWhereInput = {
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: "insensitive" as const } },
          { email: { contains: query.search, mode: "insensitive" as const } },
        ],
      }),
      ...(query.role && { role: query.role as Prisma.UserWhereInput["role"] }),
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: { ...userSelect, _count: { select: { orders: true, reviews: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return { items: serializeData(users), meta: buildPaginationMeta(page, limit, total) };
  },

  async adminGetUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        ...userSelect,
        _count: { select: { orders: true, addresses: true, reviews: true } },
        orders: {
          take: 10,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            orderNumber: true,
            status: true,
            total: true,
            placedAt: true,
          },
        },
      },
    });
    if (!user) throw ApiError.notFound("User not found");
    return serializeData(user);
  },

  async adminUpdateUser(userId: string, data: { role?: "CUSTOMER" | "ADMIN"; isActive?: boolean }) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw ApiError.notFound("User not found");

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.role !== undefined && { role: data.role }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
      select: userSelect,
    });

    // Revoke sessions when an account is deactivated.
    if (data.isActive === false) {
      await prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    return serializeData(updated);
  },
};
