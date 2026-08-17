"use client";

import { useState } from "react";
import useSWR from "swr";
import { Pencil, Plus, Ticket, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { api, swrFetcher } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { Coupon, CouponType, Paginated } from "@/lib/types";

interface Draft {
  code: string;
  type: CouponType;
  value: string;
  minOrderAmount: string;
  maxDiscount: string;
  usageLimit: string;
  expiresAt: string;
  isActive: boolean;
}

const EMPTY: Draft = {
  code: "",
  type: "PERCENTAGE",
  value: "",
  minOrderAmount: "0",
  maxDiscount: "",
  usageLimit: "",
  expiresAt: "",
  isActive: true,
};

export default function AdminCouponsPage() {
  const { data, mutate, isLoading } = useSWR<Paginated<Coupon>>("/coupons?limit=50", swrFetcher);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Coupon | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!draft || !draft.code.trim() || !draft.value) {
      toast.error("Code and value are required");
      return;
    }
    setBusy(true);
    try {
      const body = {
        code: draft.code.trim(),
        type: draft.type,
        value: Number(draft.value),
        minOrderAmount: Number(draft.minOrderAmount) || 0,
        maxDiscount: draft.maxDiscount ? Number(draft.maxDiscount) : undefined,
        usageLimit: draft.usageLimit ? Number(draft.usageLimit) : undefined,
        expiresAt: draft.expiresAt ? new Date(draft.expiresAt).toISOString() : undefined,
        isActive: draft.isActive,
      };
      if (editingId) {
        await api(`/coupons/${editingId}`, { method: "PATCH", body });
        toast.success("Coupon updated");
      } else {
        await api("/coupons", { method: "POST", body });
        toast.success("Coupon created");
      }
      setDraft(null);
      setEditingId(null);
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!deleting) return;
    try {
      await api(`/coupons/${deleting.id}`, { method: "DELETE" });
      toast.success("Coupon deleted");
      setDeleting(null);
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const coupons = data?.items ?? [];
  const now = Date.now();

  return (
    <AdminShell>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Coupons</h2>
          <p className="text-sm text-muted-foreground">{data?.meta.total ?? 0} coupons</p>
        </div>
        <Button
          onClick={() => {
            setDraft(EMPTY);
            setEditingId(null);
          }}
        >
          <Plus className="mr-1.5 h-4 w-4" /> New coupon
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : coupons.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {coupons.map((c) => {
            const expired = c.expiresAt && new Date(c.expiresAt).getTime() < now;
            const exhausted = c.usageLimit !== null && c.usedCount >= c.usageLimit;
            const invalid = !c.isActive || Boolean(expired) || Boolean(exhausted);
            return (
              <Card key={c.id} className="p-5">
                <div className="mb-2 flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Ticket className="h-4 w-4 text-primary" />
                      <span className="font-mono text-sm font-bold">{c.code}</span>
                    </div>
                    <p className="mt-1 text-sm">
                      {c.type === "PERCENTAGE" ? `${c.value}% off` : `$${c.value} off`}
                      {c.maxDiscount ? ` (max $${c.maxDiscount})` : ""}
                    </p>
                  </div>
                  <Badge variant={invalid ? "destructive" : "default"}>
                    {!c.isActive ? "Inactive" : expired ? "Expired" : exhausted ? "Used up" : "Active"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Min order ${c.minOrderAmount} · {c.usedCount}/{c.usageLimit ?? "∞"} used
                </p>
                <p className="text-xs text-muted-foreground">
                  {c.expiresAt ? `Expires ${formatDate(c.expiresAt)}` : "No expiry"}
                </p>
                <div className="mt-3 flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      setDraft({
                        code: c.code,
                        type: c.type,
                        value: String(c.value),
                        minOrderAmount: String(c.minOrderAmount),
                        maxDiscount: c.maxDiscount !== null ? String(c.maxDiscount) : "",
                        usageLimit: c.usageLimit !== null ? String(c.usageLimit) : "",
                        expiresAt: c.expiresAt ? c.expiresAt.slice(0, 10) : "",
                        isActive: c.isActive,
                      });
                      setEditingId(c.id);
                    }}
                    aria-label="Edit coupon"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleting(c)} aria-label="Delete coupon">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <Ticket className="h-10 w-10 text-muted-foreground/40" />
          <p className="font-medium">No coupons yet</p>
        </div>
      )}

      <Dialog open={draft !== null} onOpenChange={(open) => !open && setDraft(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit coupon" : "New coupon"}</DialogTitle>
            <DialogDescription>Coupons can be applied at checkout by customers.</DialogDescription>
          </DialogHeader>
          {draft && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Code</Label>
                <Input value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })} placeholder="SAVE20" className="uppercase" />
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={draft.type} onValueChange={(v) => setDraft({ ...draft, type: v as CouponType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                    <SelectItem value="FIXED">Fixed amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Value</Label>
                <Input type="number" min="0" step="0.01" value={draft.value} onChange={(e) => setDraft({ ...draft, value: e.target.value })} placeholder={draft.type === "PERCENTAGE" ? "e.g. 15" : "e.g. 10"} />
              </div>
              <div className="space-y-1.5">
                <Label>Min order amount</Label>
                <Input type="number" min="0" value={draft.minOrderAmount} onChange={(e) => setDraft({ ...draft, minOrderAmount: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Max discount (optional)</Label>
                <Input type="number" min="0" value={draft.maxDiscount} onChange={(e) => setDraft({ ...draft, maxDiscount: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Usage limit (optional)</Label>
                <Input type="number" min="1" value={draft.usageLimit} onChange={(e) => setDraft({ ...draft, usageLimit: e.target.value })} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Expires at (optional)</Label>
                <Input type="date" value={draft.expiresAt} onChange={(e) => setDraft({ ...draft, expiresAt: e.target.value })} />
              </div>
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <Checkbox checked={draft.isActive} onCheckedChange={(v) => setDraft({ ...draft, isActive: v === true })} />
                Active
              </label>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDraft(null)}>Cancel</Button>
            <Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this coupon?</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{deleting?.code}&quot; will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={remove} className="bg-destructive text-white hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminShell>
  );
}
