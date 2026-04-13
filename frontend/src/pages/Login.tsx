import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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

  // Split: left 58%, right 42% of 1200px max-width
  // Background bleeds out: left bg = 50vw + 96px, right bg = 50vw - 96px
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Full-width background halves — aligned to content split */}
      <div
        className="absolute inset-0 pointer-events-none hidden lg:block"
        style={{
          background: `linear-gradient(to right,
            var(--background) calc(50% + 26px),
            oklch(0.94 0.005 220) calc(50% + 26px)
          )`,
        }}
      />
      {/* Mobile background */}
      <div
        className="absolute inset-0 pointer-events-none lg:hidden"
        style={{ background: "oklch(0.94 0.005 220)" }}
      />

      {/* Centered content container — max 1200px */}
      <div className="relative min-h-screen flex mx-auto" style={{ maxWidth: "1080px" }}>

        {/* ── Left panel ── */}
        <div className="hidden lg:flex flex-col py-10 px-16" style={{ width: "58%" }}>
          {/* Logo */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div
              className="w-9 h-9 rounded-[10px] flex items-center justify-center text-white"
              style={{ background: "linear-gradient(135deg, #00bcd4, #00d1ff)" }}
            >
              <span className="material-icons-outlined text-[20px]">hub</span>
            </div>
            <span className="text-[1.1rem] font-bold tracking-tight">ScopeSmith</span>
          </div>

          {/* Hero */}
          <div className="flex-1 flex flex-col justify-center">
            <p className="text-[0.68rem] font-semibold tracking-[0.14em] uppercase text-muted-foreground mb-5">
              Yapay Zeka Destekli Analiz
            </p>
            <h1 className="text-[2.8rem] font-extrabold leading-[1.08] tracking-tight mb-5">
              Gereksinimleri<br />
              saniyeler içinde<br />
              <span style={{ color: "#00bcd4" }}>şekillendirin.</span>
            </h1>
            <p className="text-[0.88rem] text-muted-foreground leading-relaxed mb-9 max-w-[420px]">
              Yazılım ekipleri için geliştirilmiş gelişmiş AI motoruyla
              analiz süreçlerini hızlandırın, hataları minimize edin.
            </p>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-card text-[0.75rem] font-medium shadow-sm">
                <span className="material-icons-outlined text-[15px]" style={{ color: "#00bcd4" }}>auto_awesome</span>
                Akıllı Kapsam Analizi
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-card text-[0.75rem] font-medium shadow-sm">
                <span className="material-icons-outlined text-[15px]" style={{ color: "#00bcd4" }}>groups</span>
                Ekip İşbirliği
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between text-[0.62rem] uppercase tracking-wide text-muted-foreground/50 shrink-0">
            <span>© 2024 ScopeSmith AI. Tüm haklar saklıdır.</span>
            <div className="flex gap-4">
              <span className="cursor-pointer hover:text-muted-foreground transition-colors">Kullanım Koşulları</span>
              <span className="cursor-pointer hover:text-muted-foreground transition-colors">Gizlilik Politikası</span>
              <span className="cursor-pointer hover:text-muted-foreground transition-colors">İletişim</span>
            </div>
          </div>
        </div>

        {/* ── Right panel ── */}
        <div
          className="flex items-center justify-center w-full lg:flex-1 min-h-screen px-10 py-12"
        >
          <div className="w-full max-w-[340px]">
            {/* Mobile logo */}
            <div className="flex items-center justify-center gap-2 mb-8 lg:hidden">
              <div
                className="w-9 h-9 rounded-[10px] flex items-center justify-center text-white"
                style={{ background: "linear-gradient(135deg, #00bcd4, #00d1ff)" }}
              >
                <span className="material-icons-outlined text-[20px]">hub</span>
              </div>
              <span className="text-xl font-bold">ScopeSmith</span>
            </div>

            <div className="bg-card rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.10)] p-8">
              <h2 className="text-[1.3rem] font-bold mb-1">Hoş Geldiniz</h2>
              <p className="text-[0.78rem] text-muted-foreground mb-6">
                Analiz paneline erişmek için bilgilerinizi girin.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-[0.67rem] font-semibold tracking-wide uppercase text-muted-foreground mb-1.5 block">
                    Kullanıcı Adı
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50">
                      <span className="material-icons-outlined text-[17px]">person_outline</span>
                    </span>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="kullanıcı adı"
                      autoFocus
                      className="w-full pl-9 pr-4 py-2.5 border border-border rounded-[10px] bg-background text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-[#00bcd4] focus:ring-[3px] focus:ring-[#00bcd4]/10 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[0.67rem] font-semibold tracking-wide uppercase text-muted-foreground">
                      Şifre
                    </label>
                    <span className="text-[0.7rem] font-medium cursor-pointer" style={{ color: "#00838f" }}>
                      Şifremi Unuttum
                    </span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50">
                      <span className="material-icons-outlined text-[17px]">lock</span>
                    </span>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-10 py-2.5 border border-border rounded-[10px] bg-background text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-[#00bcd4] focus:ring-[3px] focus:ring-[#00bcd4]/10 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                    >
                      <span className="material-icons-outlined text-[17px]">
                        {showPassword ? "visibility_off" : "visibility"}
                      </span>
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="text-sm text-destructive bg-destructive/8 px-3 py-2 rounded-lg border border-destructive/15">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !username || !password}
                  className="w-full py-2.5 rounded-[10px] text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50 transition-all hover:-translate-y-px mt-1"
                  style={{ background: "linear-gradient(135deg, #00bcd4, #00acc1)", boxShadow: "0 2px 8px rgba(0,188,212,0.35)" }}
                >
                  {loading
                    ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <>Giriş Yap <span className="material-icons-outlined text-[16px]">arrow_forward</span></>
                  }
                </button>
              </form>

              <p className="text-center text-[0.75rem] text-muted-foreground mt-5">
                Hesabın yok mu?{" "}
                <span className="font-semibold cursor-pointer" style={{ color: "#00838f" }}>Kayıt ol</span>
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
