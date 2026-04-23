"use client";

import { create } from "zustand";

interface User {
  id: string;
  email: string;
  name: string;
  is_active: boolean;
}

interface Tokens {
  access_token: string;
  refresh_token: string;
}

interface AuthState {
  user: User | null;
  tokens: Tokens | null;
  isAuthenticated: boolean;
  isHydrated: boolean;

  setAuth: (user: User, tokens: Tokens) => void;
  setTokens: (tokens: Tokens) => void;
  logout: () => void;
  hydrate: () => void;
}

const AUTH_STORAGE_KEY = "omni:auth";

function persistAuth(user: User, tokens: Tokens) {
  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ user, tokens }));
  } catch {
    // localStorage 사용 불가 환경
  }
}

function clearAuth() {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    // localStorage 사용 불가 환경
  }
}

function loadAuth(): { user: User; tokens: Tokens } | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  tokens: null,
  isAuthenticated: false,
  isHydrated: false,

  setAuth: (user, tokens) => {
    persistAuth(user, tokens);
    set({ user, tokens, isAuthenticated: true });
  },

  setTokens: (tokens) => {
    set((state) => {
      if (state.user) {
        persistAuth(state.user, tokens);
      }
      return { tokens };
    });
  },

  logout: () => {
    clearAuth();
    set({ user: null, tokens: null, isAuthenticated: false });
  },

  hydrate: () => {
    const stored = loadAuth();
    if (stored) {
      set({
        user: stored.user,
        tokens: stored.tokens,
        isAuthenticated: true,
        isHydrated: true,
      });
    } else {
      set({ isHydrated: true });
    }
  },
}));
