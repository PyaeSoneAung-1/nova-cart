"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { KeyRound, Mail, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";

const emailSchema = z.object({ email: z.string().email("Enter a valid email address") });
const resetSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[a-zA-Z]/, "Must contain at least one letter")
      .regex(/[0-9]/, "Must contain at least one number"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export function ForgotPasswordForm() {
  const [sent, setSent] = useState(false);
  const [devToken, setDevToken] = useState<string | undefined>();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof emailSchema>>({ resolver: zodResolver(emailSchema) });

  const onSubmit = async (values: z.infer<typeof emailSchema>) => {
    try {
      const data = await api<{ devResetToken?: string }>("/auth/forgot-password", {
        method: "POST",
        body: values,
      });
      setDevToken(data.devResetToken);
      setSent(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  return (
    <div className="space-y-4">
      {sent ? (
        <div className="space-y-4 rounded-xl border bg-muted/40 p-5 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
          <p className="text-sm">
            If that email exists, a password reset link has been sent.
          </p>
          {devToken && (
            <div className="space-y-2 rounded-lg bg-background p-4 text-left text-xs">
              <p className="font-semibold text-primary">🔧 Demo mode (mock email)</p>
              <p className="break-all text-muted-foreground">
                Reset token: <code className="text-foreground">{devToken}</code>
              </p>
              <p className="text-muted-foreground">
                Copy it and use it on the reset page. It expires in 1 hour.
              </p>
            </div>
          )}
          <Button asChild variant="outline" size="sm">
            <Link href="/reset-password">Go to reset page</Link>
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="you@example.com" autoComplete="email" {...register("email")} />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>
          <Button type="submit" className="w-full" size="lg">
            <Mail className="mr-2 h-4 w-4" />
            Send reset link
          </Button>
        </form>
      )}
      <p className="text-center text-sm text-muted-foreground">
        Remembered it?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [busy, setBusy] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof resetSchema>>({ resolver: zodResolver(resetSchema) });

  const onSubmit = async (values: z.infer<typeof resetSchema>) => {
    if (!token) {
      toast.error("Missing reset token. Use the one from your (demo) email.");
      return;
    }
    setBusy(true);
    try {
      await api("/auth/reset-password", {
        method: "POST",
        body: { token, password: values.password },
      });
      toast.success("Password reset! You can now sign in.");
      router.push("/login");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="rp-token">Reset token</Label>
        <Input id="rp-token" defaultValue={token} placeholder="Paste the token from your email" readOnly={Boolean(token)} />
        {!token && (
          <p className="text-xs text-muted-foreground">
            In demo mode, get a token from the forgot-password page.
          </p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="rp-pass">New password</Label>
        <Input id="rp-pass" type="password" placeholder="At least 8 characters" autoComplete="new-password" {...register("password")} />
        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="rp-confirm">Confirm new password</Label>
        <Input id="rp-confirm" type="password" placeholder="Repeat new password" autoComplete="new-password" {...register("confirmPassword")} />
        {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
      </div>
      <Button type="submit" className="w-full" size="lg" disabled={busy}>
        <KeyRound className="mr-2 h-4 w-4" />
        {busy ? "Resetting…" : "Reset password"}
      </Button>
    </form>
  );
}
