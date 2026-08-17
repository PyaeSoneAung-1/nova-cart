import type { OrderStatus } from "@/lib/types";

export const ORDER_STATUS_STYLES: Record<OrderStatus, { variant: "default" | "secondary" | "outline" | "destructive"; label: string }> = {
  PENDING: { variant: "outline", label: "Pending" },
  CONFIRMED: { variant: "secondary", label: "Confirmed" },
  PROCESSING: { variant: "secondary", label: "Processing" },
  SHIPPED: { variant: "default", label: "Shipped" },
  DELIVERED: { variant: "default", label: "Delivered" },
  CANCELLED: { variant: "destructive", label: "Cancelled" },
};

export const ORDER_STATUS_STEPS = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"] as const;
