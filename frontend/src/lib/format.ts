/** Currency + date formatting helpers. */

export function formatPrice(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

/** Effective price after the discount. */
export function effectivePrice(p: { price: number; discountPrice: number | null }): number {
  if (p.discountPrice !== null && p.discountPrice < p.price) return p.discountPrice;
  return p.price;
}

/** Discount percentage for display badges. */
export function discountPercent(p: { price: number; discountPrice: number | null }): number | null {
  if (p.discountPrice === null || p.discountPrice >= p.price) return null;
  return Math.round(((p.price - p.discountPrice) / p.price) * 100);
}
