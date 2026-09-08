import { create } from "zustand";
import type { AuthUser } from "@/types/auth.types";

const getDisplayName = (user?: AuthUser | null): string => {
  if (!user) return "User";

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  if (fullName) return fullName;

  if (user.userName) return user.userName;
  if (user.username) return user.username;
  if (user.email) return user.email.split("@")[0];

  return "User";
};

const syncStoredProfile = (user?: AuthUser | null) => {
  if (typeof window === "undefined") return;

  if (user?.avatarUrl) {
    localStorage.setItem("devspace_avatar", user.avatarUrl);
  } else {
    localStorage.removeItem("devspace_avatar");
  }

  localStorage.setItem("devspace_user_name", getDisplayName(user));
};

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setAuth: (
    token: string,
    refreshTokenOrUser?: string | AuthUser | null,
    maybeUser?: AuthUser,
  ) => void;
  setTokens: (token: string, refreshToken?: string | null) => void;
  logout: () => void;
}

const getInitialUser = (): AuthUser | null => {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem("devspace_user");
  if (!stored) return null;
  try {
    return JSON.parse(stored) as AuthUser;
  } catch {
    return null;
  }
};

export const useAuthStore = create<AuthState>((set) => ({
  user: getInitialUser(),
  token: typeof window !== "undefined" ? localStorage.getItem("devspace_token") : null,
  refreshToken:
    typeof window !== "undefined" ? localStorage.getItem("devspace_refresh_token") : null,
  isAuthenticated:
    typeof window !== "undefined" ? Boolean(localStorage.getItem("devspace_token")) : false,

  setAuth: (token, refreshTokenOrUser, maybeUser) => {
    localStorage.setItem("devspace_token", token);

    let refreshToken: string | null = null;
    let user: AuthUser | null = null;

    if (typeof refreshTokenOrUser === "string") {
      refreshToken = refreshTokenOrUser;
      user = maybeUser ?? null;
    } else if (refreshTokenOrUser && typeof refreshTokenOrUser === "object") {
      user = refreshTokenOrUser;
    }

    if (refreshToken) {
      localStorage.setItem("devspace_refresh_token", refreshToken);
    }

    if (user) {
      localStorage.setItem("devspace_user", JSON.stringify(user));
    } else {
      localStorage.removeItem("devspace_user");
    }

    syncStoredProfile(user);
    set({
      token,
      refreshToken: refreshToken ?? (typeof window !== "undefined" ? localStorage.getItem("devspace_refresh_token") : null),
      user,
      isAuthenticated: true,
    });
  },

  setTokens: (token, refreshToken) => {
    localStorage.setItem("devspace_token", token);
    if (refreshToken) {
      localStorage.setItem("devspace_refresh_token", refreshToken);
    }
    set((state) => ({
      token,
      refreshToken: refreshToken ?? state.refreshToken,
      isAuthenticated: true,
    }));
  },

  logout: () => {
    localStorage.removeItem("devspace_token");
    localStorage.removeItem("devspace_refresh_token");
    localStorage.removeItem("devspace_avatar");
    localStorage.removeItem("devspace_user");
    localStorage.removeItem("devspace_user_name");
    set({ user: null, token: null, refreshToken: null, isAuthenticated: false });
  },
}));
