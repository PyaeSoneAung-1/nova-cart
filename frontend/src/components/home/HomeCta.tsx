"use client";

import Link from "next/link";
import { ArrowRight, PackageCheck, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/auth-store";

/** Bottom call-to-action — adapts to whether the visitor is signed in. */
export function HomeCta() {
  const user = useAuthStore((s) => s.user);

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <div className="flex flex-col items-center gap-4 rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-background px-6 py-14 text-center">
        {user ? (
          <>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Welcome back, {user.name.split(" ")[0]} 👋
            </h2>
            <p className="max-w-md text-muted-foreground">
              Continue shopping, check your orders or add a new shipping address.
            </p>
            <div className="mt-2 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" className="rounded-full px-8">
                <Link href="/products">
                  Continue shopping <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full px-8">
                <Link href="/account/orders">
                  <PackageCheck className="mr-2 h-4 w-4" />
                  My orders
                </Link>
              </Button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Ready to shop?</h2>
            <p className="max-w-md text-muted-foreground">
              Create an account to save items, track orders and enjoy member-only coupons.
            </p>
            <div className="mt-2 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" className="rounded-full px-8">
                <Link href="/register">
                  <ShoppingBag className="mr-2 h-4 w-4" />
                  Create account
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full px-8">
                <Link href="/products">Browse products</Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
