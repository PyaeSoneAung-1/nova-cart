"use client";

import { AccountShell } from "@/components/account/AccountShell";
import { useAuthStore } from "@/lib/auth-store";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AccountPage() {
  const user = useAuthStore((s) => s.user);

  return (
    <AccountShell>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Name</p>
                <p className="font-medium">{user?.name}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Email</p>
                <p className="font-medium">{user?.email}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Role</p>
                <Badge variant={user?.role === "ADMIN" ? "default" : "secondary"} className="mt-0.5">
                  {user?.role}
                </Badge>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Member since</p>
                <p className="font-medium">{formatDate(user?.createdAt)}</p>
              </div>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl bg-muted/60 p-4 text-center">
                <p className="text-2xl font-bold">{user?._count?.orders ?? "—"}</p>
                <p className="text-xs text-muted-foreground">Orders</p>
              </div>
              <div className="rounded-xl bg-muted/60 p-4 text-center">
                <p className="text-2xl font-bold">{user?._count?.addresses ?? "—"}</p>
                <p className="text-xs text-muted-foreground">Addresses</p>
              </div>
              <div className="rounded-xl bg-muted/60 p-4 text-center">
                <p className="text-2xl font-bold">{user?._count?.reviews ?? "—"}</p>
                <p className="text-xs text-muted-foreground">Reviews</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AccountShell>
  );
}
