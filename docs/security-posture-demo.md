# ScopeSmith Security Posture (90s Demo)

## 90 Saniyelik Konuşma Metni

"ScopeSmith'i sadece özellik üreten bir AI aracı olarak değil, güvenli bir enterprise SDLC platformu olarak konumladık.

Bu turda security review ile 2 kritik, 4 önemli riski ele aldık.  
Kritik tarafta:
1. AI/user içerik render akışındaki XSS yüzeyini kapattık.  
2. Project membership akışındaki privilege escalation riskini kapattık.

Önemli tarafta:
- Session tabanlı auth için CSRF korumasını aktif ettik ve frontend ile uçtan uca uyumlandırdık.  
- Security header baseline ve session cookie hardening ekledik.  
- Production'da default encryption key ile kalkışı fail-fast yaptık.  
- Frontend runtime dependency audit'i temiz hale getirdik.

Bunlar sadece kod değişikliği değil; test ve operasyon kapılarıyla doğrulandı:
- Backend testler 37/37 yeşil,  
- Auth/CSRF integration testleri yeşil,  
- Frontend runtime audit 0 vulnerability,  
- CI deploy aşamasında encryption key policy gate aktif.

Yani mesajımız net: ScopeSmith, AI hızını güvenlik yönetişimiyle birlikte sunuyor."

## Demo Akışı (1 Slide / 4 Blok)

1. **Riskler (Önce)**
- XSS, privilege escalation, CSRF gap, weak key policy

2. **Kontroller (Sonra)**
- Safe render, role gate, CSRF double-submit, header/cookie hardening, key fail-fast

3. **Kanıt**
- `./mvnw test` -> `37 passed`
- `AuthCsrfIntegrationTest` -> `403 without CSRF`, `200 with CSRF`
- `npm audit --omit=dev` -> `0 vulnerability`

4. **Operasyonel Güvence**
- Jenkins deploy stage: `scopesmith-encryption-key` zorunlu, default key yasak

## Kanıt Referansları

- Security bulguları ve kapanışlar: `docs/security-review-2026-04-11.md`
- XSS fix: `frontend/src/components/project/MarkdownBody.tsx`
- CSRF + headers: `backend/src/main/java/com/scopesmith/config/SecurityConfig.java`
- CSRF endpoint: `backend/src/main/java/com/scopesmith/controller/AuthController.java`
- CSRF client flow: `frontend/src/api/client.ts`
- Membership security gate: `backend/src/main/java/com/scopesmith/service/ProjectAccessService.java`
- Auth/CSRF integration test: `backend/src/test/java/com/scopesmith/security/AuthCsrfIntegrationTest.java`
- Encryption fail-fast + tests:
  - `backend/src/main/java/com/scopesmith/config/EncryptionService.java`
  - `backend/src/test/java/com/scopesmith/config/EncryptionServiceTest.java`
- Jenkins deploy policy gate: `Jenkinsfile`

## Jüri Soru-Cevap (Kısa)

**Soru:** "Bunlar demo fix'i mi, yoksa kalıcı mı?"  
**Cevap:** "Kalıcı; testlerle ve deploy gate ile enforce ediliyor."

**Soru:** "AI tarafında en kritik güvenlik prensibiniz ne?"  
**Cevap:** "LLM output'u güvenilmez girdidir; UI ve sistem sınırında validate/sanitize ederiz."

**Soru:** "Production'a yanlış konfigürasyonla çıkmayı nasıl engelliyorsunuz?"  
**Cevap:** "App fail-fast + CI deploy policy gate birlikte çalışıyor."

## Kapanış Cümlesi

"ScopeSmith'te güvenlik, sonradan eklenen bir checklist değil; analizden deploy'a kadar ürün davranışının bir parçası."
