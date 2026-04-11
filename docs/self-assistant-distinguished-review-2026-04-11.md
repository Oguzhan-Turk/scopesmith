# Self-Assistant Capability — Staff + Distinguished Review
**Date:** 2026-04-11  
**Scope:** "ScopeSmith kendi hakkında tutarlı, güvenli ve yetenek-farkında cevap verebilsin."

## Executive Summary
- Fikir ürün açısından güçlü: onboarding friction düşürür, demo etkisini artırır, agent kararlarını daha açıklanabilir yapar.
- Mevcut kod tabanı bu özelliği destekleyecek temel taşlara sahip (prompt/version yönetimi, model tiering, context freshness, service registry, task-sync governance).
- Ancak enterprise-grade rollout için önce üç risk kapatılmalı:
  1. Cross-project insight path'inde tenant/data leakage riski
  2. Code scan pipeline'ında secret redaction eksikliği
  3. "Self-answer" davranışında deterministic policy katmanı yok (LLM-only cevap riski)

## Distinguished Findings (Severity-First)

### 🔴 Critical — Cross-project data leakage risk
**Evidence:**
- `/Users/oguzhanturk/dev/scopesmith/backend/src/main/java/com/scopesmith/repository/AnalysisRepository.java:51`
- `/Users/oguzhanturk/dev/scopesmith/backend/src/main/java/com/scopesmith/service/InsightService.java:259`

**Issue:**
- `findByOtherProjectsAndType` query'si aynı type için diğer projelerin analizlerini getiriyor.
- `buildCrossProjectInsight` proje adı + analiz özeti + etkilenen modül bilgisiyle prompt'a enjekte ediyor.

**Why it matters:**
- Tek tenant değilse veri izolasyonu ihlali.
- Aynı tenant içinde bile "need-to-know" sınırını ihlal edebilir.

**Remediation:**
1. Cross-project insight'ı default kapat (feature flag).
2. Açılacaksa organization boundary + explicit opt-in + anonymization uygula.
3. Prompt'a yalnızca aggregate istatistik ver (raw projectName/summary verme).

---

### 🔴 Critical — Potential secret exfiltration in scan-to-LLM path
**Evidence:**
- `/Users/oguzhanturk/dev/scopesmith/backend/src/main/java/com/scopesmith/service/ProjectContextService.java:41`
- `/Users/oguzhanturk/dev/scopesmith/backend/src/main/java/com/scopesmith/service/ProjectContextService.java:113`
- `/Users/oguzhanturk/dev/scopesmith/backend/src/main/java/com/scopesmith/service/ProjectContextService.java:313`

**Issue:**
- `application.yml/properties`, docker/env benzeri dosyalar okunup LLM input'una ham içerikle gidiyor.
- Gönderim öncesi secret/credential scrub katmanı görünmüyor.

**Why it matters:**
- API key/DB password/internal URL gibi hassas veri model sağlayıcıya taşınabilir.

**Remediation:**
1. Pre-LLM redaction pipeline ekle (regex + entropy + allowlist yaklaşımı).
2. `application.*` dosyaları için default masked extraction (sadece key adı, value hash/placeholder).
3. "scan security audit event" logla: kaç dosya, kaç redaction, hangi rule.

---

### 🟡 Important — Self-assistant için deterministic contract eksik
**Evidence:**
- `/Users/oguzhanturk/dev/scopesmith/backend/src/main/java/com/scopesmith/controller/AiController.java:15`
- `/Users/oguzhanturk/dev/scopesmith/backend/src/main/java/com/scopesmith/controller/TaskController.java:114`

**Issue:**
- "Uygulama kendini anlatsın" davranışı için dedicated endpoint/schema/policy görünmüyor.
- Bugün daha çok task-specific prompt üretimi var, product capability Q&A için ayrı contract yok.

**Impact:**
- Tutarsız cevaplar, hallucination, kullanıcı güveni kaybı.

**Remediation:**
1. `SelfKnowledgeService` + `POST /api/v1/assistant/self-help` endpointi tanımla.
2. Structured response zorunlu yap:
   - `answer`
   - `confidence`
   - `evidence[]` (hangi doküman/policy)
   - `actions[]` (UI yönlendirme)
3. Confidence düşükse fallback: "deterministic help card + relevant docs link".

---

### 🟡 Important — Credentials API key governance hardening
**Evidence:**
- `/Users/oguzhanturk/dev/scopesmith/backend/src/main/java/com/scopesmith/controller/SettingsController.java:27`

**Issue:**
- Admin endpoint olsa da key isimleri için strict allowlist yok.

**Remediation:**
- `AllowedCredentialKeys` enum/registry ile sınırla.
- Unknown key -> reject + audit log.

---

### 🟢 Suggestion — Prompt governance is strong but needs policy overlays
**Evidence:**
- `/Users/oguzhanturk/dev/scopesmith/backend/src/main/java/com/scopesmith/controller/PromptController.java`
- `/Users/oguzhanturk/dev/scopesmith/backend/src/main/java/com/scopesmith/config/PromptLoader.java`

**Suggestion:**
- Prompt versioning mevcut; self-assistant için ek olarak:
  - prompt change approval workflow
  - eval gates (golden questions)
  - rollback preset

## Recommended Target Architecture (Self-Aware Product Assistant)

### 1. Capability Registry (source of truth)
- Static+dynamic birleşimi:
  - Static: feature metadata (name, status, prerequisite, owner, docsRef)
  - Dynamic: flags (`MANAGED_AGENT_ENABLED`), integration readiness (Jira/GitHub), project context freshness
- Cevaplar bu registry'den beslenir, LLM sadece "narration/composition" yapar.

### 2. Policy Answer Layer (deterministic first)
- Kullanıcı sorusu önce intent classifier'a gider:
  - "Nasıl yaparım?" -> deterministic steps
  - "Bu feature açık mı?" -> runtime state check
  - "Neden ScopeSmith?" -> positioning template + evidence
- LLM çıktısı policy validator'dan geçmeden UI'ya gitmez.

### 3. Evidence-based response contract
- Her cevapta minimum 1 evidence zorunlu:
  - ADR / runbook / endpoint capability / feature flag durumu
- Evidence yoksa fallback cevabı dön.

### 4. Human override + telemetry
- "Bu cevap faydalı mı?" feedback
- metrics:
  - answer_acceptance_rate
  - fallback_rate
  - wrong_action_rate
  - escalation_rate

## Options (Trade-offs)

### Option A — Fast MVP (1-2 gün)
- Docs + ADR retrieval + deterministic templates
- Artı: hızlı demo etkisi
- Eksi: derin proje-özel diyalog sınırlı

### Option B — Recommended (3-5 gün)
- Capability Registry + Policy Answer Layer + confidence fallback
- Artı: enterprise anlatısına en uygun; güvenilirlik yüksek
- Eksi: orta seviye implementation effort

### Option C — Full Agentic Self-Assistant (1-2 hafta)
- Multi-step planning + tool calling + memory
- Artı: güçlü ürün vizyonu
- Eksi: operasyonel risk/maliyet/test yükü yüksek

## What Makes ScopeSmith Defensible vs Local Coding Agents
1. Governance by design (policy gates, audit trail, SoR alignment)
2. Task dispatch intelligence (Jira/GitHub traceability + sync policy)
3. Context freshness and partial refresh control
4. Workspace Services readiness (multi-service ownership clarity)
5. Enterprise fallback discipline (AI down/low-confidence still operable)

## Proposed Next Steps
1. Critical security fixes (cross-project leak + redaction gate) first.
2. Option B için minimal vertical slice:
   - capability registry table/json
   - self-help endpoint + structured schema
   - frontend "ScopeSmith Assistant" panel (docs-backed)
3. 20 golden question eval set oluştur (TR/EN karışık gerçek sorular).
4. Demo script'e "trusted answer + evidence + fallback" akışını ekle.
