import { OrderStatus } from "@prisma/client";

/** Human-friendly order number: NC-YYYYMMDD-XXXXXX */
export function generateOrderNumber(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `NC-${date}-${random}`;
}

/** Mock payment transaction id. */
export function generateTransactionId(): string {
  return `PAY_${Date.now()}_${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

/** Valid forward transitions for order status. */
export const ORDER_STATUS_FLOW: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

/** Whether a customer is allowed to cancel from a given status. */
export const CUSTOMER_CANCELLABLE: OrderStatus[] = ["PENDING", "CONFIRMED"];
