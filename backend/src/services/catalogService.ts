import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import { ApiError } from "../utils/ApiError";
import { slugify } from "../utils/slugify";
import { serializeData } from "../utils/serialize";

export const categoryService = {
  async listPublic() {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      include: { _count: { select: { products: { where: { isPublished: true } } } } },
    });
    return serializeData(categories);
  },

  async listAdmin() {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { products: true } } },
    });
    return serializeData(categories);
  },

  async get(id: string) {
    const category = await prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });
    if (!category) throw ApiError.notFound("Category not found");
    return serializeData(category);
  },

  async create(data: { name: string; description?: string; image?: string; isActive?: boolean }) {
    const slug = slugify(data.name);
    const existing = await prisma.category.findUnique({ where: { slug } });
    if (existing) throw ApiError.conflict("A category with this name already exists");
    const category = await prisma.category.create({ data: { ...data, slug } });
    return serializeData(category);
  },

  async update(id: string, data: Prisma.CategoryUpdateInput) {
    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound("Category not found");
    const updateData: Prisma.CategoryUpdateInput = { ...data };
    if (data.name && data.name !== existing.name) {
      updateData.slug = slugify(String(data.name));
    }
    const category = await prisma.category.update({ where: { id }, data: updateData });
    return serializeData(category);
  },

  async remove(id: string) {
    const existing = await prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });
    if (!existing) throw ApiError.notFound("Category not found");
    if (existing._count.products > 0) {
      throw ApiError.conflict(
        "Cannot delete a category that still has products. Move or delete its products first.",
      );
    }
    await prisma.category.delete({ where: { id } });
  },
};

export const brandService = {
  async listPublic() {
    const brands = await prisma.brand.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      include: { _count: { select: { products: { where: { isPublished: true } } } } },
    });
    return serializeData(brands);
  },

  async listAdmin() {
    const brands = await prisma.brand.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { products: true } } },
    });
    return serializeData(brands);
  },

  async create(data: { name: string; description?: string; image?: string; isActive?: boolean }) {
    const slug = slugify(data.name);
    const existing = await prisma.brand.findUnique({ where: { slug } });
    if (existing) throw ApiError.conflict("A brand with this name already exists");
    const brand = await prisma.brand.create({ data: { ...data, slug } });
    return serializeData(brand);
  },

  async update(id: string, data: Prisma.BrandUpdateInput) {
    const existing = await prisma.brand.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound("Brand not found");
    const updateData: Prisma.BrandUpdateInput = { ...data };
    if (data.name && data.name !== existing.name) {
      updateData.slug = slugify(String(data.name));
    }
    const brand = await prisma.brand.update({ where: { id }, data: updateData });
    return serializeData(brand);
  },

  async remove(id: string) {
    const existing = await prisma.brand.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });
    if (!existing) throw ApiError.notFound("Brand not found");
    if (existing._count.products > 0) {
      throw ApiError.conflict("Cannot delete a brand that still has products.");
    }
    await prisma.brand.delete({ where: { id } });
  },
};
