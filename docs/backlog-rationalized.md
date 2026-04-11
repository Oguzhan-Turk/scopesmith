# Rationalized Backlog (Merge / Keep / Drop)

Bu liste, mevcut notlar (`docs/ai-handoff.md`, `docs/decisions.md`) ve yeni standartlar
(`agentic-task-slicing-standard`, `ai-feature-evaluation-scorecard`) ile yeniden düzenlendi.

## Karar Prensibi
- Task değil, **outcome** yönetiyoruz.
- Her başlık tek başına demo edilebilir ve KPI'ya bağlanabilir olmalı.
- 1 saatlik mikro iş başlıkları ayrı backlog maddesi olmamalı.

## KEEP (Yapılacak, yüksek etki)

### K1) AI Governance v2 (Model Catalog + Operation Routing)
**Neden kalıyor:** AI davranışının öngörülebilirliği ve maliyet kontrolü için kritik.  
**Kapsam:**
- Tier-based yapıdan model catalog yaklaşımına geçiş
- Operation-level default model routing (`analysis`, `task-breakdown`, `refine`, vb.)
- Model seçimi değişimlerinin audit izi
**Başarı metriği:**
- En az 3 operation tipi runtime model değiştirilebilir
- Deploy etmeden model/routing değişimi yapılabilir

### K2) Incremental Analysis v2 (Impact Precision + Throughput)
**Neden kalıyor:** Büyük context'te kalite dalgalanmasını azaltır, re-analysis maliyetini düşürür.  
**Kapsam:**
- Heuristik impact mapping'i structured-context/AST destekli hale getirme
- Partial refresh worker concurrency policy (per-project limit)
- Partial refresh SLO görünürlüğü (latency, success rate)
**Başarı metriği:**
- "Neden stale?" açıklaması modül seviyesinde daha tutarlı
- Refresh lead time ve fail rate trendi izlenebilir

### K3) Task Quality Metrics Pipeline (Workstream C)
**Neden kalıyor:** AI çıktısını ölçmeden iyileştirme döngüsü kurulamaz.  
**Kapsam:**
- `ambiguity_score`, `acceptance_criteria_completeness`, `duplication_ratio`, `sp_divergence`
- Generation sonrası otomatik kalite skoru
- Project bazlı trend kartı
**Başarı metriği:**
- Her task generation sonucu kalite skoru var
- En az 2 sprint trend kıyası yapılabiliyor

### K4) Security Hardening Finalization
**Neden kalıyor:** Enterprise değerlendirmede kritik risk alanı.  
**Kapsam:**
- CSRF defense-in-depth kararı ve uygulaması
- Security header/hardening checklist final turu
**Başarı metriği:**
- Security checklist "must-have" maddeleri kapalı
- Regression test setinde security akışları korunuyor

## MERGE (Birleştir, mikro işleri erit)

### M1) "Observability + Audit UI" tek epic altında birleştir
**Birleşecek eski maddeler:**
- partial refresh timeline detail modal
- history pagination/metadata iyileştirmeleri
- correlation/retry UX kırıntıları
**Yeni tek outcome:**  
"Operasyon ekibi tek ekrandan partial refresh geçmişini, hata nedenini ve etkiyi okuyabiliyor."

### M2) "Delivery Platform Compatibility" tek epic altında birleştir
**Birleşecek eski maddeler:**
- GitHub/Bitbucket/Jenkins/OpenShift uyum notları
- pipeline varyantları
- branch protection/runbook kırıntıları
**Yeni tek outcome:**  
"ScopeSmith quality gate, şirketin CI/CD platformundan bağımsız çalışıyor."

### M3) "Service Registry Maturity" tek epic altında birleştir
**Birleşecek eski maddeler:**
- service scan helper teknik borç
- bulk service assign backend endpoint ihtiyacı
- service scan operability iyileştirmeleri
**Yeni tek outcome:**  
"Multi-service projede service context ve task ownership akışı stabil ve ölçeklenebilir."

## DROP / DEFER (Şimdilik çıkar veya ertele)

### D1) Managed Agent UX genişletmesi (ADR-007)
**Karar:** Şimdilik defer.  
**Gerekçe:** Yarışma sonrası ürün/operasyon kararı gerektiriyor; bu hafta sonu kritik yol değil.

### D2) "Branch protection automation" platforma özel uğraşlar
**Karar:** Şimdilik defer.  
**Gerekçe:** Plan/visibility izinlerine bağlı; demo değerine doğrudan katkısı sınırlı.

### D3) Mikro refactor backlog (tekil küçük teknik temizlikler)
**Karar:** Büyük epic içine yedir, ayrı backlog maddesi açma.  
**Gerekçe:** Over-splitting maliyeti yüksek, ilerlemeyi görünürde artırıp gerçek etki üretmiyor.

### D4) ScopeSmith Native Work Mode (Jira'sız SoR)
**Karar:** Uzun vade stratejik opsiyon olarak defer (şu an kapsam dışı).  
**Gerekçe:** Mevcut ürün pozisyonu control-tower modeli. Native SoR modu ayrı bir ürün modu olarak ele alınmalı; workflow/audit/permission/reporting katmanlarında ek olgunluk gerektiriyor.

## Önerilen Sıralama (Staff-Level)
1. K4 Security Hardening Finalization
2. K1 AI Governance v2
3. K3 Task Quality Metrics Pipeline
4. K2 Incremental Analysis v2
5. M1 + M3 (ops/scale polish)
6. D1/D2 yalnızca ihtiyaç tetiklenirse

## 1 Haftalık Uygulama Paketi (gerçekçi)
- Paket A: K4 + K1 (risk ve governance kapatılır)
- Paket B: K3 (ölçüm altyapısı)
- Paket C: K2'nin minimum precision iyileştirmesi + M1 görünürlük

Bu paketleme ile "çok iş yaptık" yerine "yüksek etkili, ölçülebilir çıktılar verdik" hikayesi korunur.
