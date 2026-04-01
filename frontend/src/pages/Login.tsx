import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
    } catch {
      setError("Geçersiz kullanıcı adı veya şifre");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel — brand */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 text-white" style={{ background: "var(--gradient-brand)" }}>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center font-bold text-lg">S</div>
          <span className="text-xl font-bold tracking-tight">ScopeSmith</span>
          <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-semibold">AI</span>
        </div>
        <div>
          <blockquote className="text-2xl font-semibold leading-snug mb-4">
            "Requirements hatasının production'da düzeltme maliyeti, geliştirme aşamasına göre 100 kata kadar artabilir."
          </blockquote>
          <p className="text-white/70 text-sm">ScopeSmith bu hatayı kaynağında yakalar.</p>
        </div>
        <p className="text-white/50 text-xs">Powered by Claude AI</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center bg-background px-8">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white" style={{ background: "var(--gradient-brand)" }}>S</div>
            <span className="text-xl font-bold">ScopeSmith</span>
            <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-semibold border border-border">AI</span>
          </div>

          <h2 className="text-2xl font-bold mb-1">Giriş Yap</h2>
          <p className="text-muted-foreground text-sm mb-8">Hesabınıza erişmek için bilgilerinizi girin</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Kullanıcı Adı</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2.5 border rounded-lg bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                autoFocus
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Şifre</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 border rounded-lg bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
              />
            </div>
            {error && (
              <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg border border-destructive/20">
                {error}
              </div>
            )}
            <Button type="submit" className="w-full h-10" disabled={loading || !username || !password}>
              {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
