# Prompt & Script Audit — 2026-04-11

Kapsam:
- `backend/src/main/resources/prompts/*`
- Prompt yönetim katmanı (`PromptLoader`, `PromptSeeder`, `PromptController`)
- Operasyon scriptleri (`Jenkinsfile`, `bitbucket-pipelines.yml`, `frontend/e2e/smoke.spec.ts`)

## 🔴 Critical

### 1) Prompt schema drift riski (analysis refine)
- **Bulgu:** `analysis-refine` promptu soru şemasını eski formatta tanımlıyordu.
- **Risk:** `AnalysisResult.QuestionItem` (`question/suggestedAnswer/type/options`) ile uyumsuz çıktı.
- **Aksiyon:** Düzeltildi.
- **Dosya:** `backend/src/main/resources/prompts/analysis-refine.txt`

### 2) Bug analysis'te kritik alan boş kalma riski
- **Bulgu:** `bug-analysis` promptunda `structuredSummary` zorunluluğu net değildi.
- **Risk:** Akışta özetin boş/kalitesiz gelmesi.
- **Aksiyon:** Zorunlu 2-3 cümlelik özet kuralı eklendi.
- **Dosya:** `backend/src/main/resources/prompts/bug-analysis.txt`

## 🟡 Important

### 3) Prompt seed kapsamı eksikti
- **Bulgu:** Bazı aktif promptlar DB seed listesinde yoktu (`analysis-refine`, `task-breakdown-bug`, `sp-suggestion`, `document-summary`, `feature-suggestion`).
- **Risk:** Runtime prompt yönetimi/listeme sürpriz davranış.
- **Aksiyon:** Seed listesi genişletildi.
- **Dosya:** `backend/src/main/java/com/scopesmith/config/PromptSeeder.java`

### 4) Prompt içeriklerine read erişimi genişti
- **Bulgu:** Prompt `GET` endpointleri admin guard olmadan açıktı.
- **Risk:** İç prompt stratejilerinin gereksiz görünürlüğü.
- **Aksiyon:** `listAll` ve `getByName` admin role ile sınırlandı.
- **Dosya:** `backend/src/main/java/com/scopesmith/controller/PromptController.java`

## 🟢 Suggestion

### 5) Smoke test DB seed yaklaşımı
- **Durum:** `frontend/e2e/smoke.spec.ts` içinde `FAILED` timeline doğrulaması için DB insert var.
- **Not:** Deterministik test açısından doğru. Uzun vadede test fixture helper modülüne taşınabilir.

### 6) CI scriptlerinde secret yönetimi
- **Durum:** Test amaçlı `dummy` API key kullanımı kontrollü.
- **Not:** Prod CI'da gerçek secretlar yalnızca CI secret store üzerinden inject edilmeli (dosya içinde değil).

## Dil Stratejisi Kontrolü
- Promptlar: İngilizce sistem talimatı + Türkçe human-readable output yaklaşımı korunuyor.
- Teknik terimler / enum / JSON fields: İngilizce tutuluyor.
- Sonuç: ADR-004 ile uyumlu.

## Sonuç
- Kritik uyumsuzluklar kapatıldı.
- Prompt yönetimi daha güvenli ve tutarlı hale geldi.
- Script tarafında acil bloklayıcı güvenlik açığı bulunmadı.

---

## Phase-2 Full Prompt Hardening (same day)
İlk turdan sonra kalan promptların tamamı da "gold standard" seviyesine hizalandı:
- Output schema kontratları netleştirildi (Analysis/ChangeImpact/Task/ProjectContext)
- Dil stratejisi ve teknik-terim kuralı tüm promptlarda tutarlı hale getirildi
- "No hallucination / belirsizlikte açıkça belirt" kuralları eklendi
- Feature/SP/summary promptlarında kalite sınırları güçlendirildi

Bu aşamada güncellenen promptlar:
- `requirement-analysis.txt`
- `bug-analysis.txt`
- `analysis-refine.txt`
- `change-impact.txt`
- `document-summary.txt`
- `feature-suggestion.txt`
- `project-context.txt`
- `project-context-structured.txt`
- `sp-suggestion.txt`
- `stakeholder-summary.txt`
- `stakeholder-summary-refine.txt`
- `task-breakdown.txt`
- `task-breakdown-refine.txt`
- `task-breakdown-bug.txt`
