import { Link, Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";

function useDarkMode() {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem("theme");
    if (saved) return saved === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  return [dark, setDark] as const;
}

export default function Layout() {
  const location = useLocation();
  const { user, logout, isAdmin } = useAuth();
  const [dark, setDark] = useDarkMode();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b sticky top-0 z-50 backdrop-blur-sm bg-card/80">
        <div className="container mx-auto px-6 py-3.5 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold shadow-sm" style={{ background: "var(--gradient-brand)" }}>
              S
            </div>
            <span className="text-xl font-bold tracking-tight">ScopeSmith</span>
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold border border-primary/20">
              AI
            </span>
          </Link>
          <nav className="flex items-center gap-1 text-sm text-muted-foreground">
            <Link
              to="/"
              className={`px-3 py-1.5 rounded-md transition-colors ${
                location.pathname === "/"
                  ? "bg-accent text-accent-foreground font-medium"
                  : "hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              Projeler
            </Link>
            {isAdmin && (
              <Link
                to="/settings"
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  location.pathname === "/settings"
                    ? "bg-accent text-accent-foreground font-medium"
                    : "hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                Ayarlar
              </Link>
            )}
            <button
              onClick={() => setDark(d => !d)}
              className="px-3 py-1.5 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors text-base"
              title={dark ? "Açık mod" : "Koyu mod"}
            >
              {dark ? "☀️" : "🌙"}
            </button>
            {user && (
              <button
                onClick={logout}
                className="ml-1 px-3 py-1.5 rounded-md hover:bg-destructive/10 hover:text-destructive transition-colors"
              >
                Çıkış <span className="text-muted-foreground">({user.username})</span>
              </button>
            )}
          </nav>
        </div>
      </header>
      <main className="container mx-auto px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
