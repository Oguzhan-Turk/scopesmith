# Vector DB, Learning Quality, and 6-Month Economics Assessment

Bu doküman #9 ve #10 maddeleri için net değerlendirme ve aksiyon planıdır.

## 1) Mevcut Durum Özeti

### Vector / Similarity
- `pgvector` aktif (`V4__pgvector_embeddings.sql`)
- Embedding modeli: `text-embedding-3-small` (1536 dim)
- Requirement seviyesinde embedding tutuluyor (`requirement_embeddings`)
- Similarity sorgusu proje-scope'lu çalışıyor (`project_id` filtresi)
- Insight katmanında semantic benzerlik prompt'a enjekte ediliyor

### Learning
- SP öğrenme katmanı mevcut:
  - historical `spSuggestion` vs `spFinal` kalibrasyonu
  - geçmiş task referansları prompt içine giriyor
- Semantic benzer taleplerle "organizational memory" aktif

### Economics
- Usage tracking var:
  - token, cost, duration, operation breakdown
- UI'da usage/ROI görünürlüğü var
- Model tier yönetimi var (LIGHT/STANDARD/PREMIUM)

## 2) Bu Turda Yapılan Kalite Düzeltmesi

### Embedding similarity query duplikasyon düzeltmesi
- Sorun: Benzerlik sorgusunda `analyses` tablosuna doğrudan join, requirement başına çok analiz varsa duplicate satır üretebilirdi.
- Düzeltme: Sorgu latest analysis'e `LATERAL` ile indirildi (tek satır).
- Dosya:
  - `backend/src/main/java/com/scopesmith/service/EmbeddingService.java`
- Etki:
  - Daha temiz similarity sonuçları
  - Semantic memory kalitesinde tutarlılık artışı

## 3) #9 Sorusuna Net Cevap — "Öğreniyor muyuz?"

Kısa cevap: **Evet, kısmen öğreniyor.**
- Şu an:
  - geçmiş task kararlarından kalibrasyon
  - embedding tabanlı benzer requirement referansı
- Eksik olan:
  - model bazlı otomatik kalite feedback loop
  - düzenli eval seti ile drift ölçümü
  - similarity precision/recall metriği

## 4) #10 Sorusuna Net Cevap — "6 ay sonra ekonomik mi?"

Kısa cevap: **Doğru governance ile evet.**
- Güçlü taraf:
  - Tiered model stratejisi var
  - Cost/usage tracking var
  - Operation-level maliyet görünürlüğü var
- Risk:
  - Prompt büyümesi + context genişlemesi token maliyetini artırabilir
  - Agentic execution kontrolsüz açılırsa maliyet sıçrar

## 5) 6 Aylık Sürdürülebilirlik İçin Net Aksiyonlar

1. **Cost Guardrail**
- Operation başına aylık budget threshold
- Anomali alarmı (cost/analysis spike)

2. **Quality Guardrail**
- Haftalık eval seti (10-20 requirement)
- SP divergence ve acceptance completeness trend alarmı

3. **Vector Quality Guardrail**
- Similarity hit quality örneklemi (manuel spot-check)
- Threshold tuning (`0.75`) ve `MAX_SIMILAR` optimizasyonu

4. **Context Budget Discipline**
- Prompt context token budget ceiling
- Gereksiz long context parçalarını otomatik kırpma

## 6) Sonuç

- Sistem "öğrenme" ve "ekonomik görünürlük" açısından iyi temele sahip.
- Bu turda similarity kalitesini etkileyen kritik duplikasyon riski kapatıldı.
- 6 ay değeri için eksik olan parça teknoloji değil, düzenli governance/eval ritmi.
