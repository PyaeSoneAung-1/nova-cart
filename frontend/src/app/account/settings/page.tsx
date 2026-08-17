"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import useSWR from "swr";
import { toast } from "sonner";
import { AccountShell } from "@/components/account/AccountShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, swrFetcher } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import type { User } from "@/lib/types";

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Enter a valid email"),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[a-zA-Z]/, "Must contain at least one letter")
      .regex(/[0-9]/, "Must contain at least one number"),
  })
  .refine((d) => d.currentPassword !== d.newPassword, {
    message: "New password must be different",
    path: ["newPassword"],
  });

export default function SettingsPage() {
  const setUser = useAuthStore((s) => s.setUser);
  const { data: user } = useSWR<User>("/auth/me", swrFetcher);

  const profile = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    values: { name: user?.name ?? "", email: user?.email ?? "" },
  });

  const password = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
  });

  const onProfile = async (values: z.infer<typeof profileSchema>) => {
    try {
      const updated = await api<User>("/users/me", { method: "PATCH", body: values });
      setUser(updated);
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  };

  const onPassword = async (values: z.infer<typeof passwordSchema>) => {
    try {
      await api("/users/me/change-password", { method: "POST", body: values });
      toast.success("Password changed — please sign in again");
      password.reset();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Change failed");
    }
  };

  return (
    <AccountShell>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Account settings</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={profile.handleSubmit(onProfile)} className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="p-name">Full name</Label>
                <Input id="p-name" {...profile.register("name")} />
                {profile.formState.errors.name && (
                  <p className="text-xs text-destructive">{profile.formState.errors.name.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-email">Email</Label>
                <Input id="p-email" type="email" {...profile.register("email")} />
                {profile.formState.errors.email && (
                  <p className="text-xs text-destructive">{profile.formState.errors.email.message}</p>
                )}
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" size="sm" disabled={profile.formState.isSubmitting}>
                  Save changes
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Change password</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={password.handleSubmit(onPassword)} className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="pw-current">Current password</Label>
                <Input id="pw-current" type="password" {...password.register("currentPassword")} />
                {password.formState.errors.currentPassword && (
                  <p className="text-xs text-destructive">{password.formState.errors.currentPassword.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pw-new">New password</Label>
                <Input id="pw-new" type="password" {...password.register("newPassword")} />
                {password.formState.errors.newPassword && (
                  <p className="text-xs text-destructive">{password.formState.errors.newPassword.message}</p>
                )}
              </div>
              <div className="flex items-end">
                <Button type="submit" size="sm" variant="outline" disabled={password.formState.isSubmitting}>
                  Update password
                </Button>
              </div>
            </form>
            <p className="mt-3 text-xs text-muted-foreground">
              Changing your password signs you out of all other sessions.
            </p>
          </CardContent>
        </Card>
      </div>
    </AccountShell>
  );
}
