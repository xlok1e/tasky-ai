"use client";

import { create } from "zustand";
import { getCookie, setCookie, deleteCookie } from "cookies-next";
import type { AuthUser } from "@shared/types/auth.types";

const TOKEN_COOKIE = "access_token";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const base64 = token.split(".")[1];
    const decoded = atob(base64.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function parseUser(token: string): AuthUser | null {
  const payload = decodeJwtPayload(token);
  if (!payload) return null;

  const userId = payload["userId"] ?? payload["sub"];
  const telegramId = payload["telegramId"];
  const username = payload["username"];

  if (!userId || !telegramId || !username) return null;

  return {
    userId: String(userId),
    telegramId: String(telegramId),
    username: String(username),
  };
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  setToken: (token: string) => void;
  clearToken: () => void;
  initFromCookie: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isAuthenticated: false,

  setToken: (token: string) => {
    setCookie(TOKEN_COOKIE, token, { maxAge: COOKIE_MAX_AGE, path: "/" });
    const user = parseUser(token);
    set({ token, user, isAuthenticated: true });
  },

  clearToken: () => {
    deleteCookie(TOKEN_COOKIE, { path: "/" });
    set({ token: null, user: null, isAuthenticated: false });
  },

  initFromCookie: () => {
    const token = getCookie(TOKEN_COOKIE) as string | undefined;
    if (!token) return;
    const user = parseUser(token);
    if (user) {
      set({ token, user, isAuthenticated: true });
    }
  },
}));
