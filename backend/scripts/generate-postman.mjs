/**
 * Postman collection generator.
 * Produces postman/ecommerce-api.postman_collection.json from a route table
 * so the collection stays in sync with the API.
 *
 * Run: npm run postman:generate
 */
import { writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "postman");

// ── helpers ──────────────────────────────────────────────────────────────
const JSON_HEADER = { key: "Content-Type", value: "application/json" };
const AUTH_HEADER = { key: "Authorization", value: "Bearer {{ACCESS_TOKEN}}", type: "text" };
const REFRESH_BODY = (extra = "") =>
  JSON.stringify({ refreshToken: "{{REFRESH_TOKEN}}" + (extra ? `, ${extra}` : "") }, null, 2);

function req(name, method, path, { auth = false, body, tests = [], headers = [], description } = {}) {
  const url = { raw: `{{BASE_URL}}${path}`, host: ["{{BASE_URL}}"] };
  const segs = path.split("/").filter(Boolean);
  url.path = segs.map((s) => (s.startsWith(":") ? s.slice(1) : s));
  const request = {
    method,
    header: auth ? [AUTH_HEADER, ...headers] : headers,
    url,
    description: description ?? "",
  };
  if (body !== undefined) {
    request.header = [JSON_HEADER, ...(request.header ?? [])];
    request.body = { mode: "raw", raw: typeof body === "string" ? body : JSON.stringify(body, null, 2), options: { raw: { language: "json" } } };
  }
  const item = { name, request };
  if (tests.length) item.event = [{ listen: "test", script: { type: "text/javascript", exec: tests } }];
  return item;
}

const ok = `pm.test("Status 200", () => pm.response.to.have.status(200));`;
const created = `pm.test("Status 201", () => pm.response.to.have.status(201));`;
const captureTokens = [
  created,
  `const data = pm.response.json().data;`,
  `pm.collectionVariables.set("ACCESS_TOKEN", data.accessToken);`,
  `pm.collectionVariables.set("REFRESH_TOKEN", data.refreshToken);`,
];

const loginTests = [
  ok,
  `const data = pm.response.json().data;`,
  `pm.collectionVariables.set("ACCESS_TOKEN", data.accessToken);`,
  `pm.collectionVariables.set("REFRESH_TOKEN", data.refreshToken);`,
];

// ── route table ──────────────────────────────────────────────────────────
const auth = {
  name: "Auth",
  item: [
    req("Register", "POST", "/auth/register", {
      body: { name: "Mya Thandar", email: "customer@novacart.dev", password: "Customer@1234" },
      tests: captureTokens,
    }),
    req("Login", "POST", "/auth/login", {
      body: { email: "customer@novacart.dev", password: "Customer@1234" },
      tests: loginTests,
    }),
    req("Login as Admin", "POST", "/auth/login", {
      body: { email: "admin@novacart.dev", password: "Admin@1234" },
      tests: loginTests,
    }),
    req("Refresh Token", "POST", "/auth/refresh", {
      body: { refreshToken: "{{REFRESH_TOKEN}}" },
      tests: [ok, `const data = pm.response.json().data;`, `pm.collectionVariables.set("ACCESS_TOKEN", data.accessToken);`, `pm.collectionVariables.set("REFRESH_TOKEN", data.refreshToken);`],
    }),
    req("Logout", "POST", "/auth/logout", {
      auth: true,
      body: { refreshToken: "{{REFRESH_TOKEN}}" },
      tests: [ok],
    }),
    req("Forgot Password", "POST", "/auth/forgot-password", {
      body: { email: "customer@novacart.dev" },
      tests: [ok, `pm.collectionVariables.set("RESET_TOKEN", pm.response.json().data.devResetToken);`],
    }),
    req("Reset Password", "POST", "/auth/reset-password", {
      body: { token: "{{RESET_TOKEN}}", password: "NewPassword@123" },
      tests: [ok],
    }),
    req("Get Current User", "GET", "/auth/me", {
      auth: true,
      tests: [ok, `pm.test("Returns user data", () => pm.expect(pm.response.json().data.email).to.be.a("string"));`],
    }),
  ],
};

const users = {
  name: "Users",
  item: [
    req("Update Profile", "PATCH", "/users/me", {
      auth: true,
      body: { name: "Mya Thandar", avatar: null },
      tests: [ok],
    }),
    req("Change Password", "POST", "/users/me/change-password", {
      auth: true,
      body: { currentPassword: "Customer@1234", newPassword: "Customer@12345" },
      tests: [ok],
    }),
    req("List Addresses", "GET", "/users/addresses", { auth: true, tests: [ok] }),
    req("Create Address", "POST", "/users/addresses", {
      auth: true,
      body: { label: "Home", recipientName: "Mya Thandar", phone: "+95 9 123 456 789", line1: "12, Pyay Road, Kamayut", city: "Yangon", state: "Yangon Region", postalCode: "11041", country: "Myanmar", isDefault: true },
      tests: [created, `pm.collectionVariables.set("ADDRESS_ID", pm.response.json().data.id);`],
    }),
    req("Update Address", "PATCH", "/users/addresses/:addressId", {
      auth: true,
      body: { label: "Office" },
      tests: [ok],
    }),
    req("Delete Address", "DELETE", "/users/addresses/:addressId", { auth: true, tests: [ok] }),
  ],
};

const products = {
  name: "Products",
  item: [
    req("List Products", "GET", "/products?page=1&limit=12", { tests: [ok, `pm.test("Has items", () => pm.expect(pm.response.json().data.items.length).to.be.above(0));`] }),
    req("Search Products", "GET", "/products?search=headphones", { tests: [ok] }),
    req("Filter Products", "GET", "/products?category=electronics&minPrice=20&maxPrice=200&inStock=true&sort=price-asc", { tests: [ok] }),
    req("Get Product", "GET", "/products/:productId", { tests: [ok] }),
    req("Create Product (Admin)", "POST", "/products", {
      auth: true,
      body: {
        name: "Example Wireless Mouse",
        description: "A comfortable ergonomic wireless mouse with silent clicks and a 2-year battery life.",
        price: 45,
        discountPrice: 35,
        sku: "NC-EXAMPLE-001",
        stock: 30,
        categoryId: "{{CATEGORY_ID}}",
        brandId: "{{BRAND_ID}}",
        isPublished: true,
        images: [{ url: "https://example.com/mouse.png", alt: "Example mouse", sortOrder: 0 }],
        variants: [{ sku: "NC-EXAMPLE-001-BLK", color: "Black", stock: 30 }],
      },
      tests: [created, `pm.collectionVariables.set("PRODUCT_ID", pm.response.json().data.id);`],
    }),
    req("Update Product (Admin)", "PATCH", "/products/:productId", {
      auth: true,
      body: { price: 40 },
      tests: [ok],
    }),
    req("Delete Product (Admin)", "DELETE", "/products/:productId", { auth: true, tests: [ok] }),
    req("List Products (Admin)", "GET", "/products/admin/list", { auth: true, tests: [ok] }),
  ],
};

const categories = {
  name: "Categories",
  item: [
    req("List Categories", "GET", "/categories", { tests: [ok] }),
    req("Get Category", "GET", "/categories/:categoryId", { tests: [ok] }),
    req("Create Category (Admin)", "POST", "/categories", {
      auth: true,
      body: { name: "New Category", description: "Created from Postman", isActive: true },
      tests: [created, `pm.collectionVariables.set("CATEGORY_ID", pm.response.json().data.id);`],
    }),
    req("Update Category (Admin)", "PATCH", "/categories/:categoryId", { auth: true, body: { name: "Renamed Category" }, tests: [ok] }),
    req("Delete Category (Admin)", "DELETE", "/categories/:categoryId", { auth: true, tests: [ok] }),
  ],
};

const brands = {
  name: "Brands",
  item: [
    req("List Brands", "GET", "/brands", { tests: [ok] }),
    req("Create Brand (Admin)", "POST", "/brands", {
      auth: true,
      body: { name: "New Brand", description: "Created from Postman", isActive: true },
      tests: [created, `pm.collectionVariables.set("BRAND_ID", pm.response.json().data.id);`],
    }),
    req("Update Brand (Admin)", "PATCH", "/brands/:brandId", { auth: true, body: { name: "Renamed Brand" }, tests: [ok] }),
    req("Delete Brand (Admin)", "DELETE", "/brands/:brandId", { auth: true, tests: [ok] }),
  ],
};

const cart = {
  name: "Cart",
  item: [
    req("Get Cart", "GET", "/cart", {
      auth: true,
      tests: [ok, `pm.test("Has totals", () => { const d = pm.response.json().data; pm.expect(d).to.have.property("subtotal"); pm.expect(d).to.have.property("total"); });`],
    }),
    req("Add Item", "POST", "/cart/items", {
      auth: true,
      body: { productId: "{{PRODUCT_ID}}", quantity: 2 },
      tests: [created, `pm.collectionVariables.set("CART_ITEM_ID", pm.response.json().data.id);`],
    }),
    req("Update Item Quantity", "PATCH", "/cart/items/:cartItemId", {
      auth: true,
      body: { quantity: 3 },
      tests: [ok],
    }),
    req("Remove Item", "DELETE", "/cart/items/:cartItemId", { auth: true, tests: [ok] }),
    req("Clear Cart", "DELETE", "/cart", { auth: true, tests: [ok] }),
  ],
};

const wishlist = {
  name: "Wishlist",
  item: [
    req("Get Wishlist", "GET", "/wishlist", { auth: true, tests: [ok] }),
    req("Add Item", "POST", "/wishlist/items", {
      auth: true,
      body: { productId: "{{PRODUCT_ID}}" },
      tests: [created],
    }),
    req("Remove Item", "DELETE", "/wishlist/items/:productId", { auth: true, tests: [ok] }),
  ],
};

const orders = {
  name: "Orders",
  item: [
    req("Place Order (CARD)", "POST", "/orders", {
      auth: true,
      body: { addressId: "{{ADDRESS_ID}}", paymentMethod: "CARD", couponCode: "WELCOME10", notes: "Please leave at the door" },
      tests: [created, `pm.test("Order is PAID (mock payment)", () => pm.expect(pm.response.json().data.paymentStatus).to.eql("PAID"));`, `pm.collectionVariables.set("ORDER_ID", pm.response.json().data.id);`],
    }),
    req("Place Order (COD)", "POST", "/orders", {
      auth: true,
      body: { addressId: "{{ADDRESS_ID}}", paymentMethod: "CASH_ON_DELIVERY" },
      tests: [created],
    }),
    req("List My Orders", "GET", "/orders", { auth: true, tests: [ok] }),
    req("Get Order", "GET", "/orders/:orderId", { auth: true, tests: [ok] }),
    req("Cancel Order", "PATCH", "/orders/:orderId/cancel", { auth: true, tests: [ok] }),
    req("List All Orders (Admin)", "GET", "/orders/admin/all", { auth: true, tests: [ok] }),
    req("Update Order Status (Admin)", "PATCH", "/orders/admin/:orderId/status", {
      auth: true,
      body: { status: "CONFIRMED" },
      tests: [ok],
    }),
    req("Get Order (Admin)", "GET", "/orders/admin/:orderId", { auth: true, tests: [ok] }),
  ],
};

const payments = {
  name: "Payments",
  item: [
    req("Validate Coupon", "POST", "/coupons/validate", {
      body: { code: "WELCOME10", subtotal: 120 },
      tests: [ok, `pm.test("Returns discount", () => pm.expect(pm.response.json().data.discount).to.be.above(0));`],
    }),
    req("Reject Expired Coupon", "POST", "/coupons/validate", {
      body: { code: "EXPIRED10", subtotal: 120 },
      tests: [`pm.test("Status 400", () => pm.response.to.have.status(400));`, `pm.test("Message mentions expiry", () => pm.expect(pm.response.json().message).to.match(/expired/i));`],
    }),
  ],
};

const reviews = {
  name: "Reviews",
  item: [
    req("List Product Reviews", "GET", "/products/:productId/reviews", { tests: [ok] }),
    req("Create Review", "POST", "/products/:productId/reviews", {
      auth: true,
      body: { rating: 5, comment: "Excellent product, very happy with my purchase!" },
      tests: [created, `pm.collectionVariables.set("REVIEW_ID", pm.response.json().data.id);`],
    }),
    req("Reject Duplicate Review", "POST", "/products/:productId/reviews", {
      auth: true,
      body: { rating: 4, comment: "Trying to review twice." },
      tests: [`pm.test("Status 409", () => pm.response.to.have.status(409));`],
    }),
    req("My Reviews", "GET", "/reviews/mine", { auth: true, tests: [ok] }),
    req("Update Review", "PATCH", "/reviews/:reviewId", { auth: true, body: { rating: 4, comment: "Updated review text." }, tests: [ok] }),
    req("Delete Review", "DELETE", "/reviews/:reviewId", { auth: true, tests: [ok] }),
    req("List All Reviews (Admin)", "GET", "/reviews/admin/all", { auth: true, tests: [ok] }),
  ],
};

const coupons = {
  name: "Coupons",
  item: [
    req("List Coupons (Admin)", "GET", "/coupons", { auth: true, tests: [ok] }),
    req("Create Coupon (Admin)", "POST", "/coupons", {
      auth: true,
      body: { code: "POSTMAN20", type: "PERCENTAGE", value: 20, minOrderAmount: 40, maxDiscount: 30, usageLimit: 100, isActive: true },
      tests: [created, `pm.collectionVariables.set("COUPON_ID", pm.response.json().data.id);`],
    }),
    req("Update Coupon (Admin)", "PATCH", "/coupons/:couponId", { auth: true, body: { value: 25 }, tests: [ok] }),
    req("Delete Coupon (Admin)", "DELETE", "/coupons/:couponId", { auth: true, tests: [ok] }),
  ],
};

const inventory = {
  name: "Inventory",
  item: [
    req("List Inventory (Admin)", "GET", "/admin/inventory?lowStock=true", { auth: true, tests: [ok] }),
    req("Adjust Stock (Admin)", "PATCH", "/admin/inventory/:productId", {
      auth: true,
      body: { change: 10, reason: "Restock from supplier" },
      tests: [ok],
    }),
    req("Inventory Logs (Admin)", "GET", "/admin/inventory/logs", { auth: true, tests: [ok] }),
  ],
};

const admin = {
  name: "Admin",
  item: [
    req("Dashboard Stats", "GET", "/admin/stats", { auth: true, tests: [ok, `pm.test("Has KPIs", () => { const d = pm.response.json().data; pm.expect(d).to.have.property("revenue"); pm.expect(d).to.have.property("totalOrders"); });`] }),
    req("Revenue Over Time", "GET", "/admin/revenue?days=30", { auth: true, tests: [ok] }),
    req("Top Products", "GET", "/admin/top-products?limit=5", { auth: true, tests: [ok] }),
    req("Sales by Category", "GET", "/admin/sales-by-category", { auth: true, tests: [ok] }),
    req("List Users", "GET", "/users?page=1&limit=10", { auth: true, tests: [ok] }),
    req("Get User (Admin)", "GET", "/users/:userId", { auth: true, tests: [ok] }),
    req("Update User Role (Admin)", "PATCH", "/users/:userId", { auth: true, body: { role: "ADMIN" }, tests: [ok] }),
    req("Deactivate User (Admin)", "PATCH", "/users/:userId", { auth: true, body: { isActive: false }, tests: [ok] }),
  ],
};

const collection = {
  info: {
    name: "Full-Stack E-Commerce API",
    description:
      "Complete Postman collection for the NovaCart e-commerce REST API.\n\n" +
      "Setup:\n" +
      "1. Import this collection and the `ecommerce-api.postman_environment.json` environment.\n" +
      "2. Set BASE_URL (default http://localhost:4000/api/v1).\n" +
      "3. Run 'Auth > Login as Admin' and 'Auth > Login' to capture tokens automatically.\n" +
      "4. Seed variables: run 'Products > Create Product (Admin)' and 'Users > Create Address' to populate PRODUCT_ID / ADDRESS_ID.\n\n" +
      "Demo accounts:\n" +
      "  Admin    → admin@novacart.dev / Admin@1234\n" +
      "  Customer → customer@novacart.dev / Customer@1234",
    schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
  },
  item: [auth, users, products, categories, brands, cart, wishlist, orders, payments, reviews, coupons, inventory, admin],
  variable: [
    { key: "BASE_URL", value: "http://localhost:4000/api/v1", type: "string" },
    { key: "ACCESS_TOKEN", value: "", type: "string" },
    { key: "REFRESH_TOKEN", value: "", type: "string" },
    { key: "PRODUCT_ID", value: "", type: "string" },
    { key: "ADDRESS_ID", value: "", type: "string" },
    { key: "CATEGORY_ID", value: "", type: "string" },
    { key: "BRAND_ID", value: "", type: "string" },
    { key: "ORDER_ID", value: "", type: "string" },
    { key: "REVIEW_ID", value: "", type: "string" },
    { key: "COUPON_ID", value: "", type: "string" },
    { key: "RESET_TOKEN", value: "", type: "string" },
  ],
};

const environment = {
  name: "E-Commerce API",
  values: [
    { key: "BASE_URL", value: "http://localhost:4000/api/v1", enabled: true },
    { key: "ACCESS_TOKEN", value: "", enabled: true },
    { key: "REFRESH_TOKEN", value: "", enabled: true },
  ],
};

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(join(OUT_DIR, "ecommerce-api.postman_collection.json"), JSON.stringify(collection, null, 2));
writeFileSync(join(OUT_DIR, "ecommerce-api.postman_environment.json"), JSON.stringify(environment, null, 2));
console.log(`✅ Generated postman/ecommerce-api.postman_collection.json (${collection.item.length} folders)`);
console.log(`✅ Generated postman/ecommerce-api.postman_environment.json`);
