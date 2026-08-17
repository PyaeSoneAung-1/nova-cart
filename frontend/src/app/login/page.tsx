import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to continue shopping"
      footer={
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Demo: customer@novacart.dev / Customer@1234
        </p>
      }
    >
      <LoginForm />
    </AuthShell>
  );
}
