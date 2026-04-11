# Security Review — 2026-04-11

Kapsam: ScopeSmith backend + frontend (session auth, markdown render, API istemci katmanı)

## Findings

### 🔴 Critical — Stored/Reflected XSS in Markdown Rendering
- Threat scenario:
  - Bir saldırgan AI çıktısı, doküman içeriği veya kullanıcı metnine `<script>`/event-handler benzeri payload enjekte edebilir ve UI tarafında çalıştırabilir.
- Impact:
  - Confidentiality + Integrity (session hijack, credential/token exfiltration, UI manipulation)
- Affected area:
  - `frontend/src/components/project/MarkdownBody.tsx`
- Root cause:
  - `dangerouslySetInnerHTML` ile sanitize edilmemiş içerik render edilmesi.
- Remediation applied:
  - `dangerouslySetInnerHTML` tamamen kaldırıldı.
  - Sadece kontrollü inline `**bold**` formatı React node olarak güvenli şekilde render ediliyor.
- Reference:
  - OWASP Top 10 A03 Injection
  - CWE-79 (Cross-site Scripting)

### 🔴 Critical — Project Membership Privilege Escalation
- Threat scenario:
  - Bir `EDITOR` kullanıcı, üye ekleme endpoint’ini kullanarak başka kullanıcıyı (hatta OWNER) projeye ekleyip yetki yükseltebilir.
- Impact:
  - Integrity + Confidentiality (yetkisiz üyelik yönetimi, proje verisine geniş erişim)
- Affected area:
  - `backend/src/main/java/com/scopesmith/service/ProjectAccessService.java`
- Root cause:
  - Üye yönetimi akışında `OWNER/ADMIN` doğrulaması eksik.
- Remediation applied:
  - Üye yönetimi sadece `OWNER` veya `ADMIN` için izinli.
  - `OWNER` rolü ataması sadece `ADMIN` tarafından yapılabilir.
  - Yetki kontrolü için `canManageMembers` kuralı eklendi.
- Reference:
  - OWASP Top 10 A01 Broken Access Control
  - CWE-269 (Improper Privilege Management)

### 🟡 Important — CSRF Protection Disabled on Session-based Auth
- Threat scenario:
  - Kullanıcı tarayıcı oturumu aktifken saldırgan site üzerinden state-changing isteklere zorlanabilir (cross-site form/request forgery).
- Impact:
  - Integrity (izin dışı state değişiklikleri)
- Affected area:
  - `backend/src/main/java/com/scopesmith/config/SecurityConfig.java`
  - `frontend/src/api/client.ts`
- Root cause:
  - CSRF koruması tamamen kapalıydı.
- Remediation applied:
  - Backend’de `CookieCsrfTokenRepository` aktifleştirildi.
  - `GET /api/v1/auth/csrf` endpoint’i ile token bootstrap eklendi.
  - Frontend mutating request’lerde `X-XSRF-TOKEN` header otomatik gönderilir hale getirildi.
  - Upload endpoint’leri de CSRF header ile uyumlu hale getirildi.
- Reference:
  - OWASP Top 10 A01 Broken Access Control (CSRF alt riski)
  - Spring Security CSRF best practices
  - CWE-352 (Cross-Site Request Forgery)

### 🟡 Important — Missing Security Header Baseline
- Threat scenario:
  - Tarayıcı güvenlik politikaları zayıf olduğunda clickjacking/yan kanal riskleri artar.
- Impact:
  - Integrity + Confidentiality (defense-in-depth eksikliği)
- Affected area:
  - `backend/src/main/java/com/scopesmith/config/SecurityConfig.java`
  - `backend/src/main/resources/application.yml`
- Remediation applied:
  - `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `Permissions-Policy` eklendi.
  - HSTS aktif edildi (HTTPS üzerinde).
  - Session cookie için `HttpOnly` + `SameSite=Lax` + env kontrollü `Secure` bayrağı eklendi.
- Reference:
  - OWASP ASVS v4 (V14 Config)
  - CWE-693 (Protection Mechanism Failure)

### 🟡 Important — Production Encryption Key Misconfiguration Risk (Hardened)
- Threat scenario:
  - Production ortamında default encryption key ile çalışan deployment, credential şifreleme güvenini zayıflatır.
- Impact:
  - Confidentiality (stored secret exposure risk amplification)
- Affected area:
  - `backend/src/main/java/com/scopesmith/config/EncryptionService.java`
- Remediation applied:
  - Default key + production profile kombinasyonunda startup fail-fast korunuyor.
  - Profile tespiti `contains("prod")` yerine güvenli profile token eşleşmesine geçirildi (`prod`/`production`), böylece `nonprod` gibi yanlış pozitifler engellendi.
  - Ünite testleri eklendi.
- Reference:
  - OWASP ASVS V6 (Stored Cryptography)
  - CWE-321 (Use of Hard-coded Cryptographic Key)

### 🟡 Important — Frontend Toolchain Advisory (Cleared)
- Threat scenario:
  - Eski `vite` sürümlerinde dev server path traversal / file read riskleri.
- Impact:
  - Ağırlıklı olarak development environment etkisi
- Remediation applied:
  - `vite` güvenli sürüme güncellendi.
  - Build-only paketler (`@tailwindcss/vite`, `tailwindcss`, `tw-animate-css`, `shadcn`) `devDependencies`’e taşındı.
  - `npm audit --omit=dev` sonucu temizlendi (0 vulnerability).
- Reference:
  - GHSA advisories (Vite/Hono)

## Verification
- Backend test: `cd backend && ./mvnw test` ✅
- Frontend build/type: `cd frontend && npm run build` ✅
- Frontend runtime dependency audit: `cd frontend && npm audit --omit=dev` ✅ (0 vulnerability)
- Auth/CSRF integration: `AuthCsrfIntegrationTest` ✅
  - `loginWithoutCsrfShouldBeRejected`
  - `loginWithCsrfShouldSucceed`
- Encryption fail-fast: `EncryptionServiceTest` ✅
  - prod/producation + default key -> startup block
  - nonprod + default key -> allowed (warn)
  - prod + custom key -> allowed

## Residual Risk / Next Hardening
1. Markdown özellikleri genişleyecekse sanitize edilmiş markdown parser (allowlist temelli) tercih edilmeli.
2. Backend dependency scanning CI’da NVD API key ile stabilize edilmeli (429 rate-limit engeli yaşandı).
3. CI/CD pipeline’da prod deploy öncesi `scopesmith.encryption-key` varlığı policy check ile zorunlu tutulmalı.
