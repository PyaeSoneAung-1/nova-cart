/** Shared API types (mirror the backend response shapes). */

export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface ApiErrorBody {
  success: boolean;
  message: string;
  errors: { field: string; message: string }[];
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface Paginated<T> {
  items: T[];
  meta: PaginationMeta;
}

export type Role = "CUSTOMER" | "ADMIN";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar: string | null;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { orders?: number; addresses?: number; reviews?: number };
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  isActive: boolean;
  _count?: { products: number };
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  isActive: boolean;
  _count?: { products: number };
}

export interface ProductImage {
  id: string;
  url: string;
  alt: string | null;
  sortOrder: number;
}

export interface ProductVariant {
  id: string;
  sku: string;
  size: string | null;
  color: string | null;
  price: number | null;
  stock: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  discountPrice: number | null;
  sku: string;
  stock: number;
  rating: number;
  ratingCount: number;
  isPublished: boolean;
  categoryId: string;
  brandId: string | null;
  category?: { id: string; name: string; slug: string };
  brand?: { id: string; name: string; slug: string } | null;
  images: ProductImage[];
  variants: ProductVariant[];
  related?: Product[];
  createdAt: string;
  updatedAt: string;
}

export interface Address {
  id: string;
  label: string;
  recipientName: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string | null;
  postalCode: string | null;
  country: string;
  isDefault: boolean;
}

export interface CartItem {
  id: string;
  quantity: number;
  product: Product;
  variant: ProductVariant | null;
  createdAt: string;
}

export interface Cart {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
}

export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED";

export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED";
export type PaymentMethod = "CARD" | "CASH_ON_DELIVERY";

export interface OrderItem {
  id: string;
  name: string;
  sku: string;
  image: string | null;
  unitPrice: number;
  quantity: number;
  total: number;
  product?: { id: string; slug: string };
}

export interface Payment {
  id: string;
  method: PaymentMethod;
  status: PaymentStatus;
  transactionId: string | null;
  amount: number;
  paidAt: string | null;
  failureReason: string | null;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
  addressSnapshot: Record<string, string>;
  notes: string | null;
  placedAt: string;
  items: OrderItem[];
  payment: Payment | null;
  coupon?: { code: string } | null;
  user?: { id: string; name: string; email: string };
}

export interface Review {
  id: string;
  rating: number;
  comment: string | null;
  isVerifiedPurchase: boolean;
  createdAt: string;
  updatedAt: string;
  user?: { id: string; name: string; avatar: string | null; email?: string };
  product?: { id: string; name: string; slug: string; images: ProductImage[] };
}

export type CouponType = "PERCENTAGE" | "FIXED";

export interface Coupon {
  id: string;
  code: string;
  type: CouponType;
  value: number;
  minOrderAmount: number;
  maxDiscount: number | null;
  startsAt: string;
  expiresAt: string | null;
  usageLimit: number | null;
  usedCount: number;
  isActive: boolean;
}

export interface AdminStats {
  revenue: number;
  orders: number;
  averageOrderValue: number;
  revenueToday: number;
  totalOrders: number;
  pendingOrders: number;
  totalCustomers: number;
  totalProducts: number;
  lowStockProducts: number;
}

export interface RevenuePoint {
  day: string;
  revenue: number;
  orders: number;
}

export interface TopProduct {
  productId: string;
  name: string;
  sku: string;
  sold: number;
  revenue: number;
}

export interface CategorySales {
  categoryId: string;
  category: string;
  sales: number;
  revenue: number;
}

export interface WishlistItem {
  id: string;
  product: Product;
  createdAt: string;
}

export interface InventoryRow {
  id: string;
  name: string;
  sku: string;
  stock: number;
  isPublished: boolean;
  variants: { id: string; sku: string; size: string | null; color: string | null; stock: number }[];
}

export interface InventoryLog {
  id: string;
  change: number;
  reason: string;
  createdAt: string;
  product: { id: string; name: string; sku: string };
  variant: { id: string; sku: string; color: string | null; size: string | null } | null;
}
