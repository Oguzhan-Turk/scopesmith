import { Link, Outlet, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { Moon, Sun, ChevronDown } from "lucide-react";
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
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isProjectPage = location.pathname.startsWith("/projects/");
  const isSettingsPage = location.pathname === "/settings";
  const isFullWidthPage = isProjectPage || isSettingsPage;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Nav — 52px, mockup style */}
      <nav className="h-[52px] bg-card border-b border-border/60 px-6 flex items-center justify-between sticky top-0 z-50 backdrop-blur-xl">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2 no-underline">
            <div
              className="w-[26px] h-[26px] rounded-[7px] flex items-center justify-center text-white text-[13px] font-bold"
              style={{ background: "var(--gradient-brand)" }}
            >
              S
            </div>
            <span className="text-[1rem] font-bold text-foreground">ScopeSmith</span>
            <span className="text-[0.58rem] font-semibold px-[5px] py-[1px] rounded-[3px] tracking-wide"
              style={{ background: "linear-gradient(135deg, #00d1ff22, #00bcd422)", color: "#00838f" }}
            >
              AI
            </span>
          </Link>
          <div className="flex gap-0.5">
            <Link
              to="/"
              className={`px-2.5 py-1.5 rounded-md text-[0.78rem] font-medium no-underline transition-all ${
                location.pathname === "/" || isProjectPage
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              Projeler
            </Link>
            {isAdmin && (
              <Link
                to="/settings"
                className={`px-2.5 py-1.5 rounded-md text-[0.78rem] font-medium no-underline transition-all ${
                  location.pathname === "/settings"
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                Ayarlar
              </Link>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setDark(d => !d)}
            className="w-8 h-8 rounded-[7px] flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
            aria-label={dark ? "Acik mod" : "Koyu mod"}
          >
            {dark ? <Sun className="w-[17px] h-[17px]" /> : <Moon className="w-[17px] h-[17px]" />}
          </button>
          {user && (
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen(o => !o)}
                className="flex items-center gap-2 px-2.5 py-1 rounded-[7px] hover:bg-secondary transition-all"
              >
                <div
                  className="w-[26px] h-[26px] rounded-full flex items-center justify-center text-white text-[0.65rem] font-semibold"
                  style={{ background: "linear-gradient(135deg, #00bcd4, #0097a7)" }}
                >
                  {user.username.slice(0, 2).toUpperCase()}
                </div>
                <span className="text-[0.75rem] font-medium text-secondary-foreground">{user.username}</span>
                <ChevronDown className={`w-[15px] h-[15px] text-muted-foreground transition-transform ${userMenuOpen ? "rotate-180" : ""}`} />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-[calc(100%+6px)] w-52 bg-card border border-border rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.10)] overflow-hidden z-50">
                  {/* User info header */}
                  <div className="px-4 py-3 border-b border-border/60">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[0.7rem] font-semibold shrink-0"
                        style={{ background: "linear-gradient(135deg, #00bcd4, #0097a7)" }}
                      >
                        {user.username.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="text-[0.82rem] font-semibold text-foreground truncate">{user.username}</div>
                        <div className="text-[0.68rem] text-muted-foreground">
                          {isAdmin ? "Yönetici" : "Kullanıcı"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Menu items */}
                  <div className="p-1.5">
                    {isAdmin && (
                      <Link
                        to="/settings"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[0.78rem] text-foreground hover:bg-secondary transition-colors no-underline"
                      >
                        <span className="material-icons-outlined text-[16px] text-muted-foreground">settings</span>
                        Ayarlar
                      </Link>
                    )}
                    <button
                      onClick={() => { setUserMenuOpen(false); setDark(d => !d); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[0.78rem] text-foreground hover:bg-secondary transition-colors"
                    >
                      {dark
                        ? <><Sun className="w-4 h-4 text-muted-foreground" />Açık Mod</>
                        : <><Moon className="w-4 h-4 text-muted-foreground" />Koyu Mod</>
                      }
                    </button>
                    <div className="h-px bg-border/60 my-1" />
                    <button
                      onClick={() => { setUserMenuOpen(false); logout(); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[0.78rem] text-destructive hover:bg-destructive/8 transition-colors"
                    >
                      <span className="material-icons-outlined text-[16px]">logout</span>
                      Çıkış Yap
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </nav>

      {/* Main content — no max-width constraint for project pages (sidebar handles it) */}
      {isFullWidthPage ? (
        <Outlet />
      ) : (
        <main className="flex-1 max-w-[960px] mx-auto w-full px-8 py-10">
          <Outlet />
        </main>
      )}
    </div>
  );
}
