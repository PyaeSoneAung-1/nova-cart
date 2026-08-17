"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, MapPin, Package, Settings, Star, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { RequireAuth } from "@/components/auth/RequireAuth";

const LINKS = [
  { href: "/account", label: "Profile", icon: User },
  { href: "/account/orders", label: "Orders", icon: Package },
  { href: "/account/addresses", label: "Addresses", icon: MapPin },
  { href: "/account/reviews", label: "Reviews", icon: Star },
  { href: "/account/settings", label: "Settings", icon: Settings },
  { href: "/wishlist", label: "Wishlist", icon: Heart },
];

export function AccountShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <RequireAuth>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <h1 className="mb-6 text-2xl font-bold tracking-tight sm:text-3xl">My account</h1>
        <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
          <aside>
            <nav className="flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:pb-0">
              {LINKS.map((link) => {
                const active =
                  link.href === "/account" ? pathname === "/account" : pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <link.icon className="h-4 w-4" />
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </aside>
          <div className="min-w-0">{children}</div>
        </div>
      </div>
    </RequireAuth>
  );
}
