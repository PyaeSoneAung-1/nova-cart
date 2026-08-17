"use client";

import { useState } from "react";
import useSWR from "swr";
import { Boxes, Minus, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api, swrFetcher } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import type { InventoryLog, InventoryRow, Paginated } from "@/lib/types";

export default function AdminInventoryPage() {
  const [search, setSearch] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [adjusting, setAdjusting] = useState<InventoryRow | null>(null);
  const [change, setChange] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const query = new URLSearchParams({ page: String(page), limit: "15" });
  if (search.trim()) query.set("search", search.trim());
  if (lowStockOnly) query.set("lowStock", "true");

  const { data, mutate, isLoading } = useSWR<Paginated<InventoryRow>>(`/admin/inventory?${query}`, swrFetcher);
  const { data: logs } = useSWR<InventoryLog[]>("/admin/inventory/logs?limit=8", swrFetcher);

  const submitAdjust = async () => {
    if (!adjusting) return;
    const delta = Number(change);
    if (!Number.isInteger(delta) || delta === 0) {
      toast.error("Change must be a non-zero integer");
      return;
    }
    if (reason.trim().length < 3) {
      toast.error("Please add a reason (min 3 characters)");
      return;
    }
    setBusy(true);
    try {
      await api(`/admin/inventory/${adjusting.id}`, {
        method: "PATCH",
        body: { change: delta, reason: reason.trim() },
      });
      toast.success(`Stock adjusted by ${delta > 0 ? "+" : ""}${delta}`);
      setAdjusting(null);
      setChange("");
      setReason("");
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Adjust failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminShell>
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Inventory</h2>
        <p className="text-sm text-muted-foreground">
          {data ? `${data.meta.total} products tracked` : "Manage stock levels"}
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search product or SKU…"
            className="pl-9"
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={lowStockOnly}
            onCheckedChange={(v) => {
              setLowStockOnly(v === true);
              setPage(1);
            }}
          />
          Low stock only (≤ 5)
        </label>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      ) : data && data.items.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead className="text-center">Stock</TableHead>
                <TableHead>Variants</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={p.stock === 0 ? "destructive" : p.stock <= 5 ? "outline" : "secondary"}>
                      {p.stock}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {p.variants.length === 0 ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {p.variants.map((v) => (
                          <span key={v.id} className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                            {[v.color, v.size].filter(Boolean).join("/")}: {v.stock}
                          </span>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => setAdjusting(p)}>
                      Adjust stock
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <Boxes className="h-10 w-10 text-muted-foreground/40" />
          <p className="font-medium">No products match</p>
        </div>
      )}

      {data && data.meta.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={!data.meta.hasPrevPage} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {data.meta.page} of {data.meta.totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={!data.meta.hasNextPage} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      )}

      {/* Recent activity */}
      {logs && logs.length > 0 && (
        <div className="mt-8">
          <h3 className="mb-3 text-sm font-semibold">Recent activity</h3>
          <div className="space-y-2">
            {logs.map((log) => (
              <div key={log.id} className="flex items-center justify-between rounded-lg border bg-card px-4 py-2.5 text-sm">
                <div className="flex items-center gap-2">
                  <span
                    className={
                      log.change > 0
                        ? "flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"
                        : "flex h-6 w-6 items-center justify-center rounded-full bg-rose-100 text-rose-600"
                    }
                  >
                    {log.change > 0 ? <Plus className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                  </span>
                  <span className="font-medium">{log.product.name}</span>
                  {log.variant && (
                    <span className="text-xs text-muted-foreground">
                      ({[log.variant.color, log.variant.size].filter(Boolean).join("/")})
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">{log.reason}</span>
                </div>
                <span className="text-xs text-muted-foreground">{formatDateTime(log.createdAt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Adjust dialog */}
      <Dialog open={adjusting !== null} onOpenChange={(open) => !open && setAdjusting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust stock — {adjusting?.name}</DialogTitle>
            <DialogDescription>
              Current stock: <span className="font-semibold">{adjusting?.stock}</span> units.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Change</Label>
              <Input
                type="number"
                value={change}
                onChange={(e) => setChange(e.target.value)}
                placeholder="e.g. 10 to restock, -2 for damage"
              />
              <p className="text-xs text-muted-foreground">
                Use a positive number to add stock, negative to remove. Stock can never go below zero.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Restock from supplier" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjusting(null)}>Cancel</Button>
            <Button onClick={submitAdjust} disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
