"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/lib/types";
import { api } from "@/lib/api";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  /** True while the session is being restored from a refresh token. */
  restoring: boolean;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setUser: (user: User) => void;
  logout: () => void;
  restoreSession: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      /** True until the persisted session has been restored (or rejected). */
      restoring: true,

      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),

      setUser: (user) => set({ user }),

      logout: () => {
        const refreshToken = get().refreshToken;
        // Best-effort server-side revocation (don't block the UI on it).
        if (refreshToken) {
          api("/auth/logout", {
            method: "POST",
            body: { refreshToken },
            skipRetry: true,
          }).catch(() => undefined);
        }
        set({ user: null, accessToken: null, refreshToken: null, restoring: false });
      },

      /** On page load, try to restore the session using the stored refresh token. */
      restoreSession: async () => {
        if (get().user) {
          set({ restoring: false });
          return true;
        }
        const refreshToken = get().refreshToken;
        if (!refreshToken) {
          set({ restoring: false });
          return false;
        }

        try {
          const data = await api<{ accessToken: string; refreshToken: string }>("/auth/refresh", {
            method: "POST",
            body: { refreshToken },
          });
          get().setTokens(data.accessToken, data.refreshToken);
          const user = await api<User>("/auth/me");
          get().setUser(user);
          return true;
        } catch {
          get().logout();
          return false;
        } finally {
          set({ restoring: false });
        }
      },
    }),
    {
      name: "novacart-auth",
      partialize: (state) => ({ refreshToken: state.refreshToken }),
    },
  ),
);
