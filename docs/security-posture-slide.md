# ScopeSmith Security Posture (Single Slide)

## Headline
**AI hızını, enterprise güvenlik yönetişimiyle birleştiriyoruz.**

## What We Fixed (Today)
- 🔴 XSS render yüzeyi kapatıldı (unsafe HTML kaldırıldı)
- 🔴 Project membership privilege escalation kapatıldı
- 🟡 CSRF koruması uçtan uca aktif edildi
- 🟡 Security headers + session cookie hardening eklendi
- 🟡 Prod default encryption key fail-fast + CI deploy gate

## Proof
- Backend test: **37/37 PASS**
- `AuthCsrfIntegrationTest`: **403 (token yok)** / **200 (token var)**
- Frontend runtime audit: **0 vulnerability**
- Deploy policy: **default key ile deploy bloklanır**

## Why It Matters
- Güvenlik “sonradan eklenen checklist” değil, ürün davranışı
- AI çıktıları hız kazandırıyor, güvenlik kontrolleri üretim kalitesini koruyor
- ScopeSmith, enterprise ortamda güvenli ve denetlenebilir SDLC sağlar

## 15s Close
**“ScopeSmith sadece task üreten bir AI değil; güvenli, testli ve yönetişimli bir delivery platformu.”**
