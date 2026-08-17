/**
 * NovaCart seed script.
 * Creates: demo users (admin + customer), categories, brands, products,
 * variants, coupons, reviews, an address and sample orders so every part of
 * the app — including the admin dashboard — has data to show.
 *
 * Run with: npm run db:seed
 */
import { PrismaClient, Role, PaymentMethod } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ── Demo accounts ────────────────────────────────────────────────────────
export const DEMO_ACCOUNTS = {
  admin: { name: "Nova Admin", email: "admin@novacart.dev", password: "Admin@1234" },
  customer: { name: "Mya Thandar", email: "customer@novacart.dev", password: "Customer@1234" },
  customer2: { name: "Ko Aung", email: "aung@example.com", password: "Customer@1234" },
};

/** Deterministic SVG placeholder image (gradient + monogram) as a data URI. */
function productImage(name: string, seed: string): string {
  const palettes = [
    ["#6d28d9", "#a855f7"],
    ["#0f766e", "#2dd4bf"],
    ["#b45309", "#f59e0b"],
    ["#be123c", "#fb7185"],
    ["#1d4ed8", "#60a5fa"],
    ["#166534", "#4ade80"],
    ["#7c2d12", "#fb923c"],
    ["#581c87", "#c084fc"],
  ];
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const [c1, c2] = palettes[h % palettes.length]!;
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/></linearGradient></defs><rect width="800" height="800" fill="url(#g)"/><circle cx="400" cy="320" r="150" fill="rgba(255,255,255,0.12)"/><circle cx="400" cy="320" r="95" fill="rgba(255,255,255,0.10)"/><text x="400" y="360" font-family="Arial, sans-serif" font-size="120" font-weight="bold" fill="rgba(255,255,255,0.92)" text-anchor="middle">${initials}</text><text x="400" y="520" font-family="Arial, sans-serif" font-size="34" fill="rgba(255,255,255,0.75)" text-anchor="middle">${name.slice(0, 22)}</text></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

async function main() {
  console.log("🌱 Seeding NovaCart database...");

  // ── Users ──────────────────────────────────────────────────────────────
  await prisma.user.upsert({
    where: { email: DEMO_ACCOUNTS.admin.email },
    update: {},
    create: {
      ...DEMO_ACCOUNTS.admin,
      role: Role.ADMIN,
      password: await bcrypt.hash(DEMO_ACCOUNTS.admin.password, 12),
    },
  });

  const customer = await prisma.user.upsert({
    where: { email: DEMO_ACCOUNTS.customer.email },
    update: {},
    create: {
      ...DEMO_ACCOUNTS.customer,
      password: await bcrypt.hash(DEMO_ACCOUNTS.customer.password, 12),
    },
  });

  const customer2 = await prisma.user.upsert({
    where: { email: DEMO_ACCOUNTS.customer2.email },
    update: {},
    create: {
      ...DEMO_ACCOUNTS.customer2,
      password: await bcrypt.hash(DEMO_ACCOUNTS.customer2.password, 12),
    },
  });

  for (const user of [customer, customer2]) {
    await prisma.cart.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id } });
    await prisma.wishlist.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id } });
  }

  // ── Categories ─────────────────────────────────────────────────────────
  const categoriesData = [
    { name: "Electronics", description: "Gadgets, audio, wearables and smart devices" },
    { name: "Fashion", description: "Apparel and accessories for every season" },
    { name: "Home & Living", description: "Furniture, decor and kitchen essentials" },
    { name: "Sports & Outdoors", description: "Gear for training, travel and adventure" },
    { name: "Beauty & Care", description: "Skincare, grooming and personal care" },
    { name: "Books & Media", description: "Bestsellers, stationery and more" },
  ];
  const categories: Record<string, { id: string }> = {};
  for (const c of categoriesData) {
    const slug = c.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const created = await prisma.category.upsert({
      where: { slug },
      update: {},
      create: { ...c, slug, image: productImage(c.name, c.name) },
    });
    categories[c.name] = created;
  }

  // ── Brands ─────────────────────────────────────────────────────────────
  const brandsData = [
    { name: "NovaTech", description: "Premium electronics and innovation" },
    { name: "AeroGear", description: "Performance sportswear and outdoor gear" },
    { name: "PureHome", description: "Thoughtful products for modern living" },
    { name: "UrbanFit", description: "Everyday activewear that keeps up with you" },
    { name: "Lumière", description: "Clean beauty and self-care essentials" },
    { name: "PaperSoul", description: "Books and stationery for curious minds" },
  ];
  const brands: Record<string, { id: string }> = {};
  for (const b of brandsData) {
    const slug = b.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const created = await prisma.brand.upsert({
      where: { slug },
      update: {},
      create: { ...b, slug, image: productImage(b.name, b.name) },
    });
    brands[b.name] = created;
  }

  // ── Products ───────────────────────────────────────────────────────────
  type ProductSeed = {
    name: string;
    category: string;
    brand: string;
    price: number;
    discountPrice?: number;
    stock: number;
    description: string;
    variant?: { size: string; color: string; price: number; stock: number };
  };

  const products: ProductSeed[] = [
    // Electronics
    { name: "Aurora Wireless Headphones", category: "Electronics", brand: "NovaTech", price: 129, discountPrice: 99, stock: 40, description: "Immersive over-ear wireless headphones with active noise cancellation, 40-hour battery life and plush memory-foam ear cushions." },
    { name: "Pulse Smartwatch Series 5", category: "Electronics", brand: "NovaTech", price: 199, discountPrice: 159, stock: 25, description: "Track workouts, sleep and heart rate with a bright AMOLED display, GPS and 7-day battery life." },
    { name: "Echo Portable Bluetooth Speaker", category: "Electronics", brand: "NovaTech", price: 59, stock: 60, description: "Pocket-sized speaker with surprisingly big sound, IPX7 waterproofing and 12 hours of playtime." },
    { name: "Nimbus Mechanical Keyboard", category: "Electronics", brand: "NovaTech", price: 89, discountPrice: 69, stock: 15, description: "Hot-swappable mechanical keyboard with gasket mount, RGB backlight and PBT keycaps." },
    { name: "Orbit USB-C Power Bank 20K", category: "Electronics", brand: "NovaTech", price: 39, stock: 80, description: "20,000 mAh fast-charging power bank with dual USB-C ports and a slim aluminum body." },
    { name: "Zen 4K Action Camera", category: "Electronics", brand: "AeroGear", price: 149, stock: 4, description: "Rugged 4K/60fps action camera with electronic image stabilization and a waterproof case." },
    // Fashion
    { name: "Essential Cotton Tee", category: "Fashion", brand: "UrbanFit", price: 24, discountPrice: 17, stock: 120, variant: { size: "M", color: "Slate", price: 24, stock: 40 }, description: "Soft 100% organic cotton t-shirt with a relaxed fit that gets better with every wash." },
    { name: "Heritage Denim Jacket", category: "Fashion", brand: "UrbanFit", price: 89, discountPrice: 69, stock: 18, description: "Classic trucker jacket in durable 12oz selvedge denim. A wardrobe staple that ages beautifully." },
    { name: "Trail Running Sneakers", category: "Fashion", brand: "AeroGear", price: 110, stock: 30, description: "Lightweight trail runners with grippy outsole and breathable engineered mesh upper." },
    { name: "Merino Wool Beanie", category: "Fashion", brand: "AeroGear", price: 28, stock: 55, description: "Itch-free merino beanie that keeps you warm without overheating." },
    { name: "Canvas Everyday Backpack", category: "Fashion", brand: "PureHome", price: 64, discountPrice: 49, stock: 22, description: "Water-resistant canvas backpack with padded 15\" laptop sleeve and leather accents." },
    // Home & Living
    { name: "Nordic Oak Coffee Table", category: "Home & Living", brand: "PureHome", price: 249, stock: 8, description: "Minimalist solid oak coffee table with a lower shelf and rounded edges." },
    { name: "Aroma Ceramic Diffuser", category: "Home & Living", brand: "PureHome", price: 45, discountPrice: 35, stock: 33, description: "Ultrasonic ceramic diffuser with warm LED light and whisper-quiet mist." },
    { name: "Linen Throw Blanket", category: "Home & Living", brand: "PureHome", price: 52, stock: 47, description: "Breathable stonewashed linen throw in a neutral sand tone." },
    { name: "Brass Desk Lamp", category: "Home & Living", brand: "PureHome", price: 75, stock: 12, description: "Dimmable brass desk lamp with a linen shade and warm 2700K glow." },
    { name: "Stoneware Dinner Set (16pc)", category: "Home & Living", brand: "PureHome", price: 139, discountPrice: 119, stock: 3, description: "Speckled stoneware set for four — plates, bowls and mugs with a reactive glaze." },
    // Sports & Outdoors
    { name: "Pro Yoga Mat 6mm", category: "Sports & Outdoors", brand: "AeroGear", price: 42, discountPrice: 32, stock: 70, description: "Non-slip TPE yoga mat with alignment lines and a carry strap." },
    { name: "Insulated Water Bottle 1L", category: "Sports & Outdoors", brand: "AeroGear", price: 29, stock: 90, description: "Double-wall stainless bottle keeps drinks cold 24h / hot 12h." },
    { name: "Adjustable Dumbbell Set", category: "Sports & Outdoors", brand: "UrbanFit", price: 189, discountPrice: 149, stock: 6, description: "Space-saving dumbbells adjustable from 2.5kg to 25kg with a secure dial system." },
    { name: "Camping Headlamp", category: "Sports & Outdoors", brand: "AeroGear", price: 22, stock: 64, description: "130-lumen rechargeable headlamp with red-light mode and motion sensor." },
    // Beauty & Care
    { name: "Vitamin C Serum 30ml", category: "Beauty & Care", brand: "Lumière", price: 34, stock: 100, description: "Brightening 15% vitamin C serum with hyaluronic acid and vitamin E." },
    { name: "Hydrating Facial Cleanser", category: "Beauty & Care", brand: "Lumière", price: 18, discountPrice: 14, stock: 85, description: "Gentle gel cleanser that removes makeup and balances skin without stripping." },
    { name: "Shea Butter Hand Cream", category: "Beauty & Care", brand: "Lumière", price: 12, stock: 110, description: "Rich shea hand cream with a subtle neroli scent. Fast-absorbing, never greasy." },
    // Books & Media
    { name: "The Midnight Library", category: "Books & Media", brand: "PaperSoul", price: 16, discountPrice: 12, stock: 200, description: "A dazzling novel about the choices that define our lives — and the ones we never take." },
    { name: "Minimalist Journal — Dotted", category: "Books & Media", brand: "PaperSoul", price: 14, stock: 150, description: "160 pages of 120gsm dotted paper in a soft-touch cover with an elastic closure." },
  ];

  let skuIndex = 0;
  const productIds: string[] = [];

  for (const p of products) {
    skuIndex += 1;
    const slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const existing = await prisma.product.findUnique({ where: { slug } });
    const img = productImage(p.name, slug);
    const data = {
      name: p.name,
      slug,
      description: p.description,
      price: p.price,
      discountPrice: p.discountPrice ?? null,
      sku: `NC-${String(skuIndex).padStart(4, "0")}`,
      stock: p.stock,
      isPublished: true,
      categoryId: categories[p.category]!.id,
      brandId: brands[p.brand]!.id,
      images: { create: [{ url: img, alt: p.name, sortOrder: 0 }] },
    };

    let product;
    if (existing) {
      product = await prisma.product.update({ where: { id: existing.id }, data });
    } else {
      product = await prisma.product.create({ data });
    }
    productIds.push(product.id);

    if (p.variant) {
      await prisma.productVariant.deleteMany({ where: { productId: product.id } });
      await prisma.productVariant.create({
        data: {
          productId: product.id,
          sku: `${product.sku}-VAR`,
          size: p.variant.size,
          color: p.variant.color,
          price: p.variant.price,
          stock: p.variant.stock,
        },
      });
    }
  }

  // ── Coupons ────────────────────────────────────────────────────────────
  const coupons = [
    { code: "WELCOME10", type: "PERCENTAGE" as const, value: 10, minOrderAmount: 30, maxDiscount: 20, usageLimit: 1000 },
    { code: "SAVE15", type: "PERCENTAGE" as const, value: 15, minOrderAmount: 50, maxDiscount: 50, usageLimit: 500 },
    { code: "FLAT5", type: "FIXED" as const, value: 5, minOrderAmount: 20 },
    { code: "EXPIRED10", type: "PERCENTAGE" as const, value: 10, minOrderAmount: 10, expiresAt: new Date(Date.now() - 30 * 864e5), usageLimit: 100 },
    { code: "INACTIVE20", type: "PERCENTAGE" as const, value: 20, minOrderAmount: 10, isActive: false, usageLimit: 100 },
  ];
  for (const c of coupons) {
    await prisma.coupon.upsert({
      where: { code: c.code },
      update: {},
      create: c,
    });
  }

  // ── Address ────────────────────────────────────────────────────────────
  const address = await prisma.address.upsert({
    where: { id: "seed-address-001" },
    update: {},
    create: {
      id: "seed-address-001",
      userId: customer.id,
      label: "Home",
      recipientName: customer.name,
      phone: "+95 9 123 456 789",
      line1: "12, Pyay Road, Kamayut",
      city: "Yangon",
      state: "Yangon Region",
      postalCode: "11041",
      country: "Myanmar",
      isDefault: true,
    },
  });

  // ── Reviews (from demo customer on a few products) ─────────────────────
  const reviewSeeds = [
    { productName: "Aurora Wireless Headphones", rating: 5, comment: "Noise cancellation is incredible for the price. Battery easily lasts a week of daily use." },
    { productName: "Essential Cotton Tee", rating: 4, comment: "Great soft fabric and the fit is exactly as described. Runs slightly large." },
    { productName: "Vitamin C Serum 30ml", rating: 5, comment: "My skin looks noticeably brighter after three weeks. No irritation at all." },
    { productName: "Pro Yoga Mat 6mm", rating: 4, comment: "Great grip even during hot yoga. Love the alignment lines." },
    { productName: "The Midnight Library", rating: 5, comment: "Beautiful, thought-provoking read. Arrived in perfect condition." },
  ];
  for (const r of reviewSeeds) {
    const product = await prisma.product.findFirst({ where: { name: r.productName } });
    if (!product) continue;
    await prisma.review.upsert({
      where: { productId_userId: { productId: product.id, userId: customer.id } },
      update: {},
      create: {
        productId: product.id,
        userId: customer.id,
        rating: r.rating,
        comment: r.comment,
        isVerifiedPurchase: true,
      },
    });
  }

  // ── Sample orders (so the admin dashboard has real numbers) ────────────
  const sampleOrder = async (
    user: { id: string },
    addressId: string,
    items: { name: string; sku: string; unitPrice: number; quantity: number }[],
    daysAgo: number,
    status: "PENDING" | "CONFIRMED" | "PROCESSING" | "SHIPPED" | "DELIVERED",
  ) => {
    const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
    const discount = 0;
    const shippingFee = subtotal >= 50 ? 0 : 5;
    const total = subtotal - discount + shippingFee;
    const paid = status !== "PENDING";

    const product = await prisma.product.findFirst({ where: { sku: items[0]!.sku } });
    if (!product) return;

    const orderNumber = `NC-DEMO-${1000 + daysAgo}-${Math.floor(Math.random() * 900 + 100)}`;
    const exists = await prisma.order.findUnique({ where: { orderNumber } });
    if (exists) return;

    await prisma.order.create({
      data: {
        orderNumber,
        userId: user.id,
        status,
        paymentStatus: paid ? "PAID" : "PENDING",
        paymentMethod: PaymentMethod.CARD,
        subtotal,
        discount,
        shippingFee,
        total,
        placedAt: new Date(Date.now() - daysAgo * 864e5),
        addressSnapshot: {
          label: "Home",
          recipientName: user.id === customer.id ? customer.name : customer2.name,
          phone: "+95 9 123 456 789",
          line1: "12, Pyay Road, Kamayut",
          city: "Yangon",
          state: "Yangon Region",
          postalCode: "11041",
          country: "Myanmar",
        },
        items: {
          create: items.map((i) => ({
            productId: product.id,
            name: i.name,
            sku: i.sku,
            unitPrice: i.unitPrice,
            quantity: i.quantity,
            total: i.unitPrice * i.quantity,
          })),
        },
        payment: {
          create: {
            method: PaymentMethod.CARD,
            status: paid ? "PAID" : "PENDING",
            transactionId: paid ? `PAY_DEMO_${daysAgo}_${Math.random().toString(36).slice(2, 8)}` : null,
            amount: total,
            paidAt: paid ? new Date(Date.now() - daysAgo * 864e5) : null,
          },
        },
      },
    });

    // Keep stock consistent with demo sales.
    await prisma.product.update({
      where: { id: product.id },
      data: { stock: { decrement: items.reduce((s, i) => s + i.quantity, 0) } },
    });
  };

  const head = await prisma.product.findFirst({ where: { name: "Aurora Wireless Headphones" } });
  const tee = await prisma.product.findFirst({ where: { name: "Essential Cotton Tee" } });
  const serum = await prisma.product.findFirst({ where: { name: "Vitamin C Serum 30ml" } });
  const bottle = await prisma.product.findFirst({ where: { name: "Insulated Water Bottle 1L" } });
  const watch = await prisma.product.findFirst({ where: { name: "Pulse Smartwatch Series 5" } });
  const speaker = await prisma.product.findFirst({ where: { name: "Echo Portable Bluetooth Speaker" } });
  const book = await prisma.product.findFirst({ where: { name: "The Midnight Library" } });
  const mat = await prisma.product.findFirst({ where: { name: "Pro Yoga Mat 6mm" } });
  const lamp = await prisma.product.findFirst({ where: { name: "Brass Desk Lamp" } });

  const find = async (name: string) => prisma.product.findFirst({ where: { name } });
  const p = async (name: string) => (await find(name))!;

  // Delivered / shipped / processing orders (paid → revenue)
  await sampleOrder(customer, address.id, [{ name: "Aurora Wireless Headphones", sku: (await p("Aurora Wireless Headphones")).sku, unitPrice: 99, quantity: 1 }], 28, "DELIVERED");
  await sampleOrder(customer, address.id, [{ name: "Essential Cotton Tee", sku: (await p("Essential Cotton Tee")).sku, unitPrice: 17, quantity: 2 }], 21, "DELIVERED");
  await sampleOrder(customer, address.id, [{ name: "Vitamin C Serum 30ml", sku: (await p("Vitamin C Serum 30ml")).sku, unitPrice: 34, quantity: 1 }], 14, "SHIPPED");
  await sampleOrder(customer, address.id, [{ name: "Insulated Water Bottle 1L", sku: (await p("Insulated Water Bottle 1L")).sku, unitPrice: 29, quantity: 1 }], 9, "PROCESSING");
  await sampleOrder(customer2, address.id, [{ name: "Pulse Smartwatch Series 5", sku: (await p("Pulse Smartwatch Series 5")).sku, unitPrice: 159, quantity: 1 }], 6, "CONFIRMED");
  await sampleOrder(customer2, address.id, [{ name: "Echo Portable Bluetooth Speaker", sku: (await p("Echo Portable Bluetooth Speaker")).sku, unitPrice: 59, quantity: 2 }], 2, "PENDING");

  void head; void tee; void serum; void bottle; void watch; void speaker; void book; void mat; void lamp;

  // ── Summary ────────────────────────────────────────────────────────────
  const summary = {
    users: await prisma.user.count(),
    products: await prisma.product.count(),
    categories: await prisma.category.count(),
    brands: await prisma.brand.count(),
    coupons: await prisma.coupon.count(),
    reviews: await prisma.review.count(),
    orders: await prisma.order.count(),
  };
  console.log("✅ Seed complete:", summary);
  console.log("\n🔑 Demo accounts:");
  console.log(`   Admin    → ${DEMO_ACCOUNTS.admin.email} / ${DEMO_ACCOUNTS.admin.password}`);
  console.log(`   Customer → ${DEMO_ACCOUNTS.customer.email} / ${DEMO_ACCOUNTS.customer.password}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
