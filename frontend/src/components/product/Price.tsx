import { cn } from "@/lib/utils";
import { effectivePrice } from "@/lib/format";

interface PriceProps {
  price: number;
  discountPrice?: number | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Price({ price, discountPrice, size = "md", className }: PriceProps) {
  const effective = effectivePrice({ price, discountPrice: discountPrice ?? null });
  const hasDiscount = discountPrice !== null && discountPrice !== undefined && discountPrice < price;

  const sizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-2xl",
  }[size];

  return (
    <div className={cn("flex flex-wrap items-baseline gap-2", className)}>
      <span className={cn("font-semibold text-foreground", sizeClasses)}>${effective.toFixed(2)}</span>
      {hasDiscount && (
        <span className={cn("text-muted-foreground line-through", size === "sm" ? "text-xs" : "text-sm")}>
          ${price.toFixed(2)}
        </span>
      )}
    </div>
  );
}
