"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Menu,
  Package,
  Search,
  ShoppingBag,
  ShoppingCart,
  User,
  Heart,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/lib/auth-store";
import { useCartStore } from "@/lib/cart-store";
import { cn } from "@/lib/utils";

const CATEGORY_LINKS = [
  { label: "Electronics", href: "/products?category=electronics" },
  { label: "Fashion", href: "/products?category=fashion" },
  { label: "Home & Living", href: "/products?category=home-living" },
  { label: "Sports", href: "/products?category=sports-outdoors" },
  { label: "Beauty", href: "/products?category=beauty-care" },
  { label: "Books", href: "/products?category=books-media" },
];

export function Navbar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const cart = useCartStore((s) => s.cart);
  const guestCount = useCartStore((s) => s.guestCount);
  const [search, setSearch] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);

  const itemCount = user ? cart?.itemCount ?? 0 : guestCount;
  const activeCategory = searchParams.get("category");

  // Close the mobile menu when the route changes (render-time adjustment).
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setMobileOpen(false);
  }

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = search.trim();
    router.push(q ? `/products?search=${encodeURIComponent(q)}` : "/products");
  };

  /** Whether a nav link matches the current route (pathname + search params). */
  const isActive = (href: string) => {
    const [path, query] = href.split("?");
    if (query) {
      const cat = new URLSearchParams(query).get("category");
      // Category links only count as active on the listing page with the same filter.
      return pathname === path && cat !== null && activeCategory === cat;
    }
    if (path === "/products") {
      // "Shop" stays highlighted on the listing page and product detail pages.
      return pathname === path || pathname.startsWith("/products/");
    }
    return pathname === path;
  };

  const initials = user?.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-50 border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        {/* Mobile menu toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>

        {/* Logo */}
        <Link
          href="/"
          aria-current={pathname === "/" ? "page" : undefined}
          className="flex items-center gap-2 font-semibold tracking-tight"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ShoppingBag className="h-4 w-4" />
          </span>
          <span className="text-lg">
            Nova<span className="text-primary">Cart</span>
          </span>
        </Link>

        {/* Desktop categories */}
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Categories">
          {CATEGORY_LINKS.map((c) => {
            const active = isActive(c.href);
            return (
              <Link
                key={c.href}
                href={c.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {c.label}
              </Link>
            );
          })}
        </nav>

        {/* Search */}
        <form onSubmit={submitSearch} className="relative ml-auto hidden w-full max-w-xs md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products…"
            className="pl-9"
          />
        </form>

        {/* Actions */}
        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <Link
            href="/products"
            aria-current={isActive("/products") ? "page" : undefined}
            className={cn(
              "rounded-md p-2 transition-colors lg:hidden",
              isActive("/products") ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
            aria-label="Shop"
          >
            <Package className="h-5 w-5" />
          </Link>
          <Link
            href="/wishlist"
            aria-current={isActive("/wishlist") ? "page" : undefined}
            className={cn(
              "rounded-md p-2 transition-colors",
              isActive("/wishlist") ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
            aria-label="Wishlist"
          >
            <Heart className="h-5 w-5" />
          </Link>
          <Link
            href="/cart"
            aria-current={isActive("/cart") ? "page" : undefined}
            className={cn(
              "relative rounded-md p-2 transition-colors",
              isActive("/cart") ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
            aria-label="Cart"
          >
            <ShoppingCart className="h-5 w-5" />
            {itemCount > 0 && (
              <Badge className="absolute -right-0.5 -top-0.5 h-5 min-w-5 justify-center rounded-full px-1 text-[10px]">
                {itemCount}
              </Badge>
            )}
          </Link>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full" aria-label="Account menu">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatar ?? undefined} alt={user.name} />
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span className="font-medium">{user.name}</span>
                    <span className="text-xs text-muted-foreground">{user.email}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link
                    href="/account"
                    aria-current={pathname.startsWith("/account") ? "page" : undefined}
                    className={cn(pathname.startsWith("/account") && "bg-primary/10 font-medium text-primary")}
                  >
                    My Account
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link
                    href="/account/orders"
                    aria-current={pathname.startsWith("/account/orders") ? "page" : undefined}
                    className={cn(pathname.startsWith("/account/orders") && "bg-primary/10 font-medium text-primary")}
                  >
                    My Orders
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link
                    href="/account/addresses"
                    aria-current={pathname.startsWith("/account/addresses") ? "page" : undefined}
                    className={cn(pathname.startsWith("/account/addresses") && "bg-primary/10 font-medium text-primary")}
                  >
                    Addresses
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link
                    href="/wishlist"
                    aria-current={pathname === "/wishlist" ? "page" : undefined}
                    className={cn(pathname === "/wishlist" && "bg-primary/10 font-medium text-primary")}
                  >
                    Wishlist
                  </Link>
                </DropdownMenuItem>
                {user.role === "ADMIN" && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link
                        href="/admin"
                        aria-current={pathname.startsWith("/admin") ? "page" : undefined}
                        className={cn("font-medium", pathname.startsWith("/admin") && "bg-primary/10 text-primary")}
                      >
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        Admin Dashboard
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    logout();
                    router.push("/");
                  }}
                >
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Button asChild variant="ghost" size="sm">
                <Link
                  href="/login"
                  aria-current={pathname === "/login" ? "page" : undefined}
                  className={cn(pathname === "/login" && "bg-muted text-foreground")}
                >
                  <User className="mr-1.5 h-4 w-4" />
                  Sign in
                </Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/register">Create account</Link>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t bg-background px-4 py-4 lg:hidden">
          <form onSubmit={submitSearch} className="relative mb-4 md:hidden">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products…"
              className="pl-9"
            />
          </form>
          <nav className="grid gap-1" aria-label="Categories">
            {CATEGORY_LINKS.map((c) => {
              const active = isActive(c.href);
              return (
                <Link
                  key={c.href}
                  href={c.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {c.label}
                </Link>
              );
            })}
            {!user && (
              <div className="mt-3 flex gap-2">
                <Button asChild variant="outline" className="flex-1">
                  <Link href="/login">Sign in</Link>
                </Button>
                <Button asChild className="flex-1">
                  <Link href="/register">Create account</Link>
                </Button>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
