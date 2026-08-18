"use client";

import { Suspense, useEffect } from "react";
import { SWRConfig } from "swr";
import { Toaster } from "sonner";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { swrFetcher } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { useCartStore } from "@/lib/cart-store";
import type { Cart } from "@/lib/types";

export function Providers({ children }: { children: React.ReactNode }) {
  const restoreSession = useAuthStore((s) => s.restoreSession);

  // Restore the session (and with it the cart) once on mount.
  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  // Keep the cart count fresh whenever auth state changes.
  useEffect(() => {
    const syncCart = async () => {
      const user = useAuthStore.getState().user;
      if (!user) return;
      try {
        const cart = await swrFetcher<Cart>("/cart");
        useCartStore.getState().setCart(cart);
      } catch {
        // ignore — cart will be fetched by SWR hooks on demand
      }
    };
    void syncCart();
  }, [useAuthStore((s) => s.user?.id)]);

  return (
    <SWRConfig
      value={{
        fetcher: swrFetcher,
        revalidateOnFocus: false,
        shouldRetryOnError: false,
      }}
    >
      <div className="flex min-h-screen flex-col">
        <Suspense fallback={null}>
          <Navbar />
        </Suspense>
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
      <Toaster richColors position="top-right" />
    </SWRConfig>
  );
}
