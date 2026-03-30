import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { login as apiLogin, logout as apiLogout, getMe, type AuthUser } from "@/api/client";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMe()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  async function login(username: string, password: string) {
    const result = await apiLogin(username, password);
    setUser(result);
  }

  async function logout() {
    await apiLogout().catch(() => {});
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin: user?.role === "ADMIN" }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
