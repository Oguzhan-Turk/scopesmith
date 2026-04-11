# ScopeSmith AI Impact Map

Bu doküman, ScopeSmith özelliklerini "AI katkısı gerçekten nerede değer üretiyor?" sorusuna göre özetler.

## Okuma Rehberi
- **AI Katkı Seviyesi:** Yüksek / Orta / Destekleyici
- **KPI:** Ölçülebilir başarı metriği
- **Fallback:** AI unavailable olduğunda sistemin davranışı
- **Guardrail:** Güvenilirlik/güvenlik sınırı

## 1) Requirement Analysis (Structured Summary + Risk + Affected Modules)
**AI Katkı Seviyesi:** Yüksek  
**Değer:** Belirsiz talebi kısa sürede teknik olarak yapılandırır.  
**KPI:**
- Analiz hazırlama süresi (manual baseline -> ScopeSmith)
- İlk analiz sonrası ek soru sayısı
- Yanlış kapsam nedeniyle yeniden iş oranı
**Fallback:**
- Manuel analiz notu + sabit şablonla ilerleme
**Guardrail:**
- Structured output validation
- Context freshness uyarısı

## 2) Clarification Questions (Q&A üretimi)
**AI Katkı Seviyesi:** Yüksek  
**Değer:** Gereksinim belirsizliğini erken dönemde azaltır.  
**KPI:**
- Açık soru kapanma oranı
- Analiz sonrası ambiguity score düşüşü
**Fallback:**
- PO/BA tarafından manuel soru listesi
**Guardrail:**
- Question status/answer workflow
- İnsan onayı olmadan requirement finalize edilmez

## 3) Task Breakdown + SP Suggestion
**AI Katkı Seviyesi:** Yüksek  
**Değer:** Requirement -> uygulanabilir iş paketleri dönüşümünü hızlandırır.  
**KPI:**
- Task üretim süresi
- SP divergence (AI suggestion vs team final)
- Task kalitesi (acceptance criteria completeness)
**Fallback:**
- Takımın manuel task breakdown süreci
**Guardrail:**
- Prompt standardı (over-splitting önleme)
- Schema + Fibonacci validator

## 4) Task Refinement (Instruction-based)
**AI Katkı Seviyesi:** Yüksek  
**Değer:** Değişen kapsamda backlog’u hızlı revize eder.  
**KPI:**
- Refine sonrası korunabilen task/sync oranı
- Refine turu başına manuel edit sayısı
**Fallback:**
- Manual task edit + yeniden yazım
**Guardrail:**
- previousTaskId izleme
- orphaned issue yönetimi

## 5) Stakeholder Summary
**AI Katkı Seviyesi:** Orta  
**Değer:** Teknik çıktıyı yönetici/PO diline çevirir.  
**KPI:**
- Özet hazırlanma süresi
- Stakeholder review döngü sayısı
**Fallback:**
- Lead developer tarafından manuel özet
**Guardrail:**
- Human review before send/share

## 6) Feature Suggestions
**AI Katkı Seviyesi:** Orta  
**Değer:** Fikir keşfi ve backlog genişletmede hız sağlar.  
**KPI:**
- Öneriden üretime geçen feature oranı
- Discovery toplantısı hazırlık süresi
**Fallback:**
- PM/PO brainstorming
**Guardrail:**
- Scorecard ile filtreleme (etki/risk/maliyet)

## 7) Context Freshness + Partial Refresh Recommendation
**AI Katkı Seviyesi:** Orta  
**Değer:** Tam re-analysis yerine hedefli yenileme kararı verir.  
**KPI:**
- Full refresh yerine partial refresh oranı
- Re-analysis latency düşüşü
**Fallback:**
- Full refresh zorunlu akış
**Guardrail:**
- Freshness/confidence policy
- Job status + history audit

## 8) Sync Policy Gate + Traceability + Service Registry
**AI Katkı Seviyesi:** Destekleyici (AI output'un güvenli teslimi)  
**Değer:** AI çıktısının kurumsal süreçte güvenli ve izlenebilir uygulanması.  
**KPI:**
- Policy violation ile engellenen riskli sync sayısı
- Requirement -> task -> sync trace coverage
- Service-route doğruluk oranı
**Fallback:**
- Manual sync + manuel kontrol
**Guardrail:**
- Provider-aware policy checks
- Task sync refs + audit trail

## Executive Summary (Jury için kısa anlatı)
- ScopeSmith'te AI sadece "metin üretimi" yapmıyor; requirement-to-delivery hattında karar kalitesini artırıyor.
- En yüksek etki: analiz, soru üretimi, task breakdown/refinement.
- Enterprise farkı: AI çıktısı policy gate, traceability, CI smoke ve service routing ile kontrol altına alınıyor.
- Sonuç: daha hızlı SDLC + daha düşük yanlış kapsam riski + denetlenebilir süreç.
