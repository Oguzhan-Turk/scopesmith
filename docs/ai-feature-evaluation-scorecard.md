# AI Feature Evaluation Scorecard (Staff Engineer Lens)

Amaç: "AI kullandık" demek yerine "ölçülebilir SDLC değeri ürettik" demek.

## Her feature için cevaplanacak 5 soru
1. Hangi SDLC metriğini iyileştiriyor?
   - lead time, defect rate, review cycle time, MTTR, rework rate
2. AI yoksa fallback ne?
   - feature tamamen durmamalı; degrade mod tanımlı olmalı
3. Güvenilirlik sınırı ne?
   - output validation, policy gate, human-in-the-loop checkpoint
4. Maliyet kontrolü nasıl?
   - model tier, token budget, cache/retry stratejisi
5. Başarı nasıl ölçülüyor?
   - release sonrası KPI hedefi + ölçüm yöntemi

## Skor Tablosu (0-3)
- Business impact clarity
- Technical feasibility
- Reliability/safety
- Cost governance
- Operability/observability
- Adoption readiness

Toplam (18 üzerinden):
- 14-18: yatırım yapılır (P1)
- 9-13: deneysel/P2
- 0-8: backlog, yeniden tasarla

## Minimum Engineering Checklist
- Prompt sürümlenmiş mi?
- Başarılı çıktı tanımı açık mı?
- Invalid/unsafe output kontrolü var mı?
- Fallback akışı var mı?
- Temel telemetri var mı? (latency, tokens, fail rate, acceptance)
- Test planı var mı? (unit + integration + smoke)

## Çıktı Şablonu (kısa)
- Feature:
- Problem:
- AI contribution:
- Non-AI fallback:
- Risks:
- KPIs (baseline -> target):
- Rollout plan:
- Kill switch / feature flag:
