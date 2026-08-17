"use client";

import { useState } from "react";
import useSWR from "swr";
import { Pencil, Plus, Tags, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import type { Brand } from "@/lib/types";

interface Draft {
  name: string;
  description: string;
  isActive: boolean;
}

const EMPTY: Draft = { name: "", description: "", isActive: true };

export default function AdminBrandsPage() {
  const { data, mutate, isLoading } = useSWR<Brand[]>("/brands/admin/list", swrFetcher);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Brand | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!draft || draft.name.trim().length < 2) {
      toast.error("Name must be at least 2 characters");
      return;
    }
    setBusy(true);
    try {
      const body = { ...draft, name: draft.name.trim(), description: draft.description.trim() || undefined };
      if (editingId) {
        await api(`/brands/${editingId}`, { method: "PATCH", body });
        toast.success("Brand updated");
      } else {
        await api("/brands", { method: "POST", body });
        toast.success("Brand created");
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
      await api(`/brands/${deleting.id}`, { method: "DELETE" });
      toast.success("Brand deleted");
      setDeleting(null);
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  };

  return (
    <AdminShell>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Brands</h2>
          <p className="text-sm text-muted-foreground">{data?.length ?? 0} brands</p>
        </div>
        <Button
          onClick={() => {
            setDraft(EMPTY);
            setEditingId(null);
          }}
        >
          <Plus className="mr-1.5 h-4 w-4" /> New brand
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : data && data.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((b) => (
            <Card key={b.id} className="p-5">
              <div className="mb-2 flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Tags className="h-5 w-5" />
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      setDraft({ name: b.name, description: b.description ?? "", isActive: b.isActive });
                      setEditingId(b.id);
                    }}
                    aria-label="Edit brand"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleting(b)} aria-label="Delete brand">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{b.name}</h3>
                {!b.isActive && <Badge variant="outline">Inactive</Badge>}
              </div>
              {b.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{b.description}</p>}
              <p className="mt-2 text-xs text-muted-foreground">{b._count?.products ?? 0} products</p>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <Tags className="h-10 w-10 text-muted-foreground/40" />
          <p className="font-medium">No brands yet</p>
        </div>
      )}

      <Dialog open={draft !== null} onOpenChange={(open) => !open && setDraft(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit brand" : "New brand"}</DialogTitle>
            <DialogDescription>Brands are shown on product cards and filters.</DialogDescription>
          </DialogHeader>
          {draft && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="NovaTech" />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} rows={3} />
              </div>
              <label className="flex items-center gap-2 text-sm">
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
            <AlertDialogTitle>Delete this brand?</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{deleting?.name}&quot; will be removed. Brands with products cannot be deleted.
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
