import Link from "next/link";
import { ShoppingBag, Code2, Mail, MapPin } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t bg-zinc-950 text-zinc-300">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4">
        <div className="space-y-3">
          <Link href="/" className="flex items-center gap-2 font-semibold text-white">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ShoppingBag className="h-4 w-4" />
            </span>
            Nova<span className="text-primary">Cart</span>
          </Link>
          <p className="text-sm leading-relaxed text-zinc-400">
            A full-stack e-commerce platform — Next.js storefront, Express REST
            API, PostgreSQL with Prisma.
          </p>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-semibold text-white">Shop</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/products" className="hover:text-white">All products</Link></li>
            <li><Link href="/products?sort=newest" className="hover:text-white">New arrivals</Link></li>
            <li><Link href="/products?sort=popular" className="hover:text-white">Popular</Link></li>
            <li><Link href="/products?inStock=true" className="hover:text-white">In stock</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-semibold text-white">Account</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/account" className="hover:text-white">My account</Link></li>
            <li><Link href="/account/orders" className="hover:text-white">Order history</Link></li>
            <li><Link href="/wishlist" className="hover:text-white">Wishlist</Link></li>
            <li><Link href="/cart" className="hover:text-white">Cart</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-semibold text-white">Project</h4>
          <ul className="space-y-2 text-sm text-zinc-400">
            <li className="flex items-center gap-2">
              <Code2 className="h-4 w-4" /> github.com/novacart
            </li>
            <li className="flex items-center gap-2">
              <Mail className="h-4 w-4" /> hello@novacart.dev
            </li>
            <li className="flex items-center gap-2">
              <MapPin className="h-4 w-4" /> Yangon, Myanmar
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-5 text-center text-xs text-zinc-500">
        © {new Date().getFullYear()} NovaCart — Full-Stack E-Commerce Platform.
      </div>
    </footer>
  );
}
