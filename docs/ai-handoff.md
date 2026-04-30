# AI Handoff Log

Bu dosya Claude Code / Codex arasında kayıpsız devir için ortak kaynak olarak tutulur.

## Handoff Standard (v1)
- Timestamp (local): `YYYY-MM-DD HH:mm TZ`
- Agent: `Claude` | `Codex`
- Branch + commit: aktif branch ve son commit
- Scope: Bu oturumda yapılan işin kısa özeti
- Changes: Değişen dosyalar
- Verification: Çalıştırılan test/build/lint ve sonuç
- Open items: Kalan risk/borç/karar noktaları
- Next actions: Sonraki adım listesi

---

## 2026-04-11 02:16 +03 — Codex
- Branch + commit: `master` @ `39be7da`
- Scope:
  - Teslim odaklı teknik denetim yapıldı.
  - Frontend derlemeyi kıran TypeScript/lint blokları giderildi.
  - Claude'dan gelen handoff notları repo ve DB üzerinde doğrulandı.
- Changes:
  - `frontend/src/components/project/TasksTab.tsx`
  - `frontend/src/components/project/ContextTab.tsx`
  - `frontend/src/components/project/DetailTab.tsx`
  - `frontend/src/pages/ProjectDetail.tsx`
  - `frontend/src/pages/Settings.tsx`
  - `frontend/eslint.config.js`
- Verification:
  - `backend`: `./mvnw test` ✅ (1 test, 0 failure)
  - `frontend`: `npm run build` ✅
  - `frontend`: `npm run lint` ✅ (0 error, 3 warning)
  - DB doğrulama (container içi query): `requirements(id=1)=1`, `analyses(id=1)=1`, `tasks(analysis_id=1)=3`
- Open items:
  - `GlobalExceptionHandler` içinde `ResponseStatusException` için özel handler yok; 404 bazı akışlarda 500'e düşebilir.
  - Frontend lint warning'leri (`useEffect` dependency) temizlenmedi.
  - Otomasyon test kapsamı düşük (özellikle E2E/smoke).
- Next actions:
  1. `ResponseStatusException` handler ekle + kısa regression test.
  2. `useEffect` warning'lerini kapat.
  3. E2E smoke akışı ekle: proje oluştur -> talep -> analiz -> task -> SP -> sync.

---

## 2026-04-11 02:21 +03 — Codex
- Branch + commit: `master` @ `39be7da` (working tree dirty)
- Scope:
  - `ResponseStatusException` kaynaklı 404->500 dönüşüm riski kapatıldı.
  - Global exception handling için unit test eklendi.
- Changes:
  - `backend/src/main/java/com/scopesmith/config/GlobalExceptionHandler.java`
  - `backend/src/test/java/com/scopesmith/config/GlobalExceptionHandlerTest.java`
- Verification:
  - `backend`: `./mvnw test` ✅ (3 test, 0 failure, 0 error)
- Open items:
  - Frontend `lint` warning'leri duruyor (`useEffect` dependency).
  - E2E smoke testi henüz yok.
- Next actions:
  1. Frontend warning'lerini stabilize et.
  2. E2E smoke akışı ekle.

---

## 2026-04-11 02:29 +03 — Codex
- Branch + commit: `master` @ `39be7da` (working tree dirty)
- Scope:
  - Frontend'de kalan `useEffect` dependency warning'leri temizlendi.
  - `ProjectDetail` ve `Settings` effect/fonksiyon düzeni stabilize edildi.
- Changes:
  - `frontend/src/pages/ProjectDetail.tsx`
  - `frontend/src/pages/Settings.tsx`
- Verification:
  - `frontend`: `npm run lint` ✅ (0 warning, 0 error)
  - `frontend`: `npm run build` ✅
- Open items:
  - E2E smoke akışı henüz eklenmedi.
- Next actions:
  1. E2E smoke test/senaryo otomasyonu ekle.

---

## 2026-04-11 02:52 +03 — Codex
- Branch + commit: `master` @ `39be7da` (working tree dirty)
- Scope:
  - Distinguished review’de çıkan 3 kritik security P0 (IDOR/role/method security) kapatıldı.
  - Merkezi kaynak bazlı yetkilendirme katmanı eklendi ve controller’lara uygulandı.
- Changes:
  - `backend/src/main/java/com/scopesmith/service/ResourceAccessService.java` (new)
  - `backend/src/main/java/com/scopesmith/config/SecurityConfig.java`
  - `backend/src/main/java/com/scopesmith/config/ProjectAccessInterceptor.java`
  - `backend/src/main/java/com/scopesmith/controller/RequirementController.java`
  - `backend/src/main/java/com/scopesmith/controller/AnalysisController.java`
  - `backend/src/main/java/com/scopesmith/controller/TaskController.java`
  - `backend/src/main/java/com/scopesmith/controller/QuestionController.java`
  - `backend/src/main/java/com/scopesmith/controller/DocumentController.java`
  - `backend/src/main/java/com/scopesmith/controller/UsageController.java`
  - `backend/src/main/java/com/scopesmith/repository/RequirementRepository.java`
  - `backend/src/main/java/com/scopesmith/repository/AnalysisRepository.java`
  - `backend/src/main/java/com/scopesmith/repository/TaskRepository.java`
  - `backend/src/main/java/com/scopesmith/repository/DocumentRepository.java`
  - `backend/src/main/java/com/scopesmith/repository/QuestionRepository.java`
  - `backend/src/test/java/com/scopesmith/service/ResourceAccessServiceTest.java` (new)
- Verification:
  - `backend`: `./mvnw test` ✅ (6 test, 0 failure, 0 error)
- Open items:
  - Scan path allowlist/sandbox ve async backpressure halen P1.
  - CSRF hardening (session auth) halen P1.
- Next actions:
  1. Scan güvenlik sınırları (allowed roots) ve rate limit/backpressure ekle.
  2. E2E smoke test/senaryo otomasyonu ekle.

---

## 2026-04-11 03:01 +03 — Codex
- Branch + commit: `master` @ `39be7da` (working tree dirty)
- Scope:
  - Scan güvenliği için local path allowlist ve git URL validation eklendi.
  - Scan işlemleri bounded `scanExecutor` havuzuna taşındı (backpressure + queue control).
  - Eşzamanlı aynı proje scan çağrıları için atomic guard eklendi.
- Changes:
  - `backend/src/main/java/com/scopesmith/service/ScanSecurityService.java` (new)
  - `backend/src/main/java/com/scopesmith/config/AsyncConfig.java`
  - `backend/src/main/java/com/scopesmith/service/ScanStatusService.java`
  - `backend/src/main/java/com/scopesmith/controller/ProjectController.java`
  - `backend/src/main/resources/application.yml`
  - `backend/src/test/java/com/scopesmith/service/ScanSecurityServiceTest.java` (new)
- Verification:
  - `backend`: `./mvnw test` ✅ (10 test, 0 failure, 0 error)
- Open items:
  - CSRF hardening (session auth) halen P1.
  - E2E smoke akışı henüz eklenmedi.
- Next actions:
  1. E2E smoke test/senaryo otomasyonu ekle.
  2. CSRF ve security headers hardening turu.

---

## 2026-04-11 03:08 +03 — Codex
- Branch + commit: `master` @ `39be7da` (working tree dirty)
- Scope:
  - Kullanıcı notları staff/distinguished seviyede ADR'ye dönüştürüldü.
  - Enterprise işletim modeli ve ilk 3 workstream planı netleştirildi.
- Changes:
  - `docs/decisions.md` (ADR-009 eklendi)
- Verification:
  - Dokümantasyon güncellemesi, runtime etkisi yok.
- Open items:
  - Workstream A/B/C henüz implement edilmedi.
- Next actions:
  1. Workstream A (Model Registry) için DB migration + API taslağı başlat.

---

## 2026-04-11 03:19 +03 — Codex
- Branch + commit: `master` @ `39be7da` (working tree dirty)
- Scope:
  - Workstream A (Model Registry) için ilk çalışan iskelet eklendi.
  - DB tabanlı model config, admin settings API ve runtime model çözümleme override'ı devreye alındı.
- Changes:
  - `backend/src/main/resources/db/migration/V6__ai_model_registry.sql` (new)
  - `backend/src/main/java/com/scopesmith/entity/AiModelConfig.java` (new)
  - `backend/src/main/java/com/scopesmith/repository/AiModelConfigRepository.java` (new)
  - `backend/src/main/java/com/scopesmith/dto/AiModelConfigDTO.java` (new)
  - `backend/src/main/java/com/scopesmith/service/AiModelConfigService.java` (new)
  - `backend/src/main/java/com/scopesmith/controller/SettingsController.java`
  - `backend/src/main/java/com/scopesmith/config/ModelProperties.java`
- Verification:
  - `backend`: `./mvnw test` ✅ (10 test, 0 failure, 0 error)
  - Flyway: schema version `6` doğrulandı.
- Open items:
  - Model registry şu an tier başına tek kayıt yaklaşımında (catalog genişletmesi yapılmadı).
  - Frontend settings UI'da model yönetimi ekranı henüz yok.
- Next actions:
  1. Frontend Settings'e Model Registry tabı ekle.
  2. Operation bazlı default model seçimi (tier dışı routing) ekle.

---

## 2026-04-11 03:26 +03 — Codex
- Branch + commit: `master` @ `39be7da` (working tree dirty)
- Scope:
  - Workstream A frontend tamamlandı: Settings altında `AI Modelleri` sekmesi eklendi.
  - Admin tarafında LIGHT/STANDARD/PREMIUM model konfigürasyonu UI üzerinden düzenlenebilir hale geldi.
- Changes:
  - `frontend/src/api/client.ts`
  - `frontend/src/pages/Settings.tsx`
- Verification:
  - `frontend`: `npm run lint` ✅
  - `frontend`: `npm run build` ✅
- Open items:
  - Model catalog ve operation-level routing henüz yok (sadece tier-based config var).
  - CSRF hardening ve E2E smoke test halen beklemede.
- Next actions:
  1. Workstream B: Incremental re-analysis için backend endpoint + UI tetik akışını başlat.
  2. E2E smoke senaryosunu CI'da koşacak şekilde ekle.

---

## 2026-04-11 03:31 +03 — Codex
- Branch + commit: `master` @ `39be7da` (working tree dirty)
- Scope:
  - Workstream B için incremental re-analysis MVP başlatıldı.
  - `context-freshness` değerlendirmesi (commit/dosya/modül + freshness/confidence skorları) eklendi.
  - Etkilenen modüllere göre `partial refresh` tetikleme endpoint'i ve Bağlam sekmesi UI aksiyonu eklendi.
- Changes:
  - `backend/src/main/java/com/scopesmith/service/ContextFreshnessService.java` (new)
  - `backend/src/main/java/com/scopesmith/dto/ContextFreshnessResponse.java` (new)
  - `backend/src/main/java/com/scopesmith/controller/ProjectController.java`
  - `backend/src/main/java/com/scopesmith/repository/AnalysisRepository.java`
  - `backend/src/test/java/com/scopesmith/service/ContextFreshnessServiceTest.java` (new)
  - `frontend/src/api/client.ts`
  - `frontend/src/pages/ProjectDetail.tsx`
  - `frontend/src/components/project/ContextTab.tsx`
  - `frontend/src/components/project/types.ts`
- New APIs:
  - `GET /api/v1/projects/{id}/context-freshness`
  - `POST /api/v1/projects/{id}/context-freshness/partial-refresh`
- Verification:
  - `backend`: `./mvnw test` ✅ (12 test, 0 failure, 0 error)
  - `frontend`: `npm run lint` ✅
  - `frontend`: `npm run build` ✅
- Open items:
  - Partial refresh şu an synchronous çalışıyor (uzun batch için async job kuyruğu yok).
  - Impacted module matching heuristik; AST/semantic diff henüz yok.
- Next actions:
  1. Partial refresh'i async job modeline taşı (job status + progress).
  2. Impact mapping'i heuristikten structured-context/AST tabanlı eşlemeye iyileştir.

---

## 2026-04-11 03:34 +03 — Codex
- Branch + commit: `master` @ `39be7da` (working tree dirty)
- Scope:
  - Workstream B incremental re-analysis, async job/polling modeline taşındı.
  - Partial refresh artık non-blocking çalışıyor; backend state endpoint'i ile progress izlenebiliyor.
- Changes:
  - `backend/src/main/java/com/scopesmith/service/PartialRefreshStatusService.java` (new)
  - `backend/src/main/java/com/scopesmith/dto/PartialRefreshStatusResponse.java` (new)
  - `backend/src/main/java/com/scopesmith/config/AsyncConfig.java`
  - `backend/src/main/java/com/scopesmith/controller/ProjectController.java`
  - `backend/src/test/java/com/scopesmith/service/PartialRefreshStatusServiceTest.java` (new)
  - `frontend/src/api/client.ts`
  - `frontend/src/pages/ProjectDetail.tsx`
  - `frontend/src/components/project/ContextTab.tsx`
  - `frontend/src/components/project/types.ts`
- New/Updated APIs:
  - `POST /api/v1/projects/{id}/context-freshness/partial-refresh` → `202 Accepted` ile job başlatır
  - `GET /api/v1/projects/{id}/context-freshness/partial-refresh-status` → `IDLE|RUNNING|DONE|FAILED` + progress döner
- Verification:
  - `backend`: `./mvnw test` ✅ (13 test, 0 failure, 0 error)
  - `frontend`: `npm run lint` ✅
  - `frontend`: `npm run build` ✅
- Open items:
  - Job state in-memory; restart sonrası progress geçmişi korunmuyor.
  - Partial refresh worker şu an sequential; ileride per-project concurrency policy ile optimize edilebilir.
- Next actions:
  1. Job state'i DB-backed hale getirip audit trail ekle (enterprise operability).
  2. Impacted module mapping'i structured-context + AST diff ile güçlendir.

---

## 2026-04-11 03:37 +03 — Codex
- Branch + commit: `master` @ `39be7da` (working tree dirty)
- Scope:
  - Partial refresh job state in-memory'den DB-backed yapıya taşındı.
  - Restart sonrası da status/history korunur hale geldi; auditability güçlendi.
- Changes:
  - `backend/src/main/resources/db/migration/V7__partial_refresh_jobs.sql` (new)
  - `backend/src/main/java/com/scopesmith/entity/PartialRefreshJob.java` (new)
  - `backend/src/main/java/com/scopesmith/entity/PartialRefreshJobStatus.java` (new)
  - `backend/src/main/java/com/scopesmith/repository/PartialRefreshJobRepository.java` (new)
  - `backend/src/main/java/com/scopesmith/service/PartialRefreshStatusService.java`
  - `backend/src/main/java/com/scopesmith/dto/PartialRefreshStatusResponse.java`
  - `backend/src/main/java/com/scopesmith/controller/ProjectController.java`
  - `backend/src/test/java/com/scopesmith/service/PartialRefreshStatusServiceTest.java`
- Behavior update:
  - `POST /context-freshness/partial-refresh` başlatılan job için DB kaydı oluşturur (`RUNNING`).
  - Worker progress/done/fail adımları DB'de güncellenir.
  - `GET /context-freshness/partial-refresh-status` son job kaydını döndürür (`jobId`, `startedAt`, `completedAt` dahil).
- Verification:
  - `backend`: `./mvnw test` ✅ (14 test, 0 failure, 0 error)
  - Flyway: schema version `7` doğrulandı.
  - `frontend`: `npm run lint` ✅
  - `frontend`: `npm run build` ✅
- Open items:
  - Job list/history endpoint (sadece latest status dönüyor).
  - UI'da job timestamp ve job id henüz gösterilmiyor.
- Next actions:
  1. `GET /projects/{id}/context-freshness/partial-refresh-jobs` (paged history) endpoint'i ekle.
  2. UI'da son 5 job deneme (başarılı/başarısız) timeline kartı ekle.

---

## 2026-04-11 03:40 +03 — Codex
- Branch + commit: `master` @ `39be7da` (working tree dirty)
- Scope:
  - Partial refresh job history endpoint eklendi.
  - Bağlam sekmesine son 5 deneme için timeline görünümü eklendi (RUNNING/DONE/FAILED).
- Changes:
  - `backend/src/main/java/com/scopesmith/controller/ProjectController.java`
  - `backend/src/main/java/com/scopesmith/service/PartialRefreshStatusService.java`
  - `backend/src/main/java/com/scopesmith/repository/PartialRefreshJobRepository.java`
  - `backend/src/test/java/com/scopesmith/service/PartialRefreshStatusServiceTest.java`
  - `frontend/src/api/client.ts`
  - `frontend/src/pages/ProjectDetail.tsx`
  - `frontend/src/components/project/types.ts`
  - `frontend/src/components/project/ContextTab.tsx`
- New API:
  - `GET /api/v1/projects/{id}/context-freshness/partial-refresh-jobs?limit=5`
- Verification:
  - `backend`: `./mvnw test` ✅ (15 test, 0 failure, 0 error)
  - `frontend`: `npm run lint` ✅
  - `frontend`: `npm run build` ✅
- Open items:
  - Timeline şu an sadece özet gösteriyor; detay modal (error/reason/ids) yok.
  - History endpoint şu an latest-first fixed list; cursor pagination yok.
- Next actions:
  1. Job detail drawer/modal (error stack, refreshed requirement ids, duration) ekle.
  2. History endpoint için cursor/page metadata ekle (ops dashboard hazırlığı).

---

## 2026-04-11 03:45 +03 — Codex
- Branch + commit: `master` @ `39be7da` (working tree dirty)
- Scope:
  - Partial refresh timeline için job detail paneli eklendi.
  - Satıra tıklayınca job id, süre, recommendation, ilerleme, yenilenen requirement id listesi ve hata metni görülebilir oldu.
- Changes:
  - `frontend/src/components/project/ContextTab.tsx`
- Verification:
  - `frontend`: `npm run lint` ✅
  - `frontend`: `npm run build` ✅
- Open items:
  - Duration şu an tamamlanan job için hesaplanıyor; RUNNING için "devam ediyor" gösteriliyor.
  - Job history endpoint'te pagination metadata halen yok.
- Next actions:
  1. History endpoint'e page/size/total metadata ekle.
  2. Timeline detayına retry aksiyonu ve job correlation link'i ekle.

---

## 2026-04-11 03:54 +03 — Codex
- Branch + commit: `master` @ `39be7da` (working tree dirty)
- Scope:
  - Frontend için Playwright tabanlı smoke test altyapısı eklendi.
  - Deterministik smoke senaryosu eklendi: login -> proje oluştur -> proje detaya git -> talep ekle.
  - CORS uyumu için Playwright base URL `localhost:5173` olacak şekilde ayarlandı.
- Changes:
  - `frontend/package.json` (`e2e:install`, `e2e:smoke`, `e2e:smoke:headed`)
  - `frontend/playwright.config.ts` (new)
  - `frontend/e2e/smoke.spec.ts` (new)
  - `frontend/.gitignore`
  - `docs/e2e-smoke.md` (new)
- Verification:
  - `frontend`: `npm run e2e:smoke` ✅ (1 passed)
  - `frontend`: `npm run lint` ✅
  - `frontend`: `npm run build` ✅
  - `backend`: `./mvnw test` ✅ (15 test, 0 failure, 0 error)
- Notes:
  - Smoke testi backend'in çalışır olmasını bekler (`localhost:8080`).
  - Mevcut CORS varsayılanı `localhost:5173`; bu yüzden smoke web server da bu origin ile çalışır.
- Next actions:
  1. Smoke teste "partial refresh history görünürlüğü" adımını ekle (test data fixture ile).
  2. CI pipeline'a `e2e:smoke` stage'i ekle.

---

## 2026-04-11 03:59 +03 — Codex
- Branch + commit: `master` @ `39be7da` (working tree dirty)
- Scope:
  - Smoke test, partial refresh timeline görünürlüğünü de doğrulayacak şekilde genişletildi.
  - Partial refresh çağrısı NO_ACTION/empty-impact durumunda da audit amaçlı `DONE` job kaydı üretir hale getirildi.
- Changes:
  - `backend/src/main/java/com/scopesmith/service/PartialRefreshStatusService.java`
  - `backend/src/main/java/com/scopesmith/controller/ProjectController.java`
  - `backend/src/test/java/com/scopesmith/service/PartialRefreshStatusServiceTest.java`
  - `frontend/e2e/smoke.spec.ts`
  - `docs/e2e-smoke.md`
- Verification:
  - `frontend`: `npm run e2e:smoke` ✅ (1 passed, timeline adımı dahil)
  - `frontend`: `npm run lint` ✅
  - `frontend`: `npm run build` ✅
  - `backend`: `./mvnw test` ✅ (16 test, 0 failure, 0 error)
- Notes:
  - Smoke test backend'e auth cookie taşıyarak API üzerinden deterministic partial refresh audit kaydı üretir.
  - Böylece "context recommendation şartı"na bağımlı kalmadan timeline görünürlüğü doğrulanır.
- Next actions:
  1. CI pipeline'a `e2e:smoke` stage'i ekle.
  2. Smoke test için ephemeral test-data cleanup adımı ekle (test sonrası proje temizliği).

---

## 2026-04-11 04:03 +03 — Codex
- Branch + commit: `master` @ `39be7da` (working tree dirty)
- Scope:
  - CI pipeline eklendi (backend test + frontend lint/build + e2e smoke).
  - Smoke teste opsiyonel cleanup eklendi (`SMOKE_CLEANUP=true`).
- Changes:
  - `.github/workflows/ci.yml` (new)
  - `frontend/e2e/smoke.spec.ts`
  - `docs/e2e-smoke.md`
- CI flow (GitHub Actions):
  - PostgreSQL service (`pgvector/pgvector:pg17`)
  - `backend ./mvnw test`
  - `frontend npm ci && npm run lint && npm run build`
  - Playwright browser install
  - Backend ayağa kaldırma + health check
  - `frontend npm run e2e:smoke` (`SMOKE_CLEANUP=true`)
  - Hata durumunda Playwright report + backend log artifact upload
- Verification:
  - `frontend`: `npm run e2e:smoke` ✅
  - `frontend`: `npm run lint` ✅
  - `frontend`: `npm run build` ✅
  - `backend`: `./mvnw test` ✅ (16 test, 0 failure, 0 error)
- Next actions:
  1. CI'ya branch protection kuralı bağla (merge gate).
  2. Smoke testi ikinci senaryo ile genişlet (partial refresh FAILED path).

---

## 2026-04-11 04:08 +03 — Codex
- Branch + commit: `master` @ `39be7da` (working tree dirty)
- Scope:
  - Partial refresh history endpoint'ine pagination metadata eklendi (`page/size/totalElements/totalPages/items`).
  - Context UI'ya "Daha Fazla Göster" ile history pagination bağlandı.
  - Frontend tarafı eski liste formatını da tolere edecek şekilde backward-compatible hale getirildi.
- Changes:
  - `backend/src/main/java/com/scopesmith/dto/PartialRefreshHistoryResponse.java` (new)
  - `backend/src/main/java/com/scopesmith/repository/PartialRefreshJobRepository.java`
  - `backend/src/main/java/com/scopesmith/service/PartialRefreshStatusService.java`
  - `backend/src/main/java/com/scopesmith/controller/ProjectController.java`
  - `backend/src/test/java/com/scopesmith/service/PartialRefreshStatusServiceTest.java`
  - `frontend/src/api/client.ts`
  - `frontend/src/pages/ProjectDetail.tsx`
  - `frontend/src/components/project/types.ts`
  - `frontend/src/components/project/ContextTab.tsx`
- API update:
  - `GET /api/v1/projects/{id}/context-freshness/partial-refresh-jobs?page=0&size=5`
  - Response: paged object (`items` listesi ile)
- Verification:
  - `backend`: `./mvnw test` ✅ (16 test, 0 failure, 0 error)
  - `frontend`: `npm run lint` ✅
  - `frontend`: `npm run build` ✅
  - `frontend`: `npm run e2e:smoke` ✅
- Notes:
  - Live/backward compatibility için frontend, eski list response gelirse otomatik normalize ediyor.
- Next actions:
  1. Branch protection'da CI required-check olarak zorunlu hale getir.
  2. Smoke testte `FAILED` history satırını da deterministic doğrulayan ikinci case ekle.

---

## 2026-04-11 04:14 +03 — Codex
- Branch + commit: `master` @ `39be7da` (working tree dirty)
- Scope:
  - Kullanıcının 1-2-3 isteğine göre üç alan birlikte ele alındı:
    1. Branch protection required-check: teknik olarak denendi, plan kısıtı nedeniyle API 403 (private repo + Pro/public gereksinimi)
    2. Smoke test FAILED path: deterministic ikinci senaryo eklendi
    3. Demo materyali: enterprise reliability akışıyla güncellendi
- Changes:
  - `frontend/e2e/smoke.spec.ts` (2 test case; FAILED timeline doğrulaması + opsiyonel cleanup)
  - `docs/demo-scenario.md` (enterprise akış, CI/operability anlatısı)
  - `docs/branch-protection.md` (runbook + engel durumu + hazır komutlar)
  - `frontend/package-lock.json` (`pg`, `@types/pg` eklendi)
- Verification:
  - `frontend`: `npm run e2e:smoke` ✅ (2 passed)
  - `frontend`: `npm run lint` ✅
  - `frontend`: `npm run build` ✅
  - `backend`: `./mvnw test` ✅ (16 test, 0 failure, 0 error)
- Blocker note:
  - Branch protection API response:
    - `Upgrade to GitHub Pro or make this repository public to enable this feature. (HTTP 403)`
  - Bu nedenle required-check aktif etme adımı teknik runbook olarak bırakıldı.
- Next actions:
  1. Repo plan/visibility uygun olduğunda `docs/branch-protection.md` komutunu çalıştırıp required check'i aktif et.
  2. Sunumda smoke + timeline + CI çıktılarını "enterprise readiness proof" olarak kullan.

---

## 2026-04-11 04:29 +03 — Codex
- Branch + commit: `master` @ `39be7da` (working tree dirty)
- Scope:
  - Sync akışına `Policy Gate` eklendi: sync öncesi kalite kontrolü (SP final + acceptance criteria zorunlu, stakeholder summary uyarı).
  - Project seviyesinde `Traceability` endpoint'i eklendi: requirement → latest analysis → task → sync referansı görünürlüğü.
  - Context UI'ya traceability özeti eklendi (coverage + kısa requirement listesi).
- Changes:
  - `backend/src/main/java/com/scopesmith/service/SyncPolicyGateService.java` (new)
  - `backend/src/main/java/com/scopesmith/service/SyncPolicyViolationException.java` (new)
  - `backend/src/main/java/com/scopesmith/dto/SyncPolicyCheckResponse.java` (new)
  - `backend/src/main/java/com/scopesmith/controller/AnalysisController.java`
    - `GET /api/v1/analyses/{id}/sync/policy-check`
    - Jira/GitHub sync endpoint'lerine gate enforcement
  - `backend/src/main/java/com/scopesmith/config/GlobalExceptionHandler.java`
    - `SYNC_POLICY_FAILED` kodu + `policyCheck` payload dönüşü (409)
  - `backend/src/main/java/com/scopesmith/service/TraceabilityService.java` (new)
  - `backend/src/main/java/com/scopesmith/dto/TraceabilityResponse.java` (new)
  - `backend/src/main/java/com/scopesmith/controller/ProjectController.java`
    - `GET /api/v1/projects/{id}/traceability`
  - `frontend/src/api/client.ts`
    - `getTraceability(...)` + `TraceabilityReport` type
  - `frontend/src/pages/ProjectDetail.tsx`
    - İlk yüklemede traceability fetch
    - Sync sonrası traceability refresh
    - Sync error mesajını direkt kullanıcıya gösterme
  - `frontend/src/components/project/ContextTab.tsx`
    - Traceability card (summary + top 6 requirement satırı)
  - `frontend/src/components/project/TasksTab.tsx`
    - Tekil sync hata mesajı iyileştirildi
- Verification:
  - `backend`: `./mvnw test` ✅ (20 test, 0 failure, 0 error)
  - `frontend`: `npm run lint` ✅
  - `frontend`: `npm run build` ✅
- Notes:
  - Policy gate blocking hataları artık frontend’de insan-okunur şekilde görülüyor.
  - Stakeholder summary şu an warning; istenirse hard-block policy'e çevrilebilir.

---

## 2026-04-11 04:55 +03 — Codex
- Branch + commit: `master` @ `39be7da` (working tree dirty)
- Scope:
  - Multi-service / BE-FE ayrık yapı için **Workspace Service Registry (Phase-1 Foundation)** eklendi.
  - Task modeline service referansı bağlandı (service-aware planning için temel adım).
  - Integration config sözleşmesi service-level routing destekleyecek şekilde genişletildi (backward compatible).
- Changes:
  - DB migration:
    - `backend/src/main/resources/db/migration/V8__workspace_service_registry.sql`
    - Tablolar: `project_services`, `service_dependencies`
    - `tasks` tablosuna `service_id` FK eklendi
  - Backend entity/repository:
    - `entity/ProjectServiceNode.java` (new)
    - `entity/ServiceDependency.java` (new)
    - `entity/ServiceType.java` (new)
    - `repository/ProjectServiceNodeRepository.java` (new)
    - `repository/ServiceDependencyRepository.java` (new)
  - Backend API + service layer:
    - `service/ProjectServiceRegistryService.java` (new)
    - `controller/ProjectServiceRegistryController.java` (new)
    - Endpoints:
      - `GET    /api/v1/projects/{projectId}/services`
      - `POST   /api/v1/projects/{projectId}/services`
      - `PUT    /api/v1/projects/{projectId}/services/{serviceId}`
      - `DELETE /api/v1/projects/{projectId}/services/{serviceId}`
      - `GET    /api/v1/projects/{projectId}/services/graph`
      - `POST   /api/v1/projects/{projectId}/services/dependencies`
      - `DELETE /api/v1/projects/{projectId}/services/dependencies/{dependencyId}`
  - DTO updates:
    - `dto/ProjectServiceRequest.java` (new)
    - `dto/ProjectServiceResponse.java` (new)
    - `dto/ServiceDependencyRequest.java` (new)
    - `dto/ServiceDependencyResponse.java` (new)
    - `dto/ServiceGraphResponse.java` (new)
    - `dto/IntegrationConfigDTO.java` → `serviceRouting` eklendi
  - Task API/model updates:
    - `entity/Task.java` → `service` relation eklendi
    - `dto/TaskResponse.java` → `serviceId`, `serviceName` eklendi
    - `dto/TaskUpdateRequest.java` → `serviceId` eklendi
    - `controller/TaskController.java` → task-service bağlama desteği + proje eşleşme kontrolü
  - Frontend API types/contracts:
    - `frontend/src/api/client.ts`
      - `ProjectService`, `ServiceGraph`, dependency request/response tipleri
      - service registry endpoint fonksiyonları
      - `IntegrationConfig.serviceRouting` + `Task.serviceId/serviceName`
- Verification:
  - `backend`: `./mvnw test` ✅ (23 test, 0 failure, 0 error)
  - `frontend`: `npm run lint` ✅
  - `frontend`: `npm run build` ✅
- Notes:
  - Bu turda UI henüz service registry ekranı eklenmedi; API ve sözleşme hazırlandı.
  - Sonraki adım: Federated scan + service-aware task generation/policy.

---

## 2026-04-11 05:00 +03 — Codex
- Branch + commit: `master` @ `39be7da` (working tree dirty)
- Scope:
  - Multi-service foundation bir adım ileri taşındı:
    1. **Service-level scan** endpoint’i eklendi (service bazlı context üretimi)
    2. **Federated context** endpoint’i eklendi (aktif service context’lerini tek payload’da birleştirme)
    3. **Integrations UI** içinde Workspace Services yönetimi bağlandı
- Backend additions:
  - `service/ServiceContextScanService.java` (new)
    - Service path üzerinde scan + AI context + structured context üretir
  - `controller/ProjectServiceRegistryController.java`
    - `POST /api/v1/projects/{projectId}/services/{serviceId}/scan`
    - `GET /api/v1/projects/{projectId}/services/federated-context`
  - DTO:
    - `dto/ServiceScanRequest.java` (new)
    - `dto/ServiceScanResponse.java` (new)
    - `dto/FederatedContextResponse.java` (new)
  - `service/ProjectServiceRegistryService.java`
    - `getFederatedContext(...)` eklendi
  - Test:
    - `backend/src/test/java/com/scopesmith/service/ProjectServiceRegistryServiceTest.java`
      - federated context testi eklendi
- Frontend additions:
  - `frontend/src/api/client.ts`
    - service scan + federated context API fonksiyonları ve tipleri
  - `frontend/src/pages/ProjectDetail.tsx`
    - service registry state/handler’ları eklendi
    - create/delete/scan service + add/delete dependency akışları
  - `frontend/src/components/project/types.ts`
    - `IntegrationsTabProps` service registry alanlarıyla genişletildi
  - `frontend/src/components/project/IntegrationsTab.tsx`
    - Workspace Services UI:
      - service ekleme formu
      - service listesi + scan/sil aksiyonları
      - dependency ekleme/silme
- Verification:
  - `backend`: `./mvnw test` ✅ (24 test, 0 failure, 0 error)
  - `frontend`: `npm run lint` ✅
  - `frontend`: `npm run build` ✅
- Notes:
  - Service scan şu an sync çalışıyor (tek çağrıda tamamlanıyor).
  - `ServiceContextScanService` içinde `ProjectContextService` ile tekrar eden scan kodu var; helper extraction teknik borç notu bırakıldı.

---

## 2026-04-11 05:03 +03 — Codex
- Branch + commit: `master` @ `39be7da` (working tree dirty)
- Scope:
  - Service-aware sync routing aktif edildi (task.service -> hedef Jira/GitHub route).
  - Sync Policy Gate provider-aware hale getirildi (Jira/GitHub için service route zorunluluk kontrolü).
- Backend changes:
  - `service/SyncPolicyGateService.java`
    - `SyncProvider` eklendi (`JIRA`, `GITHUB`)
    - `evaluateForProvider(...)` ve `assertCanSyncForProvider(...)`
    - Provider bazlı route doğrulaması:
      - `MISSING_JIRA_ROUTE`
      - `MISSING_GITHUB_ROUTE`
  - `controller/AnalysisController.java`
    - `sync/jira` ve `sync/github` çağrıları provider-aware gate kullanıyor
    - `GET /analyses/{id}/sync/policy-check` endpoint’i `provider` + `target` query param alabiliyor
  - `service/JiraService.java`
    - Task bazlı route çözümleme:
      - request override > serviceRouting > global config > env default
    - `serviceRouting.defaultIssueType` desteği
    - result `issues` içine `targetProject` eklendi
  - `service/GitHubService.java`
    - Task bazlı route çözümleme:
      - request override > serviceRouting > global config > env default
    - Çoklu repo senaryosunda label bootstrap repo bazında yapılıyor
    - result `issues` içine `targetRepo` eklendi
  - Test:
    - `SyncPolicyGateServiceTest` provider-route eksikliği için yeni test eklendi
- Verification:
  - `backend`: `./mvnw test` ✅ (25 test, 0 failure, 0 error)
  - `frontend`: `npm run lint` ✅
  - `frontend`: `npm run build` ✅
- Notes:
  - Mevcut `jiraKey` alanı tek field olduğu için çoklu provider referanslarını normalize etmiyor.
  - Sonraki güçlü adım: `task_sync_refs` normalize tablosu (provider/key/target/status) ile traceability ve verify akışını ayrıştırmak.

---

## 2026-04-11 10:33 +03 — Codex
- Branch + commit: `master` @ `39be7da` (working tree dirty)
- Scope:
  - `jiraKey` tek alan modelinden normalize yapıya geçiş başladı: `task_sync_refs` tablosu ve servis katmanı eklendi.
  - Sync/verify/traceability akışları yeni modeli kullanacak şekilde güncellendi; `jiraKey` backward-compat mirror olarak korunuyor.
- Changes:
  - DB:
    - `backend/src/main/resources/db/migration/V9__task_sync_refs.sql` (new)
  - Entity/Repo/Service:
    - `entity/TaskSyncRef.java` (new)
    - `entity/SyncProviderType.java` (new)
    - `repository/TaskSyncRefRepository.java` (new)
    - `service/TaskSyncRefService.java` (new)
    - `entity/Task.java` → `syncRefs` relation eklendi
  - Sync services:
    - `service/JiraService.java`
      - issue create sonrası `TaskSyncRef` upsert
      - verify akışı `TaskSyncRef` provider=JIRA üzerinden çalışıyor
    - `service/GitHubService.java`
      - issue create sonrası `TaskSyncRef` upsert
      - verify akışı `TaskSyncRef` provider=GITHUB üzerinden çalışıyor
  - Traceability:
    - `dto/TraceabilityResponse.java` → `TaskLink.syncRefs[]` eklendi
    - `service/TraceabilityService.java` sync verisini öncelikle `syncRefs` üzerinden üretiyor (fallback: `jiraKey`)
  - Task response/frontend contract:
    - `dto/TaskResponse.java` → `syncRefs` eklendi
    - `frontend/src/api/client.ts` → `Task.syncRefs` + `Traceability.task.syncRefs` type eklendi
    - `frontend/src/components/project/TasksTab.tsx` → sync badge/link hesapları `syncRefs` aware
    - `frontend/src/pages/ProjectDetail.tsx` → refine confirm sayacı `syncRefs` aware
  - Task refine uyumu:
    - `service/TaskBreakdownService.java`
      - sync etiketini `syncRefs` üzerinden okuma
      - matched task’a `syncRefs` taşıma
      - orphan issue listesinde `syncRefs` önceliği
- Verification:
  - `backend`: `./mvnw test` ✅ (25 test, 0 failure, 0 error)
  - `frontend`: `npm run lint` ✅
  - `frontend`: `npm run build` ✅
- Notes:
  - `jiraKey` hâlâ tutuluyor (geçiş uyumluluğu). Yeni tekil doğruluk kaynağı `task_sync_refs`.
  - Sonraki adım: UI’da task kartında birden fazla sync ref’i aynı anda göstermek + edit/sync yönetimi.

---

## 2026-04-11 10:42 +03 — Codex
- Branch + commit: `master` @ `39be7da` (working tree dirty)
- Scope:
  - Task UI’da çoklu sync-ref görünümü tamamlandı (Jira + GitHub birlikte).
  - Service-aware task assignment UX tamamlandı (manual/create + edit + bulk assign).
- Changes:
  - Frontend task UI:
    - `frontend/src/components/project/TasksTab.tsx`
      - Task header’da provider etiketli multi sync-ref badge/link gösterimi (`JR`/`GH`)
      - `syncRefs` yoksa `jiraKey` fallback
      - Task header’da `serviceName` badge
      - Admin için toplu atama şeridi:
        - task seçimi (checkbox)
        - service seçimi
        - seçili task’lara tek seferde `serviceId` update
  - Frontend API/types:
    - `frontend/src/api/client.ts`
      - `updateTask(...)` payload’ına `serviceId` eklendi
      - `createManualTask(...)` payload’ına `serviceId` eklendi
    - `frontend/src/components/project/types.ts`
      - `TasksTabProps` içine `projectServices` eklendi
  - Dialog UX:
    - `frontend/src/components/project/dialogs/ManualTaskDialog.tsx`
      - manual task form’a `service` dropdown eklendi
    - `frontend/src/components/project/dialogs/EditTaskDialog.tsx`
      - edit dialog’a `service` dropdown eklendi
    - `frontend/src/pages/ProjectDetail.tsx`
      - manual task form state’e `serviceId` eklendi
      - manual create sonrası gerekirse `updateTask` ile service ataması garanti edildi
      - edit save request’e `serviceId` eklendi
      - `TasksTab`, `EditTaskDialog`, `ManualTaskDialog` içine `projectServices` geçirildi
- Verification:
  - `frontend`: `npm run lint` ✅
  - `frontend`: `npm run build` ✅
  - `backend`: `./mvnw test` ✅ (25 test, 0 failure, 0 error)
- Notes:
  - Bulk assign şu an client-side çoklu `updateTask` çağrısı ile yapılıyor; dataset büyürse backend `bulk-update` endpoint’i düşünülebilir.
  - Kalan ana adım: demo/pitch hardening + final E2E smoke run.

---

## 2026-04-11 10:47 +03 — Codex
- Branch + commit: `master` @ `39be7da` (working tree dirty)
- Scope:
  - Final demo/pitch hardening tamamlandı.
  - Final E2E smoke run gerçek ortamda çalıştırıldı.
- Changes:
  - `docs/demo-scenario.md`
    - Enterprise akışa 2 güçlü fark eklendi:
      - Microservice federation demo adımı
      - Service-aware multi-provider sync/policy gate demo adımı
    - Süre planı güncellendi (`~12-14 dk`)
    - Final kapanış cümlesi federation + multi-provider vurgusuyla güçlendirildi
- Verification:
  - `frontend`: `npm run e2e:smoke` ✅
    - `login + create project + add requirement flow` passed
    - `partial refresh FAILED entry is visible in timeline` passed
  - Önceki doğrulamalar halen geçerli:
    - `frontend`: `npm run lint` ✅
    - `frontend`: `npm run build` ✅
    - `backend`: `./mvnw test` ✅ (25 test, 0 failure, 0 error)
- Notes:
  - Planlanan 3 kalan adım da kapatıldı:
    1. Multi sync-ref UI ✅
    2. Service-aware task assignment UX ✅
    3. Demo hardening + final smoke ✅

---

## 2026-04-11 10:56 +03 — Codex
- Branch + commit: `master` @ `39be7da` (working tree dirty)
- Scope:
  - Bitbucket CI uyumluluğu görünür şekilde eklendi.
  - Demo anlatısı GitHub'a bağımlı olmayacak şekilde güncellendi.
- Changes:
  - `bitbucket-pipelines.yml` (new)
    - PostgreSQL service (`pgvector/pgvector:pg17`)
    - Backend test + frontend lint/build + e2e smoke quality gate
    - Playwright report ve backend log artifact çıktısı
  - `docs/ci-bitbucket.md` (new)
    - Bitbucket pipeline kapsamı, altyapı ve çıktılar
  - `docs/demo-scenario.md`
    - Quality Gate adımı provider-agnostic hale getirildi
    - Bitbucket pipeline notu eklendi
- Notes:
  - Bu değişiklikle CI anlatısı artık "GitHub Actions zorunlu" değil; Bitbucket-native akış mevcut.

---

## 2026-04-11 11:04 +03 — Codex
- Branch + commit: `master` @ `39be7da` (working tree dirty)
- Scope:
  - Kurumsal altyapı bilgisine göre Jenkins + OpenShift akışı eklendi.
- Changes:
  - `Jenkinsfile` (new)
    - Verify zinciri: backend test + frontend lint/build + optional smoke
    - `main` branch için opsiyonel OpenShift deploy stage
    - `oc apply` + rollout status
    - artifact archive (backend log + playwright outputs)
  - `docs/ci-jenkins-openshift.md` (new)
    - Parametreler, credentials, deploy davranışı
  - `docs/demo-scenario.md`
    - CI anlatısına Jenkins + OpenShift uyumluluk notu
- Notes:
  - Deploy için Jenkins tarafında `openshift-token` credential ve `OPENSHIFT_API_URL` env tanımı gerekiyor.

---

## 2026-04-11 11:16 +03 — Codex
- Branch + commit: `master` @ `39be7da` (working tree dirty)
- Scope:
  - Task over-splitting riskini azaltmak için decomposition promptları staff-level sıkılaştırıldı.
  - AI feature değerlendirmesi için scorecard standardı eklendi.
- Changes:
  - `backend/src/main/resources/prompts/task-breakdown.txt`
    - outcome-oriented decomposition kuralları güçlendirildi
    - default task count 4-8, hard limit 10
    - testing task'ı ayrımı için stricter kural eklendi
    - multi-service split prensibi netleştirildi
  - `backend/src/main/resources/prompts/task-breakdown-refine.txt`
    - refine aşamasında gereksiz mikro-split'i engelleyen kurallar eklendi
  - `docs/agentic-task-slicing-standard.md` (new)
    - agentic task dilimleme standardı + kalite skoru
  - `docs/ai-feature-evaluation-scorecard.md` (new)
    - feature'ları AI katkısı ve SDLC etkisiyle puanlama çerçevesi
- Notes:
  - Bu tur kod davranışından çok model davranışını yöneten prompt/policy seviyesinde kalite artışı sağlar.

---

## 2026-04-11 11:28 +03 — Codex
- Branch + commit: `master` @ `39be7da` (working tree dirty)
- Scope:
  - Mevcut backlog staff-level kalite filtresinden geçirilip yeniden düzenlendi.
  - Over-splitting etkisini azaltacak şekilde "merge/keep/drop" kararları tek dokümanda toplandı.
- Changes:
  - `docs/backlog-rationalized.md` (new)
    - KEEP: AI Governance v2, Incremental Analysis v2, Task Quality Metrics, Security Hardening
    - MERGE: Observability+Audit UI, Delivery Platform Compatibility, Service Registry Maturity
    - DROP/DEFER: Managed Agent UX expansion, branch-protection automation, mikro refactor maddeleri
    - 1 haftalık uygulama paketi önerisi
- Notes:
  - Bu çalışma task sayısını değil outcome kalitesini optimize etmeyi hedefler.

---

## 2026-04-11 11:36 +03 — Codex
- Branch + commit: `master` @ `39be7da` (working tree dirty)
- Scope:
  - ScopeSmith feature seti için AI etki haritası çıkarıldı.
  - Feature bazında AI katkısı, KPI, fallback ve guardrail çerçevesi standardize edildi.
- Changes:
  - `docs/ai-impact-map.md` (new)
    - 8 ana feature alanı için AI katkı seviyesi
    - KPI/fallback/guardrail matrisi
    - Jury sunumu için kısa executive summary
- Notes:
  - Bu doküman backlog sınıflaması değil, "AI value narrative" belgesidir.

---

## 2026-04-11 11:48 +03 — Codex
- Branch + commit: `master` @ `39be7da` (working tree dirty)
- Scope:
  - Managed Agent için "neden/nerede kullanılacak?" belirsizliği ürün kararı seviyesinde netleştirildi.
- Changes:
  - `docs/decisions.md`
    - `ADR-010: Managed Agent Operating Model` eklendi
    - Agent'in core akıştan ayrı, opsiyonel "delivery accelerator" olarak konumlandırılması
    - allowed/non-goals/guardrails/workflow/rollout policy tanımı
- Notes:
  - Varsayılan kapalı flag yaklaşımı korunuyor; kontrollü rollout prensibi netleşti.

---

## 2026-04-11 11:58 +03 — Codex
- Branch + commit: `master` @ `39be7da` (working tree dirty)
- Scope:
  - Prompt ve script katmanı staff-level audit edildi.
  - Kritik prompt/schema uyumsuzlukları ve prompt yönetim güvenlik boşlukları kapatıldı.
- Changes:
  - `backend/src/main/resources/prompts/analysis-refine.txt`
    - Question schema `question/suggestedAnswer/type/options` ile hizalandı
  - `backend/src/main/resources/prompts/bug-analysis.txt`
    - `structuredSummary` zorunluluğu netleştirildi
  - `backend/src/main/java/com/scopesmith/config/PromptSeeder.java`
    - Eksik prompt seed'leri eklendi (`analysis-refine`, `task-breakdown-bug`, `sp-suggestion`, `document-summary`, `feature-suggestion`)
  - `backend/src/main/java/com/scopesmith/controller/PromptController.java`
    - Prompt `GET` endpointleri admin role ile sınırlandı
  - `docs/prompt-script-audit-2026-04-11.md` (new)
    - Critical/Important/Suggestion bulgu raporu
- Verification:
  - `backend`: `./mvnw test` ✅ (25 test, 0 failure, 0 error)
- Notes:
  - Script tarafında acil bloklayıcı güvenlik açığı bulunmadı; secret yönetimi CI store üzerinden sürdürülmeli.

---

## 2026-04-11 11:32 +03 — Codex
- Branch + commit: `master` @ `39be7da` (working tree dirty)
- Scope:
  - Kullanıcı talebiyle promptların tamamı ikinci turda "gold standard" seviyesine getirildi.
- Changes:
  - `backend/src/main/resources/prompts/*.txt` altında 14 promptun tamamı güncellendi.
  - Güçlendirilen alanlar:
    - schema/output kontratı
    - dil stratejisi tutarlılığı
    - no-hallucination / uncertainty handling
    - task decomposition ve feature/SP kalite kuralları
  - `docs/prompt-script-audit-2026-04-11.md`
    - Phase-2 full hardening özeti eklendi
- Verification:
  - `backend`: `./mvnw test` ✅ (25 test, 0 failure, 0 error)
- Notes:
  - Prompt katmanı artık daha deterministik ve bakım açısından daha güvenli.

---

## 2026-04-11 11:38 +03 — Codex
- Branch + commit: `master` @ `39be7da` (working tree dirty)
- Scope:
  - Task connection/sync stabilitesi için hedefli testler eklendi.
  - `syncRefs` önceliği, refine preserve/orphan akışları testle güvenceye alındı.
- Changes:
  - `backend/src/test/java/com/scopesmith/service/TaskBreakdownServiceTest.java` (new)
    - refine sırasında matched task'ın `jiraKey/spFinal` korunumu
    - matched task `syncRefs` -> yeni task `upsert` davranışı
    - orphaned sync ref için provider bazlı auto-close (`#` -> GitHub)
    - refine prompt input'unda sync label önceliği (`syncRefs` > `jiraKey`)
  - `backend/src/test/java/com/scopesmith/service/TraceabilityServiceTest.java`
    - `syncRefs` mevcutsa legacy `jiraKey` yerine `syncRefs` referansının seçilmesi
    - çoklu provider sync target görünürlüğü (`GITHUB` + `JIRA`)
- Verification:
  - `backend`: `./mvnw test` ✅ (28 test, 0 failure, 0 error)
- Notes:
  - Task bağlantı/senkronizasyon kritik yolları artık regression test kapsamına alındı.

---

## 2026-04-11 11:46 +03 — Codex
- Branch + commit: `master` @ `39be7da` (working tree dirty)
- Scope:
  - "Manual + AI Assist" işletim modeli runbook olarak yazıldı.
- Changes:
  - `docs/manual-ai-assist-runbook.md` (new)
    - Manual-first operating model
    - adım bazlı AI/manuel sorumluluk sınırı
    - karar matrisi ve minimum kontrol checklist'i
    - başarı metriği seti
- Notes:
  - Bu doküman takımın AI kullanımını süreçten bağımsız değil, süreçle uyumlu hale getirmek için referans alınacak.

---

## 2026-04-11 11:41 +03 — Codex
- Branch + commit: `master` @ `39be7da` (working tree dirty)
- Scope:
  - #9 (vector db + learning kalitesi) ve #10 (6 aylık ekonomik sürdürülebilirlik) için teknik değerlendirme tamamlandı.
  - Embedding similarity akışında kaliteyi etkileyen duplikasyon riski kapatıldı.
- Changes:
  - `backend/src/main/java/com/scopesmith/service/EmbeddingService.java`
    - Similarity sorgusunda `analyses` join'i latest analysis'e `LATERAL` ile indirildi
    - requirement başına çoklu analiz kaynaklı duplicate similarity satır riski giderildi
  - `docs/vector-learning-economics-assessment.md` (new)
    - mevcut durum, risk, 6 aylık ekonomik/kalite guardrail planı
- Verification:
  - `backend`: `./mvnw test` ✅ (28 test, 0 failure, 0 error)
- Notes:
  - Öğrenme altyapısı aktif; uzun vadeli değer için düzenli eval + budget governance ritmi önerildi.

---

## 2026-04-11 11:44 +03 — Codex
- Branch + commit: `master` @ `39be7da` (working tree dirty)
- Scope:
  - #11 için fikir dağınıklığını yönetecek kalıcı funnel eklendi.
- Changes:
  - `docs/idea-funnel.md` (new)
    - Now/Next/Later/Parking Lot modeli
    - yeni fikir giriş şablonu
    - WIP sınırı prensibi
- Notes:
  - Böylece "yeni fikir üretimi" ile "teslim odağı" birlikte yönetilebilir.

---

## 2026-04-11 11:51 +03 — Codex
- Branch + commit: `master` @ `39be7da` (working tree dirty)
- Scope:
  - Principal Security review turunda 1 kritik + 1 önemli bulgu kapatıldı.
  - Frontend markdown render katmanında XSS yüzeyi kapatıldı.
  - Session tabanlı auth akışında CSRF koruması aktif edildi.
- Changes:
  - `frontend/src/components/project/MarkdownBody.tsx`
    - `dangerouslySetInnerHTML` kaldırıldı.
    - Güvenli inline bold renderer eklendi (HTML parse yok).
  - `backend/src/main/java/com/scopesmith/config/SecurityConfig.java`
    - `CookieCsrfTokenRepository.withHttpOnlyFalse()` ile CSRF etkinleştirildi.
  - `backend/src/main/java/com/scopesmith/config/CorsConfig.java`
    - `X-XSRF-TOKEN` CORS allowed headers listesine eklendi.
  - `backend/src/main/java/com/scopesmith/controller/AuthController.java`
    - `GET /api/v1/auth/csrf` endpoint'i eklendi.
  - `frontend/src/api/client.ts`
    - mutating request'lerde CSRF bootstrap (`/auth/csrf`) + `X-XSRF-TOKEN` header akışı eklendi.
    - upload endpoint'leri CSRF header ile uyumlu hale getirildi.
- Verification:
  - `backend`: `./mvnw test` ✅ (28 test, 0 failure, 0 error)
  - `frontend`: `npm run build` ✅
- Open items:
  - Security headers (CSP/HSTS/X-Frame-Options vb.) için ayrı hardening turu planlanmalı.
  - Auth akışına hedefli integration test eklemek faydalı (csrf happy-path + missing token fail).
- Next actions:
  1. Security headers hardening + smoke doğrulama.
  2. Auth/CSRF integration test seti.

---

## 2026-04-11 12:09 +03 — Codex
- Branch + commit: `master` @ `39be7da` (working tree dirty)
- Scope:
  - Derin security pass (manual + automated) uygulandı.
  - Üyelik yönetiminde privilege escalation riski kapatıldı.
  - Security headers + session cookie hardening eklendi.
  - Frontend dependency advisory temizliği yapıldı.
- Changes:
  - `backend/src/main/java/com/scopesmith/service/ProjectAccessService.java`
    - `canManageMembers` kuralı eklendi (OWNER/ADMIN).
    - `OWNER` rol ataması sadece ADMIN ile sınırlandı.
  - `backend/src/test/java/com/scopesmith/service/ProjectAccessServiceTest.java` (new)
  - `backend/src/main/java/com/scopesmith/config/SecurityConfig.java`
    - security header baseline (frame/referrer/permissions/HSTS) eklendi.
  - `backend/src/main/resources/application.yml`
    - session cookie hardening (`HttpOnly`, `SameSite=Lax`, env kontrollü `secure`)
  - `frontend/package.json`
  - `frontend/package-lock.json`
    - `vite` güncellendi.
    - build-only paketler `devDependencies`’e taşındı.
  - `docs/security-review-2026-04-11.md`
    - yeni bulgular + kapanan maddeler + residual risk güncellendi.
- Verification:
  - `backend`: `./mvnw test` ✅ (31 test, 0 failure, 0 error)
  - `backend`: `./mvnw -q -DskipTests org.owasp:dependency-check-maven:check` ⚠️ NVD `429` (rate-limit)
  - `frontend`: `npm run build` ✅
  - `frontend`: `npm audit --omit=dev` ✅ (0 vulnerability)
- Open items:
  - Backend dependency-check için NVD API key ile CI stabilizasyonu gerekli.
  - CSRF auth flow için hedefli integration test seti henüz eklenmedi.
  - Default encryption key prod enforce policy henüz kod seviyesinde zorunlu değil.
- Next actions:
  1. Auth/CSRF integration testleri (happy-path + fail-path).
  2. CI security stage: backend dependency-check + secret scan + SARIF/artifact.
  3. Production profile’da default encryption key fail-fast.

---

## 2026-04-11 21:16 +03 — Codex
- Branch + commit: `master` @ `39be7da` (working tree dirty)
- Scope:
  - Auth/CSRF hardening için integration test coverage eklendi ve çalıştırıldı.
- Changes:
  - `backend/src/test/java/com/scopesmith/security/AuthCsrfIntegrationTest.java` (new)
    - `loginWithoutCsrfShouldBeRejected` (`403` doğrulaması)
    - `loginWithCsrfShouldSucceed` (`/auth/csrf` bootstrap + `X-XSRF-TOKEN` ile `200` doğrulaması)
  - `docs/security-review-2026-04-11.md`
    - verification ve residual-risk bölümleri güncellendi.
- Verification:
  - `backend`: `./mvnw test` ✅ (33 test, 0 failure, 0 error)
- Open items:
  - Backend dependency-check NVD rate-limit (429) CI stabilizasyonu bekliyor.
  - Production’da default encryption key için fail-fast policy henüz enforce değil.
- Next actions:
  1. Production profile: default encryption key fail-fast.
  2. CI security stage standardization (dependency + secret scan + raporlama).

---

## 2026-04-11 21:18 +03 — Codex
- Branch + commit: `master` @ `39be7da` (working tree dirty)
- Scope:
  - Production encryption key fail-fast kontrolü harden edildi.
  - Profile eşleşme mantığında false-positive riski (`nonprod`) kapatıldı.
- Changes:
  - `backend/src/main/java/com/scopesmith/config/EncryptionService.java`
    - `contains("prod")` yerine token bazlı profile kontrolü (`prod|production`) eklendi.
  - `backend/src/test/java/com/scopesmith/config/EncryptionServiceTest.java` (new)
    - fail-fast ve izinli senaryolar için 4 test eklendi.
  - `docs/security-review-2026-04-11.md`
    - encryption fail-fast bulgusu ve verification güncellendi.
- Verification:
  - `backend`: `./mvnw test` ✅ (37 test, 0 failure, 0 error)
- Open items:
  - CI/CD’de prod deploy öncesi `scopesmith.encryption-key` policy check henüz otomatik değil.
- Next actions:
  1. Jenkins/Bitbucket pipeline’da encryption-key presence gate ekle.
  2. CI security stage standardization (secret scan + dependency report artifacts).

---

## 2026-04-11 21:19 +03 — Codex
- Branch + commit: `master` @ `39be7da` (working tree dirty)
- Scope:
  - Encryption key güvenlik politikasını CI/CD deploy kapısına taşıdım.
- Changes:
  - `Jenkinsfile`
    - Deploy aşamasına security gate eklendi:
      - `SCOPESMITH_ENCRYPTION_KEY` zorunlu
      - default key değeri yasak
    - `scopesmith-encryption-key` credential eklendi.
    - OpenShift deployment env'ine `SCOPESMITH_ENCRYPTION_KEY` enjekte ediliyor (`set +x` ile secret log sızıntısı önlendi).
  - `docs/ci-jenkins-openshift.md`
    - yeni credential ve deploy security gate dokümantasyonu eklendi.
- Verification:
  - Pipeline/dokümantasyon değişikliği (runtime test yok).
- Open items:
  - Bitbucket tarafında deploy aşaması eklenecekse aynı encryption-key gate kuralı taşınmalı.
  - CI security stage (secret scan + dependency artifacts) henüz ayrı stage olarak tanımlanmadı.
- Next actions:
  1. İstenirse Bitbucket deploy pipeline için aynı security gate ekle.
  2. CI security stage standardization (secret scan + rapor artifact).

---

## 2026-04-11 21:20 +03 — Codex
- Branch + commit: `master` @ `39be7da` (working tree dirty)
- Scope:
  - Komite sunumu için tek sayfalık security posture demo metni hazırlandı.
- Changes:
  - `docs/security-posture-demo.md` (new)
    - 90 saniyelik konuşma metni
    - demo akışı (risk -> kontrol -> kanıt -> operasyonel güvence)
    - kod/test/CI kanıt referansları
    - jüri Q&A kısa cevap seti
- Verification:
  - Dokümantasyon güncellemesi, runtime etkisi yok.
- Open items:
  - İstenirse bu metin `docs/demo-scenario.md` içine "Security Segment" olarak entegre edilebilir.
- Next actions:
  1. Sunum/Lifebox için bu metni 1 slide görsel formatına dönüştür.

---

## 2026-04-11 21:22 +03 — Codex
- Branch + commit: `master` @ `39be7da` (working tree dirty)
- Scope:
  - Security demo metni slide-ready kısa versiyona dönüştürüldü.
  - Bitbucket pipeline tarafında deploy security gate parity eklendi.
- Changes:
  - `docs/security-posture-slide.md` (new)
    - tek ekranlık headline + proof + close formatı
  - `bitbucket-pipelines.yml`
    - `custom: deploy-openshift` pipeline eklendi
    - `SCOPESMITH_ENCRYPTION_KEY` zorunlu/default-value yasak gate eklendi
    - OpenShift deploy env injection + rollout adımları eklendi
  - `docs/ci-bitbucket.md`
    - custom deploy pipeline ve gerekli env/security gate dokümantasyonu eklendi
- Verification:
  - `bitbucket-pipelines.yml` YAML parse ✅ (`YAML OK`)
- Open items:
  - Bitbucket workspace/repo variable setlerinin ortamda gerçekten tanımlanması gerekiyor.
- Next actions:
  1. Lifebox sunumunda security slide olarak `docs/security-posture-slide.md` içeriklerini kullan.
  2. İstenirse deploy pipeline’a ek smoke/health gate adımı eklenebilir.

---

## 2026-04-11 21:30 +03 — Codex
- Branch + commit: `master` @ `39be7da` (working tree dirty)
- Scope:
  - `1) Microservice farkı` ve `2) task over-splitting guardrail` için ürün içi iyileştirmeler eklendi.
- Changes:
  - `frontend/src/components/project/IntegrationsTab.tsx`
    - yeni **Microservice Readiness** kartı:
      - service scan coverage
      - dependency graph sayısı
      - routing coverage
      - routing eksik service uyarısı
  - `frontend/src/components/project/TasksTab.tsx`
    - yeni **Task Quality Guardrail** kartı:
      - mikro-split risk sinyali
      - service atanmamış task sinyali (multi-service projede)
      - tek tık refinement instruction şablonları (merge/service-boundary/test embedding)
    - refinement chip seti mikro-split’i teşvik etmeyecek şekilde güncellendi.
  - `backend/src/main/java/com/scopesmith/service/TaskBreakdownService.java`
    - task breakdown prompt input’una **Workspace Service Registry** + service dependency context enjekte edildi.
    - decomposition guidance: deployable service boundary önceliği + micro-step kaçınma notu eklendi.
- Verification:
  - `backend`: `./mvnw test` ✅ (37 test, 0 failure, 0 error)
  - `frontend`: `npm run build` ✅
- Open items:
  - AI output şu an doğrudan `serviceId` atamıyor; service mapping kullanıcı/sonraki katman ile tamamlanıyor.
- Next actions:
  1. `3) Managed Agent` için ürün içi yönlendirme akışı (ne zaman kullan, ne zaman kullanma) ekle.

---

## 2026-04-11 21:34 +03 — Codex
- Branch + commit: `master` @ `39be7da` (working tree dirty)
- Scope:
  - Terminoloji sadeleştirildi: `Microservice` yerine kullanıcı dilinde `Workspace Services` tercih edildi.
- Changes:
  - `frontend/src/components/project/IntegrationsTab.tsx`
    - `Microservice Readiness` başlığı -> `Workspace Services Readiness`
  - `docs/demo-scenario.md`
    - demo akışındaki federation başlığı ve final cümlesi `workspace services federation` diline güncellendi
- Verification:
  - `frontend`: `npm run build` ✅
- Open items:
  - Yok (terminoloji netleştirme tamamlandı).
- Next actions:
  1. Managed Agent kullanım yönlendirme akışına geç.

---

## 2026-04-11 21:36 +03 — Codex
- Branch + commit: `master` @ `39be7da` (working tree dirty)
- Scope:
  - Managed Agent için ürün içi karar rehberi UX'i eklendi (ne zaman kullan / ne zaman manual).
- Changes:
  - `frontend/src/components/project/TasksTab.tsx`
    - `Managed Agent Karar Rehberi` kartı eklendi
    - task bazında `Agent önerilir` / `Manual hızlı` sinyalleri eklendi
    - agent-uygunluğu için SP/kabul kriteri/service/sync odaklı değerlendirme mantığı eklendi
    - hızlı refinement chip'leri agent-executable yönde genişletildi
  - `docs/managed-agent-guidance.md` (new)
    - operating model, recommended vs manual-better, işletim prensipleri
- Verification:
  - `frontend`: `npm run build` ✅
- Open items:
  - Feature flag açıkken gerçek `start/status/cancel` buton UX'i bilinçli olarak hâlâ devre dışı (ADR-010 uyumlu).
- Next actions:
  1. İstenirse controlled beta için task card'da `Agent Başlat` akışı (hard guardrail + confirm gate) eklenebilir.

---

## 2026-04-11 21:38 +03 — Codex
- Branch + commit: `master` @ `39be7da` (working tree dirty)
- Scope:
  - Managed Agent için ürün rolü netleştirildi: ScopeSmith task yönetim sistemi değil, control tower.
- Changes:
  - `docs/decisions.md`
    - `ADR-011: Control Tower Model (ScopeSmith vs Jira/GitHub Ownership)` eklendi.
    - SoR sınırı, ownership kontratı, workflow contract ve non-goals netleştirildi.
  - `docs/managed-agent-guidance.md`
    - "Ürün Sınırı" bölümü eklendi (Jira/GitHub SoR, ScopeSmith orchestration/audit)
    - işletim adımları dispatch-first modele güncellendi.
  - `docs/demo-scenario.md`
    - demo akışına açık not eklendi: "System of Record Jira/GitHub, ScopeSmith control tower."
- Verification:
  - Dokümantasyon güncellemesi, runtime etkisi yok.
- Open items:
  - İstenirse bu karar doğrultusunda UI'da kısa "SoR badge/help text" eklenebilir.
- Next actions:
  1. Agent beta UX'i açılacaksa ADR-011 sözleşmesine uygun guardrailli akış tasarla.

---

## 2026-04-11 21:39 +03 — Codex
- Branch + commit: `master` @ `39be7da` (working tree dirty)
- Scope:
  - "İleride Jira yerine geçebiliriz" vizyonu stratejik ama odağı bozmadan backlog/karar setine işlendi.
- Changes:
  - `docs/decisions.md`
    - ADR-011 altına `Long-Term Option: ScopeSmith Native Work Mode` eklendi
  - `docs/backlog-rationalized.md`
    - `D4) ScopeSmith Native Work Mode (Jira'sız SoR)` defer maddesi eklendi
  - `docs/idea-funnel.md`
    - Later kolonuna Native Work Mode maddesi eklendi
- Verification:
  - Dokümantasyon güncellemesi, runtime etkisi yok.
- Open items:
  - Native mode için activation criteria ve faz planı ileride ayrı ADR ile detaylandırılabilir.
- Next actions:
  1. Mevcut odak: ADR-011 control-tower modelini ürün içinde tutarlı uygulamak.

---

## 2026-04-11 21:45 +03 — Codex
- Branch + commit: `master` @ `39be7da` (working tree dirty)
- Scope:
  - "ScopeSmith kendisi hakkında güvenilir/tutarlı cevap verebilir mi?" sorusu için Staff + Distinguished seviyede teknik review.
- Changes:
  - `docs/self-assistant-distinguished-review-2026-04-11.md` (new)
    - severity-first bulgular (`🔴/🟡/🟢`)
    - cross-project insight leakage riski
    - scan-to-LLM secret redaction eksikliği
    - self-assistant için deterministic contract önerisi
    - 3 opsiyonlu rollout (Fast MVP / Recommended / Full Agentic)
    - ScopeSmith'i local coding agent'lara karşı savunan enterprise değer önerisi
- Verification:
  - Dokümantasyon güncellemesi; runtime davranış değişikliği yok.
- Open items:
  - Kritik riskler (cross-project leakage + secret redaction) kod seviyesinde kapatılmalı.
- Next actions:
  1. İstenirse bir sonraki adımda kritik iki güvenlik gap'i kodla kapatıp testleri çalıştır.

---

## 2026-04-11 21:49 +03 — Codex
- Branch + commit: `master` @ `39be7da` (working tree dirty)
- Scope:
  - Distinguished review'da çıkan 2 kritik güvenlik bulgusunun kodla kapatılması.
- Changes:
  - `backend/src/main/java/com/scopesmith/repository/AnalysisRepository.java`
    - cross-project insight sorgusu organization boundary ile sınırlandı (`findByOtherProjectsInOrganizationAndType`).
  - `backend/src/main/java/com/scopesmith/service/InsightService.java`
    - cross-project insight default kapalı (`scopesmith.insights.cross-project-enabled=false`).
    - feature açık olsa dahi organization guard olmadan cross-project referans üretmiyor.
  - `backend/src/main/java/com/scopesmith/service/SecretRedactionService.java` (new)
    - private key, token, api key, password/secret assignment, URL credentials için redaction katmanı eklendi.
  - `backend/src/main/java/com/scopesmith/service/ProjectContextService.java`
    - scan-to-LLM path'inde dosya içeriği gönderilmeden önce redaction zorunlu hale getirildi.
    - redaction sayısı audit amaçlı loglanıyor.
  - `backend/src/main/resources/application.yml`
    - `scopesmith.insights.cross-project-enabled` config eklendi (env: `SCOPESMITH_INSIGHTS_CROSS_PROJECT_ENABLED`, default `false`).
  - Testler:
    - `backend/src/test/java/com/scopesmith/service/SecretRedactionServiceTest.java` (new)
    - `backend/src/test/java/com/scopesmith/service/InsightServiceTest.java` (new)
- Verification:
  - `backend`: `./mvnw test` ✅
    - `Tests run: 40, Failures: 0, Errors: 0, Skipped: 0`
- Open items:
  - Gerekirse cross-project insight için "same-org + anonymized aggregate only" ikinci güvenlik katmanı eklenebilir.
- Next actions:
  1. Self-assistant için deterministic response contract (`answer/confidence/evidence/actions`) endpointi eklenebilir.

---

## 2026-04-11 21:52 +03 — Codex
- Branch + commit: `master` @ `39be7da` (working tree dirty)
- Scope:
  - Deterministic self-assistant vertical slice implementasyonu (`answer/confidence/evidence/actions`).
- Changes:
  - `backend/src/main/java/com/scopesmith/controller/SelfAssistantController.java` (new)
    - `POST /api/v1/assistant/self-help` endpointi eklendi.
    - `projectId` verilirse project access kontrolü + context freshness enrichment yapıyor.
  - `backend/src/main/java/com/scopesmith/service/SelfAssistantService.java` (new)
    - AI çağrısı yapmadan rule-based intent routing:
      - managed agent
      - sync (Jira/GitHub)
      - context freshness
      - ScopeSmith differentiation
      - capability summary
      - low-confidence fallback
    - Her yanıtta `evidence[]` ve `actions[]` dönüyor.
  - `backend/src/main/java/com/scopesmith/dto/SelfAssistantRequest.java` (new)
    - request schema: `question` (zorunlu), `projectId` (opsiyonel)
  - `backend/src/main/java/com/scopesmith/dto/SelfAssistantResponse.java` (new)
    - response schema: `answer`, `confidence`, `fallbackUsed`, `evidence[]`, `actions[]`
  - `backend/src/test/java/com/scopesmith/service/SelfAssistantServiceTest.java` (new)
    - managed-agent intent, context-enriched response ve fallback davranışı test edildi.
- Verification:
  - `backend`: `./mvnw test` ✅
    - `Tests run: 43, Failures: 0, Errors: 0, Skipped: 0`
- Open items:
  - UI'da henüz self-assistant paneli yok; endpoint backend hazır.
- Next actions:
  1. Project detail içinde "ScopeSmith Assistant" paneli eklenip bu endpoint'e bağlanabilir.

---

## 2026-04-11 21:54 +03 — Codex
- Branch + commit: `master` @ `39be7da` (working tree dirty)
- Scope:
  - Self-assistant deneyimini klasik support-chat UX'e taşımak (sağ alt floating chat).
- Changes:
  - `frontend/src/components/project/ScopeSmithAssistantWidget.tsx` (new)
    - sağ alt yüzen yuvarlak buton
    - tıklayınca açılan chat paneli
    - hızlı soru chip'leri
    - `confidence`, `fallback`, `evidence`, `actions` gösterimi
    - actionType `NAVIGATE` ise ilgili route'a geçiş
  - `frontend/src/api/client.ts`
    - `askSelfAssistant()` API fonksiyonu
    - `SelfAssistantRequest/Response` + evidence/action tipleri
  - `frontend/src/pages/ProjectDetail.tsx`
    - widget sayfaya entegre edildi
- Verification:
  - `frontend`: `npm run build` ✅
- Open items:
  - Şu an mesaj geçmişi sayfa bazlı state'te tutuluyor; persistent chat memory yok.
- Next actions:
  1. İstenirse widget global app seviyesine taşınıp proje dışı sayfalarda da aktif edilebilir.

---

## 2026-04-11 22:23 +03 — Codex
- Branch + commit: `master` @ `39be7da` (working tree dirty)
- Scope:
  - Self-assistant'ı rule-only modelden **Rule + AI birlikte (hybrid)** modele taşıma, güvenlik guardrail'leriyle.
- Changes:
  - `backend/src/main/java/com/scopesmith/service/SelfAssistantService.java`
    - hybrid orchestration eklendi:
      - deterministic intent router (base cevap)
      - AI-assisted cevap üretimi (prompt tabanlı)
      - strict validator (answer/action sanitization)
      - güvenli fallback (AI invalid/hata durumunda deterministic cevap)
    - `NAVIGATE` dışı action'lar ve allowlist dışı hedefler reddediliyor.
    - AI cevabında URL/dosya/path/markdown-link benzeri riskli çıktı filtreleniyor.
  - `backend/src/main/java/com/scopesmith/dto/SelfAssistantAiResult.java` (new)
    - AI structured output şeması
  - `backend/src/main/resources/prompts/self-assistant-hybrid.txt` (new)
    - son kullanıcı odaklı, güvenli, JSON-only hybrid prompt
  - `backend/src/main/java/com/scopesmith/config/PromptSeeder.java`
    - `self-assistant-hybrid` prompt seed listesine eklendi
  - `backend/src/main/resources/application.yml`
    - assistant hybrid feature/config anahtarları eklendi:
      - `scopesmith.assistant.ai-enabled`
      - `scopesmith.assistant.ai-min-question-length`
      - `scopesmith.assistant.ai-max-question-length`
  - `backend/src/test/java/com/scopesmith/service/SelfAssistantServiceTest.java`
    - hybrid valid response, unsafe action sanitization, ai-disabled deterministic path testleri güncellendi
  - `frontend/src/components/project/ScopeSmithAssistantWidget.tsx`
    - son kullanıcı UX sadeleştirildi (`confidence/evidence/fallback` görünümleri kaldırıldı)
    - sadece güvenli `NAVIGATE` aksiyonları gösteriliyor
  - `frontend/src/api/client.ts`
    - CSRF token yönetimi güçlendirildi (response token cache + stale token azaltımı)
- Verification:
  - `backend`: `./mvnw test -q` ✅
  - `frontend`: `npm run build` ✅
- Open items:
  - Hybrid kaliteyi ölçmek için golden question set + answer regression testi eklenebilir.
- Next actions:
  1. İstenirse `SCOPESMITH_ASSISTANT_AI_ENABLED` ile rollout canary yapılabilir (önce internal users).

---

## 2026-04-13 — Claude Code (UI redesign + CI stabilization)
- Branch + commit: `master` (merge from `ui-redesign`) → `0afc23a..7aa41b7`
- Scope:
  - Frontend redesign + UI consistency pass + CI green-up.
- Changes:
  - `frontend/src/pages/Login.tsx`
    - `@` ikonu → `person_outline`, placeholder sadeleştirildi
    - Footer (copyright/legal) kaldırıldı
  - `frontend/src/components/Layout.tsx`, `frontend/src/pages/Dashboard.tsx`, `frontend/src/components/project/RequirementsTab.tsx`
    - Navbar yeniden, talepler tab kart layout yenilendi
    - Requirements card edit/delete flow (action menu, edit dialog, type toggle)
  - `frontend/src/api/client.ts`
    - `updateRequirement(id, rawText, type)` eklendi
  - `backend/src/main/java/com/scopesmith/controller/RequirementController.java`
    - `PUT /api/v1/requirements/{id}` endpoint
  - `backend/src/main/java/com/scopesmith/controller/ProjectController.java`
    - Git clone scan sonrası `localPath = null` set edilerek temp path persistence bug'ı kapatıldı
  - `frontend/src/hooks/useToast.tsx`
    - Solid colored toast → card-style with colored left border
  - `frontend/src/components/project/TasksTab.tsx`
    - `hasLocalPath` prop, "Yerel path gerekli" badge, agent button disable durumu
    - Unused imports cleanup
  - `frontend/e2e/smoke.spec.ts`
    - UI redesign sonrası locator'lar resilient hâle getirildi
    - Empty-state buton metni handling (`Proje Oluştur` vs `Yeni Proje Başlat`)
    - Heading vs text-by-role disambiguation (strict mode violation)
  - `backend/src/main/java/com/scopesmith/service/TaskBreakdownService.java`
    - `project` ve `hasLocalPath` props destructure edilmemiş bug'ı düzeltildi
- Verification:
  - `backend`: compile + tests ✅
  - `frontend`: `tsc -b`, `eslint`, `vite build`, `playwright e2e:smoke` ✅
- Open items:
  - "Bütün ekranlar sola yapışık ve ekranı kaplamıyor" (geniş ekran layout sorunu) **çözülmedi** — ayrı bir oturuma bırakıldı.
- Next actions:
  1. Wide-screen layout fix (max-width + center, veya responsive grid).

---

## 2026-04-28 — Claude Code (6 UX bug fixes)
- Branch + commit: `master` @ `9800c0a` (`fix: 6 UX bugs found during demo prep`) + `1a7f346` (test alignment)
- Scope:
  - Manuel test sırasında tespit edilen 6 ufak ama belirgin UX sorunu giderildi.
- Changes:
  - **Bug 1 — "Diğer" textbox açılmıyor:**
    - `frontend/src/components/project/DetailTab.tsx:200`
    - `opt === "Diger"` (G ile) → `optNorm === "diger" || "other"` (Türkçe ğ + lowercase normalize)
    - Sebep: AI prompt `"Diğer"` (Türkçe ğ) üretiyor, frontend hiçbir zaman match etmiyordu.
  - **Bug 2 — Task breakdown çok fazla task üretiyor:**
    - `backend/src/main/resources/prompts/task-breakdown.txt` + DB prompt v2
    - Boyut bazlı eşleştirme eklendi (Tiny: 1-2 task ≤8 SP, Small: 2-3 ≤13, Medium: 3-5 ≤21, Large: 5-7 ≤34)
    - Hard cap: 8 task. "Pessimistic on count" direktifi.
    - DB cache backend restart ile temizlenir.
  - **Bug 3 — SP divergence soruları yön-farkındasız:**
    - `frontend/src/components/project/TasksTab.tsx:898`
    - `task.spFinal > task.spSuggestion` (yukarı) vs `<` (aşağı) için ayrı reason set'leri ve ayrı soru metni.
  - **Bug 4 — Refine sonrası eski SP'ler preserve ediliyor:**
    - `backend/src/main/java/com/scopesmith/service/TaskBreakdownService.java:233`
    - Title-match'li task'ta `oldMatch.getSpFinal()` artık preserve edilmiyor.
    - Sebep: refine = scope değişti = yeni estimate beklenir.
    - `backend/src/test/java/com/scopesmith/service/TaskBreakdownServiceTest.java`
      - `assertEquals(5, ...)` → `assertNull(...)` (yeni davranış)
  - **Bug 5 — ROI hesabı görünür değildi:**
    - `frontend/src/components/project/UsageTab.tsx`
    - ROI kartının altına şeffaf formül breakdown eklendi:
      - `analyses × hours × rate = value / cost = multiplier`
    - `frontend/src/api/client.ts` — `roi.hoursPerAnalysis` field type'a eklendi.
  - **Bug 6 — Yararsız bar chart:**
    - `frontend/src/components/project/UsageTab.tsx`
    - "Operasyon Bazlı Dağılım" tablosunun altındaki redundant bar chart kaldırıldı.
    - `getShortLabel()` ve `maxCount` artık kullanılmıyor, temizlendi.
  - **Default rate update (related):**
    - `backend/src/main/java/com/scopesmith/controller/UsageController.java`
    - `hourlyRate` default `25.0 → 10.0` (TR junior baseline). Bkz. ADR-012.
- Verification:
  - `backend`: compile + `TaskBreakdownServiceTest` ✅
  - `frontend`: `tsc`, `eslint`, `vite build` ✅
  - CI: green ✅
- Open items:
  - Bug 1, 2, 3, 4 davranışsal test henüz yapılmadı (gerçek AI çağrısı tetiklemek gerekirdi). Statik kontroller geçti.
- Next actions:
  1. Wide-screen layout problemi (Apr 13'ten kalan açık iş).
