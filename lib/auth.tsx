import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";

import { configureStorageUser } from "@/lib/storage/userScope";

export type AuthUser = {
  username: string;
  displayName: string;
};

type AuthContextValue = {
  ready: boolean;
  user: AuthUser | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const OFFLINE_USER_KEY = "vocabulary-auth-user";
const AuthContext = createContext<AuthContextValue | null>(null);

function cacheUser(user: AuthUser | null) {
  if (typeof localStorage === "undefined") return;
  if (user) localStorage.setItem(OFFLINE_USER_KEY, JSON.stringify(user));
  else localStorage.removeItem(OFFLINE_USER_KEY);
}

function cachedUser() {
  if (typeof localStorage === "undefined") return null;

  try {
    const user = JSON.parse(
      localStorage.getItem(OFFLINE_USER_KEY) ?? "null",
    ) as Partial<AuthUser> | null;
    return user &&
      typeof user.username === "string" &&
      typeof user.displayName === "string"
      ? { username: user.username, displayName: user.displayName }
      : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    void fetch("/api/auth", { credentials: "include" })
      .then(async (response) => {
        if (response.status === 401) {
          cacheUser(null);
          return null;
        }
        if (!response.ok) throw new Error("Session check failed.");
        return ((await response.json()) as { user: AuthUser }).user;
      })
      .catch(() => cachedUser())
      .then((sessionUser) => {
        if (sessionUser) {
          configureStorageUser(sessionUser.username);
          cacheUser(sessionUser);
        }
        setUser(sessionUser);
        setReady(true);
      });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      user,
      async login(username, password) {
        const response = await fetch("/api/auth", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });
        const result = (await response.json()) as {
          user?: AuthUser;
          error?: string;
        };

        if (!response.ok || !result.user) {
          throw new Error(result.error ?? "Could not sign in.");
        }

        configureStorageUser(result.user.username);
        cacheUser(result.user);
        setUser(result.user);
      },
      async logout() {
        const response = await fetch("/api/auth", {
          method: "DELETE",
          credentials: "include",
        });
        if (!response.ok) throw new Error("Could not log out.");

        cacheUser(null);
        if (typeof caches !== "undefined") {
          await Promise.all(
            (await caches.keys()).map((key) => caches.delete(key)),
          );
        }
        if (typeof navigator !== "undefined" && navigator.serviceWorker) {
          await Promise.all(
            (await navigator.serviceWorker.getRegistrations()).map(
              (registration) => registration.unregister(),
            ),
          );
        }
        window.location.replace("/login");
      },
    }),
    [ready, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider.");
  return value;
}
