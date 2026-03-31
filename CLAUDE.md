# ScopeSmith

AI-powered requirement analysis platform. Ham talep → yapılandırılmış analiz → task breakdown → SP önerisi → yönetici özeti.

## Çalıştırma

```bash
# PostgreSQL
docker compose up -d

# Backend (Java 21 gerekli)
cd backend
ANTHROPIC_API_KEY=<key> ./mvnw spring-boot:run

# Frontend
cd frontend
npm install && npm run dev
```

- Backend: http://localhost:8080
- Frontend: http://localhost:5173
- Varsayılan kullanıcılar: admin/admin123, user/user123

## Tech Stack

- **Backend:** Spring Boot 3.5.3, Java 21, Spring AI 1.1.4 (Anthropic), Spring Data JPA, Spring Security
- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS v4, shadcn/ui
- **Database:** PostgreSQL 17 (Docker), JSONB desteği
- **AI:** Claude API (Haiku/Sonnet/Opus — 3-tier model sistemi)

## Mimari

Layered architecture: Controller → Service → Repository → Entity

- **AI çağrıları transaction dışında** yapılır (15-30 sn sürebilir, DB bağlantısı tutulmaz)
- **AiService interface** ile provider-agnostic tasarım (Spring AI üzerinden)
- **PromptLoader** — DB-first, classpath-fallback prompt yönetimi (runtime düzenlenebilir)
- **ModelTier** (LIGHT/STANDARD/PREMIUM) — her OperationType için varsayılan tier, per-request override

## Önemli Kurallar

- Prompt'lar İngilizce yazılır, AI çıktısı Türkçe üretilir (ADR-004)
- `toLowerCase()` kullanırken **mutlaka** `Locale.ENGLISH` ver (Türkçe locale bug: LIGHT → lıght)
- Entity değişikliklerinde `ddl-auto: update` kullanılıyor, migration yok
- Credential'lar DB'de AES şifreli saklanır, frontend'e maskelenmiş gönderilir
- `usage_records` tablosundaki `operation_type` check constraint'i yeni OperationType eklendiğinde manuel güncellenmeli

## Modül Yapısı

### Backend Servisleri
| Servis | Sorumluluk |
|---|---|
| RequirementAnalysisService | AI ile talep analizi, soru üretimi, refine |
| TaskBreakdownService | Task üretimi, SP tahmini, Learning SP, refine |
| StakeholderSummaryService | Yönetici özeti üretimi ve iyileştirme |
| ProjectContextService | Kod tarama (local/git), CLAUDE.md okuma |
| CodeIntelligenceService | Token'sız kod analizi (regex parser + JGit) |
| DocumentService | Belge yönetimi, AI özet (LIGHT tier) |
| ClaudeCodeService | Task'tan Claude Code prompt üretimi |
| FeatureSuggestionService | AI ile feature önerisi |
| UsageTrackingService | Token/maliyet takibi, dinamik fiyatlandırma |

### Frontend Sayfaları
| Sayfa | İçerik |
|---|---|
| Dashboard | Proje listesi, yeni proje oluşturma |
| ProjectDetail | 6 tab: Talepler, Talep Detay, Task'lar, Context, Entegrasyonlar, Kullanım |
| Settings | Global credential + prompt yönetimi (admin) |
| Login | Split-panel giriş ekranı |

## Entegrasyonlar

- **Jira Cloud:** Issue oluşturma, CSV export, durum doğrulama, yetim issue kapatma
- **GitHub Issues:** Issue oluşturma, label yönetimi, durum doğrulama, yetim issue kapatma
- **Claude Code:** Task'tan implementasyon prompt'u üretme

## Prompt Dosyaları

`backend/src/main/resources/prompts/` altında:
- requirement-analysis.txt, bug-analysis.txt, analysis-refine.txt
- task-breakdown.txt, task-breakdown-refine.txt, sp-suggestion.txt
- stakeholder-summary.txt, stakeholder-summary-refine.txt
- project-context.txt, project-context-structured.txt
- document-summary.txt, feature-suggestion.txt, change-impact.txt
