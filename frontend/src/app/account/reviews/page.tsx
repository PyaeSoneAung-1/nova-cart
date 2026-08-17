"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { Pencil, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AccountShell } from "@/components/account/AccountShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { RatingStars } from "@/components/product/RatingStars";
import { api, swrFetcher } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { Paginated, Review } from "@/lib/types";

export default function MyReviewsPage() {
  const { data, mutate, isLoading } = useSWR<Paginated<Review>>("/reviews/mine?limit=50", swrFetcher);
  const [editing, setEditing] = useState<Review | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  const openEdit = (review: Review) => {
    setEditing(review);
    setRating(review.rating);
    setComment(review.comment ?? "");
  };

  const save = async () => {
    if (!editing) return;
    setBusy(true);
    try {
      await api(`/reviews/${editing.id}`, {
        method: "PATCH",
        body: { rating, comment: comment.trim() || undefined },
      });
      toast.success("Review updated");
      setEditing(null);
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (review: Review) => {
    if (!confirm("Delete this review?")) return;
    try {
      await api(`/reviews/${review.id}`, { method: "DELETE" });
      toast.success("Review deleted");
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  };

  return (
    <AccountShell>
      <div className="space-y-5">
        <div>
          <h2 className="text-lg font-semibold">My reviews</h2>
          <p className="text-sm text-muted-foreground">Reviews you&apos;ve written for products</p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[0, 1].map((i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
        ) : data && data.items.length > 0 ? (
          <div className="space-y-4">
            {data.items.map((review) => (
              <Card key={review.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/products/${review.product?.slug}`}
                      className="line-clamp-1 font-medium hover:text-primary"
                    >
                      {review.product?.name}
                    </Link>
                    <div className="mt-1 flex items-center gap-2">
                      <RatingStars rating={review.rating} />
                      <span className="text-xs text-muted-foreground">{formatDate(review.createdAt)}</span>
                    </div>
                    {review.comment && <p className="mt-2 text-sm text-muted-foreground">{review.comment}</p>}
                    <div className="mt-2">
                      {review.isVerifiedPurchase && <Badge variant="secondary">Verified purchase</Badge>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(review)} aria-label="Edit review">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(review)} aria-label="Delete review">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
            <Star className="h-10 w-10 text-muted-foreground/40" />
            <p className="font-medium">No reviews yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Share your experience with products you&apos;ve bought.
            </p>
            <Button asChild variant="outline" size="sm" className="mt-2">
              <Link href="/products">Browse products</Link>
            </Button>
          </div>
        )}
      </div>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit review</DialogTitle>
            <DialogDescription>{editing?.product?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((r) => (
                <button key={r} type="button" onClick={() => setRating(r)} className="text-2xl" aria-label={`${r} stars`}>
                  <span className={r <= rating ? "text-amber-400" : "text-zinc-300"}>★</span>
                </button>
              ))}
            </div>
            <Textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={4} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save changes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AccountShell>
  );
}
