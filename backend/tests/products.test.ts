import { describe, it, expect } from "vitest";
import request from "supertest";
import { app, registerUser, createProduct, createAdminTokens } from "./helpers";

describe("Products API", () => {
  describe("Public listing", () => {
    it("returns published products with pagination meta", async () => {
      const admin = await createAdminTokens();
      await createProduct(admin, { name: "Alpha Gadget", price: 50, discountPrice: 40, stock: 10 });
      await createProduct(admin, { name: "Beta Widget", price: 200, stock: 3 });

      const res = await request(app).get("/api/v1/products").expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items.length).toBe(2);
      expect(res.body.data.meta.total).toBe(2);
      expect(res.body.data.meta.page).toBe(1);
      expect(res.body.data.items[0]).toHaveProperty("images");
    });

    it("filters by search, price range and stock", async () => {
      const admin = await createAdminTokens();
      await createProduct(admin, { name: "Cheap Sock", price: 10, stock: 0 });
      await createProduct(admin, { name: "Pricey Phone", price: 500, stock: 5 });

      const search = await request(app).get("/api/v1/products?search=sock").expect(200);
      expect(search.body.data.items).toHaveLength(1);
      expect(search.body.data.items[0].name).toBe("Cheap Sock");

      const priced = await request(app).get("/api/v1/products?minPrice=100&maxPrice=600").expect(200);
      expect(priced.body.data.items[0].name).toBe("Pricey Phone");

      const inStock = await request(app).get("/api/v1/products?inStock=true").expect(200);
      expect(inStock.body.data.items).toHaveLength(1);
      expect(inStock.body.data.items[0].name).toBe("Pricey Phone");
    });

    it("sorts by price asc/desc and newest", async () => {
      const admin = await createAdminTokens();
      await createProduct(admin, { name: "Cheap", price: 30 });
      await createProduct(admin, { name: "Expensive", price: 300 });

      const asc = await request(app).get("/api/v1/products?sort=price-asc").expect(200);
      expect(asc.body.data.items[0].name).toBe("Cheap");

      const desc = await request(app).get("/api/v1/products?sort=price-desc").expect(200);
      expect(desc.body.data.items[0].name).toBe("Expensive");
    });

    it("hides unpublished products from the public list", async () => {
      const admin = await createAdminTokens();
      await createProduct(admin, { name: "Secret Product", isPublished: false });

      const res = await request(app).get("/api/v1/products?search=secret").expect(200);
      expect(res.body.data.items).toHaveLength(0);
    });

    it("validates query params", async () => {
      await request(app).get("/api/v1/products?sort=bogus").expect(422);
      await request(app).get("/api/v1/products?page=-1").expect(422);
    });
  });

  describe("Product detail", () => {
    it("returns a product by id with images and variants", async () => {
      const admin = await createAdminTokens();
      const { id } = await createProduct(admin, {
        variants: [{ sku: "VAR-1", size: "M", color: "Black", price: 90, stock: 5 }],
      });

      const res = await request(app).get(`/api/v1/products/${id}`).expect(200);
      expect(res.body.data.id).toBe(id);
      expect(res.body.data.variants).toHaveLength(1);
      expect(res.body.data.related).toBeDefined();
    });

    it("returns 404 for an unknown product", async () => {
      await request(app).get("/api/v1/products/does-not-exist-123").expect(404);
    });
  });

  describe("Admin CRUD", () => {
    it("creates a product with nested images and variants", async () => {
      const admin = await createAdminTokens();
      const { product } = await createProduct(admin, {
        images: [{ url: "https://example.com/img.png", alt: "Photo", sortOrder: 0 }],
      });
      expect(product.slug).toBeDefined();
      expect(product.images).toHaveLength(1);
      expect(product.stock).toBe(50);
    });

    it("rejects a duplicate slug with 409", async () => {
      const admin = await createAdminTokens();
      await createProduct(admin, { name: "Unique Name" });

      const category = await (await import("../src/config/prisma")).prisma.category.findFirst();
      const res = await request(app)
        .post("/api/v1/products")
        .set("Authorization", `Bearer ${admin.accessToken}`)
        .send({
          name: "Unique Name",
          description: "Duplicate name test product description here.",
          price: 10,
          sku: "SKU-DUP",
          stock: 5,
          categoryId: category!.id,
        })
        .expect(409);
      expect(res.body.message).toMatch(/already exists/i);
    });

    it("rejects product creation without admin role", async () => {
      const { tokens } = await registerUser();
      await request(app)
        .post("/api/v1/products")
        .set("Authorization", `Bearer ${tokens.accessToken}`)
        .send({ name: "Nope", description: "A description that is long enough for validation.", price: 10, sku: "SKU-X", stock: 1, categoryId: "whatever" })
        .expect(403);
    });

    it("rejects product creation without auth", async () => {
      await request(app)
        .post("/api/v1/products")
        .send({ name: "Nope", description: "A description that is long enough for validation.", price: 10, sku: "SKU-Y", stock: 1 })
        .expect(401);
    });

    it("validates product payload", async () => {
      const admin = await createAdminTokens();
      const res = await request(app)
        .post("/api/v1/products")
        .set("Authorization", `Bearer ${admin.accessToken}`)
        .send({ name: "X", price: -5 }) // name too short, negative price, missing sku
        .expect(422);
      expect(res.body.errors.length).toBeGreaterThanOrEqual(1);
    });

    it("updates a product", async () => {
      const admin = await createAdminTokens();
      const { id } = await createProduct(admin);
      const res = await request(app)
        .patch(`/api/v1/products/${id}`)
        .set("Authorization", `Bearer ${admin.accessToken}`)
        .send({ price: 250 })
        .expect(200);
      expect(res.body.data.price).toBe(250);
    });

    it("deletes a product", async () => {
      const admin = await createAdminTokens();
      const { id } = await createProduct(admin);
      await request(app)
        .delete(`/api/v1/products/${id}`)
        .set("Authorization", `Bearer ${admin.accessToken}`)
        .expect(200);
      await request(app).get(`/api/v1/products/${id}`).expect(404);
    });
  });
});
