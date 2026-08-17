import { Star, StarHalf } from "lucide-react";
import { cn } from "@/lib/utils";

interface RatingStarsProps {
  rating: number;
  count?: number;
  size?: "sm" | "md";
  className?: string;
}

export function RatingStars({ rating, count, size = "sm", className }: RatingStarsProps) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.25 && rating - full < 0.75;
  const dim = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => {
          if (i < full) return <Star key={i} className={cn(dim, "fill-amber-400 text-amber-400")} />;
          if (i === full && half)
            return <StarHalf key={i} className={cn(dim, "fill-amber-400 text-amber-400")} />;
          return <Star key={i} className={cn(dim, "text-zinc-300")} />;
        })}
      </div>
      {count !== undefined && (
        <span className="text-xs text-muted-foreground">
          {rating.toFixed(1)} ({count})
        </span>
      )}
      {count === undefined && rating > 0 && (
        <span className="text-xs font-medium text-muted-foreground">{rating.toFixed(1)}</span>
      )}
    </div>
  );
}
