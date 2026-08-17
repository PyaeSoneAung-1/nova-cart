"use client";

import { useState } from "react";
import useSWR from "swr";
import { Search, Users } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api, swrFetcher } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { Checkbox } from "@/components/ui/checkbox";
import type { Paginated, Role, User } from "@/lib/types";

interface AdminUserRow extends User {
  _count: { orders: number; reviews: number };
}

export default function AdminCustomersPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const query = new URLSearchParams({ page: String(page), limit: "15" });
  if (search.trim()) query.set("search", search.trim());

  const { data, isLoading, mutate } = useSWR<Paginated<AdminUserRow>>(`/users?${query}`, swrFetcher);

  const updateUser = async (id: string, patch: { role?: Role; isActive?: boolean }) => {
    try {
      await api(`/users/${id}`, { method: "PATCH", body: patch });
      toast.success("User updated");
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  };

  return (
    <AdminShell>
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Customers</h2>
        <p className="text-sm text-muted-foreground">{data ? `${data.meta.total} users` : "Manage accounts and roles"}</p>
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search by name or email…"
          className="pl-9"
        />
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
                <TableHead>User</TableHead>
                <TableHead className="text-center">Orders</TableHead>
                <TableHead className="text-center">Reviews</TableHead>
                <TableHead className="text-center">Joined</TableHead>
                <TableHead className="text-center">Role</TableHead>
                <TableHead className="text-center">Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <p className="font-medium">{u.name}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </TableCell>
                  <TableCell className="text-center">{u._count?.orders ?? 0}</TableCell>
                  <TableCell className="text-center">{u._count?.reviews ?? 0}</TableCell>
                  <TableCell className="text-center text-sm text-muted-foreground">{formatDate(u.createdAt)}</TableCell>
                  <TableCell className="text-center">
                    <Select
                      value={u.role}
                      onValueChange={(v) => updateUser(u.id, { role: v as Role })}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <Checkbox
                      checked={u.isActive}
                      onCheckedChange={(v) => updateUser(u.id, { isActive: v === true })}
                      aria-label={`Toggle active for ${u.name}`}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <Users className="h-10 w-10 text-muted-foreground/40" />
          <p className="font-medium">No users found</p>
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
    </AdminShell>
  );
}

function Select({ value, onValueChange }: { value: Role; onValueChange: (v: string) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      className="h-8 rounded-md border bg-background px-2 text-xs"
    >
      <option value="CUSTOMER">Customer</option>
      <option value="ADMIN">Admin</option>
    </select>
  );
}
