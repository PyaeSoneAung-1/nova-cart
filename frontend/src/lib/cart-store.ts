"use client";

import { create } from "zustand";
import type { Cart, CartItem } from "@/lib/types";

interface CartState {
  /** The server cart, kept in sync after every mutation. */
  cart: Cart | null;
  /** Client-side count used by the navbar while the user is logged out. */
  guestCount: number;
  setCart: (cart: Cart) => void;
  setGuestCount: (n: number) => void;
  addItem: (item: CartItem) => void;
  clear: () => void;
}

/**
 * UI state for the cart. The server is the source of truth for prices and
 * totals — this store only mirrors it so the navbar/UI stay instant.
 */
export const useCartStore = create<CartState>()((set) => ({
  cart: null,
  guestCount: 0,
  setCart: (cart) => set({ cart, guestCount: cart.itemCount }),
  setGuestCount: (n) => set({ guestCount: n }),
  addItem: (item) =>
    set((state) => {
      const cart = state.cart;
      if (!cart) return state;
      const items = [...cart.items];
      const idx = items.findIndex(
        (i) => i.product.id === item.product.id && i.variant?.id === item.variant?.id,
      );
      if (idx >= 0) {
        items[idx] = { ...items[idx], quantity: item.quantity };
      } else {
        items.push(item);
      }
      const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
      return { cart: { ...cart, items, itemCount } };
    }),
  clear: () => set({ cart: null, guestCount: 0 }),
}));
