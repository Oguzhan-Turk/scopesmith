import { Link, Outlet, useLocation } from "react-router-dom";

export default function Layout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl font-bold tracking-tight">ScopeSmith</span>
            <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-medium">
              AI
            </span>
          </Link>
          <nav className="flex gap-4 text-sm text-muted-foreground">
            <Link
              to="/"
              className={location.pathname === "/" ? "text-foreground font-medium" : "hover:text-foreground"}
            >
              Projeler
            </Link>
          </nav>
        </div>
      </header>
      <main className="container mx-auto px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
