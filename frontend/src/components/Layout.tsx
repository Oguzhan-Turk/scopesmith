import { Link, Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { Moon, Sun, LogOut, FolderKanban, Settings } from "lucide-react";
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
        <div className="container mx-auto max-w-6xl px-6 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ background: "var(--gradient-brand)" }}>
              S
            </div>
            <span className="text-lg font-bold tracking-tight">ScopeSmith</span>
            <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full font-medium border border-border">
              AI
            </span>
          </Link>
          <nav className="flex items-center gap-0.5 text-sm">
            <Link
              to="/"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                location.pathname === "/"
                  ? "bg-accent text-accent-foreground font-medium"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              <FolderKanban className="w-3.5 h-3.5" />
              Projeler
            </Link>
            {isAdmin && (
              <Link
                to="/settings"
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  location.pathname === "/settings"
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                Ayarlar
              </Link>
            )}
            <button
              onClick={() => setDark(d => !d)}
              className="p-2 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={dark ? "Acik mod" : "Koyu mod"}
            >
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            {user && (
              <button
                onClick={logout}
                className="inline-flex items-center gap-1.5 ml-1 px-3 py-1.5 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{user.username}</span>
              </button>
            )}
          </nav>
        </div>
      </header>
      <main className="container mx-auto max-w-6xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
