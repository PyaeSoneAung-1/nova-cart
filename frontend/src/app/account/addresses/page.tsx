"use client";

import { useState } from "react";
import useSWR from "swr";
import { Plus, MapPin, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AccountShell } from "@/components/account/AccountShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
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
import type { Address } from "@/lib/types";

interface AddressForm {
  label: string;
  recipientName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode?: string;
  country: string;
  isDefault: boolean;
}

const EMPTY: AddressForm = {
  label: "Home",
  recipientName: "",
  phone: "",
  line1: "",
  city: "",
  country: "Myanmar",
  isDefault: false,
};

export default function AddressesPage() {
  const { data: addresses, mutate, isLoading } = useSWR<Address[]>("/users/addresses", swrFetcher);
  const [editing, setEditing] = useState<AddressForm | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const openCreate = () => {
    setEditing(EMPTY);
    setEditingId(null);
  };

  const openEdit = (a: Address) => {
    setEditing({
      label: a.label,
      recipientName: a.recipientName,
      phone: a.phone,
      line1: a.line1,
      line2: a.line2 ?? undefined,
      city: a.city,
      state: a.state ?? undefined,
      postalCode: a.postalCode ?? undefined,
      country: a.country,
      isDefault: a.isDefault,
    });
    setEditingId(a.id);
  };

  const save = async () => {
    if (!editing) return;
    if (!editing.recipientName.trim() || !editing.phone.trim() || !editing.line1.trim() || !editing.city.trim()) {
      toast.error("Please fill in recipient, phone, address line and city");
      return;
    }
    setBusy(true);
    try {
      if (editingId) {
        await api(`/users/addresses/${editingId}`, { method: "PATCH", body: editing });
        toast.success("Address updated");
      } else {
        await api("/users/addresses", { method: "POST", body: editing });
        toast.success("Address added");
      }
      setEditing(null);
      setEditingId(null);
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save address");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!deletingId) return;
    try {
      await api(`/users/addresses/${deletingId}`, { method: "DELETE" });
      toast.success("Address deleted");
      setDeletingId(null);
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete address");
    }
  };

  return (
    <AccountShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Shipping addresses</h2>
            <p className="text-sm text-muted-foreground">Manage where your orders are delivered</p>
          </div>
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-1.5 h-4 w-4" /> Add address
          </Button>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {[0, 1].map((i) => (
              <Skeleton key={i} className="h-44 rounded-xl" />
            ))}
          </div>
        ) : addresses && addresses.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {addresses.map((a) => (
              <Card key={a.id} className="relative">
                <CardContent className="p-5">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      <span className="font-semibold">{a.label}</span>
                      {a.isDefault && <Badge variant="secondary">Default</Badge>}
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(a)} aria-label="Edit address">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeletingId(a.id)} aria-label="Delete address">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm font-medium">{a.recipientName}</p>
                  <p className="text-sm text-muted-foreground">
                    {a.line1}
                    {a.line2 ? `, ${a.line2}` : ""}, {a.city}
                    {a.state ? `, ${a.state}` : ""} {a.postalCode ?? ""}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {a.country} · {a.phone}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
            <MapPin className="h-10 w-10 text-muted-foreground/40" />
            <p className="font-medium">No addresses yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Add an address so you can check out faster.
            </p>
          </div>
        )}
      </div>

      {/* Edit dialog */}
      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit address" : "Add address"}</DialogTitle>
            <DialogDescription>Delivery details for your orders.</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Label</Label>
                <Input value={editing.label} onChange={(e) => setEditing({ ...editing, label: e.target.value })} placeholder="Home / Office" />
              </div>
              <div className="space-y-1.5">
                <Label>Recipient name</Label>
                <Input value={editing.recipientName} onChange={(e) => setEditing({ ...editing, recipientName: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={editing.phone} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} placeholder="+95 9 123 456 789" />
              </div>
              <div className="space-y-1.5">
                <Label>Country</Label>
                <Input value={editing.country} onChange={(e) => setEditing({ ...editing, country: e.target.value })} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Address line 1</Label>
                <Input value={editing.line1} onChange={(e) => setEditing({ ...editing, line1: e.target.value })} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Address line 2 (optional)</Label>
                <Input value={editing.line2 ?? ""} onChange={(e) => setEditing({ ...editing, line2: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>City</Label>
                <Input value={editing.city} onChange={(e) => setEditing({ ...editing, city: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>State</Label>
                  <Input value={editing.state ?? ""} onChange={(e) => setEditing({ ...editing, state: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Postal code</Label>
                  <Input value={editing.postalCode ?? ""} onChange={(e) => setEditing({ ...editing, postalCode: e.target.value })} />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <Checkbox checked={editing.isDefault} onCheckedChange={(v) => setEditing({ ...editing, isDefault: v === true })} />
                Set as default address
              </label>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save address"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={deletingId !== null} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this address?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Your address will be removed from your account.
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
    </AccountShell>
  );
}
