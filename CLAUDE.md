# ScopeSmith

AI-powered requirement analysis: Ham talep → yapılandırılmış analiz → task breakdown → SP önerisi → yönetici özeti.

## Tech Stack
- **Backend:** Spring Boot 3.5.3, Java 21, Spring AI 1.1.4 (Anthropic), Spring Data JPA, Spring Security
- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS v4, shadcn/ui
- **Database:** PostgreSQL 17 (Docker), JSONB desteği
- **AI:** Claude API (Haiku/Sonnet/Opus — 3-tier ModelTier: LIGHT/STANDARD/PREMIUM)

## Mimari
```
Controller → Service → Repository → Entity (Layered)
```
- **AI çağrıları transaction dışında** (15-30 sn, DB bağlantısı tutulmaz)
- **AiService interface** — provider-agnostic (Spring AI üzerinden)
- **PromptLoader** — DB-first, classpath-fallback (runtime düzenlenebilir)
- **BeanOutputConverter** — Spring AI JSON schema structured output
- **Multi-tenancy Seviye 1:** Organization entity, `app_users` ve `projects` tablosunda `organization_id` FK. Proje oluşturma otomatik org atar
- **Organizational Memory:** pgvector (`pgvector/pgvector:pg17` Docker image), `requirement_embeddings` tablosu, OpenAI text-embedding-3-small (1536 dim). `OPENAI_API_KEY` yoksa graceful degrade (embedding skip edilir)
- **Managed Agent (altyapı hazır, UX askıda):** Feature flag (`MANAGED_AGENT_ENABLED=false` default). `ManagedAgentService` interface → `CliAgentService`. Backend endpoint'leri var, frontend tetikleme butonu yok (ADR-007). Entity: `agentSessionId/agentStatus/agentBranch`

## Çalıştırma
```bash
docker compose up -d                    # PostgreSQL
cd backend && ANTHROPIC_API_KEY=$(grep '^ANTHROPIC_API_KEY' ../.env | cut -d= -f2) ./mvnw spring-boot:run
cd frontend && npm install && npm run dev
```
Backend: http://localhost:8080 | Frontend: http://localhost:5173 | Users: admin/admin123, user/user123

## Kritik Kurallar
- `toLowerCase()` → **mutlaka** `Locale.ENGLISH` (Türkçe locale bug: LIGHT → lıght)
- Prompt'lar İngilizce, AI çıktısı Türkçe (ADR-004)
- **Flyway migration:** `ddl-auto: validate`, schema `db/migration/V*.sql` ile yönetilir. Yeni tablo/kolon → yeni migration dosyası
- Credential'lar DB'de AES şifreli, frontend'e masked
- `usage_records.operation_type` check constraint'i yeni OperationType'ta migration ile güncelle
- Upload URL: `uploadDocument` API_BASE kullanır (`/api/v1/...` değil)
- Backend başlatma: `grep '^ANTHROPIC_API_KEY'` kullan (`cat .env | cut -d= -f2` hatalı)

## Backend Servisleri
| Servis | Sorumluluk |
|---|---|
| RequirementAnalysisService | Talep analizi, soru üretimi, refine |
| TaskBreakdownService | Task üretimi, SP tahmini, Learning SP, refine |
| StakeholderSummaryService | Yönetici özeti üretimi/iyileştirme |
| ProjectContextService | Kod tarama (local/git), CLAUDE.md okuma |
| CodeIntelligenceService | Token'sız kod analizi (regex + JGit) |
| DocumentService | Belge yönetimi, AI özet (LIGHT tier) |
| ClaudeCodeService | Task'tan Claude Code prompt üretimi |
| FeatureSuggestionService | AI ile feature önerisi |
| UsageTrackingService | Token/maliyet takibi, ROI hesaplama |

## Frontend
- **Sayfalar:** Dashboard, ProjectDetail (6 tab), Settings (admin), Login
- **ProjectDetail tabs:** Talepler, Talep Detay, Task'lar, Bağlam, Proje Ayarları (admin), Kullanım (admin)
- **Component split:** ProjectDetail.tsx orchestrator, tab components `components/project/` altında
- **Design tokens:** Semantic renk sistemi (CSS var) + typography + spacing — light/dark mode
- **Stale guard:** `loadIdRef` ile eski response'lar ignore edilir

## Bilinen Davranışlar
- **Re-analiz soru üretmez:** Son soru cevaplanınca re-analiz `questions: []` döner (sonsuz döngü önlemi)
- **AI validation:** `AiResultValidationService` — SP fibonacci'ye düzeltilir, modules doğrulanır, sorular dedup'lanır
- **Enum fallback:** `@JsonCreator` ile AI geçersiz değer → fallback + WARN log
- **Structured context injection:** modules/entities/endpoints tüm AI çağrılarına enjekte (StructuredContextFormatter)
- **Dependency parsing:** Build file parse (Maven/npm/Gradle/Python/Go), token harcanmaz
- **Module dependency graph:** Import-based (dependsOn/consumedBy), token harcanmaz
- **SP refetch yok:** `task.spSuggestion` doluysa API çağrılmaz, tab geçişlerinde kaybolmaz

## Entegrasyonlar
- **Jira Cloud:** Issue oluşturma, CSV export, durum doğrulama, yetim issue kapatma
- **GitHub Issues:** Issue oluşturma, label yönetimi, durum doğrulama, yetim issue kapatma
- **Claude Code:** Task'tan implementasyon prompt'u üretme

## Prompt Dosyaları
`backend/src/main/resources/prompts/` — requirement-analysis, bug-analysis, analysis-refine, task-breakdown, task-breakdown-refine, sp-suggestion, stakeholder-summary, stakeholder-summary-refine, project-context, project-context-structured, document-summary, feature-suggestion, change-impact

## Sonraki Adımlar
1. Cross-cutting intelligence (geçmiş analizler, benzer tasklar) + prompt caching/retry
2. Uçtan uca test (talep → belge → analiz → task → sync)
3. Prompt iteration (gerçek verilerle)
4. Pre-submission review + sunum hazırlığı

## Çalışma Kuralları
- Kaynak: dosya (CLAUDE.md + docs/), konuşma değil
- Agent handoff kaydı: `docs/ai-handoff.md` (her oturum sonunda standart formatla append)
- Türkçe sohbet, İngilizce kod/terim. Her zaman "neden" açıklanır
- Büyük kararlar → docs/decisions.md
- Demo notu: ScopeSmith kendi kodunu taradı (meta-demo)
