# ScopeSmith

AI-powered requirement analysis platform. Ham talep → yapılandırılmış analiz → task breakdown → SP önerisi → yönetici özeti.

**Slogan:** "Requirements hatasının production'da düzeltme maliyeti, geliştirme aşamasına göre 100 kata kadar artabilir. ScopeSmith bu hatayı kaynağında yakalar."

## Son Güncelleme: 1 Nisan 2026 — Session 12

## Mevcut Durum
- [x] Tanışma ve çalışma kuralları belirlendi
- [x] Proje fikri kesinleşti (Atmosware AI Challenge)
- [x] Detaylı plan yazıldı ve review edildi
- [x] Distinguished Engineer review yapıldı, stratejik riskler not edildi
- [x] GitHub repo açıldı (private): https://github.com/Oguzhan-Turk/scopesmith
- [x] Proje scaffolding tamamlandı ve push edildi
- [x] PostgreSQL Docker'da çalışıyor (port 5432)
- [x] Entity'ler + Repository'ler yazıldı ve DB tabloları oluştu
- [x] Spring Boot ayakta, health check OK
- [x] Claude API key alındı, bağlantı test edildi: "ScopeSmith AI is ready!"
- [x] Spring AI entegrasyonu (AiService interface + SpringAiService)
- [x] Feature A: Requirement Analysis çalışıyor
- [x] Feature A+: Soru-cevap → re-analiz döngüsü çalışıyor
- [x] Feature B: Task breakdown + SP önerisi + bağımlılık zinciri çalışıyor
- [x] Learning SP sistemi kararlaştırıldı (ADR-003)
- [x] Learning SP implementasyonu (Layer 1 + Layer 3)
- [x] Feature D: Stakeholder Summary (eski adı PO Summary)
- [x] Feature E: Project Context — local folder scan çalışıyor
- [x] Feature C: Change Impact Analysis
- [x] Feature F: Document Management
- [x] Staff Engineer + Distinguished review yapıldı, bulgular düzeltildi
- [x] Prompt'lar resources/prompts/*.txt'e taşındı (PromptLoader)
- [x] Transaction yönetimi düzeltildi (AI çağrısı tx dışında)
- [x] AI error handling eklendi (503 Service Unavailable)
- [x] Tüm prompt'lara Türkçe çıktı talimatı eklendi (ADR-004)
- [x] Structured project context (JSONB) eklendi — düz metin + yapılandırılmış veri
- [x] ADR-004, 005, 006, 007, 008 yazıldı
- [x] Frontend v1 — Dashboard + Proje detay (4 sekmeli) + shadcn/ui
- [x] Uçtan uca test — tüm akış UI'dan çalıştırıldı
- [x] Frontend milestone review bulguları belirlendi (9 madde) — 9/9 çözüldü
- [x] Staff Engineer + Distinguished review yapıldı (Session 4), 11 bulgu düzeltildi
- [x] Jira CSV Export + Jira Cloud API entegrasyonu (10/10 başarılı)
- [x] Bug support — RequirementType (FEATURE/BUG), bug-analysis prompt
- [x] GitHub Issues entegrasyonu — label'lar, markdown body (5/5 başarılı)
- [x] Per-project integration config (JSONB)
- [x] SP final decision UI — Fibonacci butonları task kartlarında
- [x] Project Intelligence Insights (Layer 3) — staleness, pattern detection, cross-project learning
- [x] Usage tracking + ROI dashboard — token/maliyet takibi, ROI çarpanı hesaplama
- [x] Git ile proje ekleme (git clone --depth 1 + scan)
- [x] Prompt DB + düzenleme ekranı (Ayarlar sayfası)
- [x] Credential yönetim ekranı (DB storage, AES şifreli, masked display)
- [x] Yetki sistemi (Spring Security, admin/user, session-based)
- [x] UI polish — violet brand theme, dark mode, login split-panel
- [x] Senior UX/UI Architect review (Opus) — 12 bulgu, UX Batch 1-3 + Round 2-3
- [x] Multi-Model AI (5 phase) — ModelTier, belge entity + AI özet, model seçim UI, maliyet şeffaflığı
- [x] Session 10 — 11 özellik (5 phase): soru önerileri, analiz refine, feature önerisi, CodeIntelligenceService, bidirectional sync, Claude Code prompt export
- [x] Session 11 — Production Review + Enterprise UX: component split, 15 bulgu düzeltildi, Enterprise UI Overhaul (semantic tokens, typography, spacing)
- [x] Session 12 — Bug fix + UX polish: Açık Noktalar toggle, belge upload fix, re-analiz sonsuz döngü fix, SP refetch fix
- [x] Session 13 — AI Pipeline Mühendisliği (4 phase):
  - Phase 1: Spring AI BeanOutputConverter migration (extractJson kaldırıldı, 6 DTO @JsonPropertyOrder)
  - Phase 2: 5 enum (@JsonCreator fallback): RiskLevel, TaskCategory, FeatureCategory, Complexity, QuestionType
  - Phase 3: Validation layer (9 yeni dosya): FibonacciUtil, 6 validator, AiResultValidationService, ValidationContext
  - Phase 4: Cross-analysis question deduplication (QuestionDeduplicationService)
  - Frontend dialog split: 5 dialog component extracted from ProjectDetail (1300→1009 satır)
- [x] Session 13 (devam) — Context Zenginleştirme (3 phase):
  - Phase A: Structured Context Injection — structuredContext artık downstream AI çağrılarına enjekte ediliyor (modules, entities, endpoints, tech stack)
  - Phase B: DependencyParsingService — pom.xml, package.json, build.gradle, requirements.txt, go.mod parser (token-free)
  - Phase C: Enhanced Module Intelligence — import-based module dependency graph, ModuleMetrics, cross-module tracking (token-free)
- [ ] AI Pipeline Mühendisliği — Cross-cutting intelligence (geçmiş analizler, benzer tasklar)
- [ ] AI Pipeline Mühendisliği — Prompt caching + retry
- [ ] Uçtan uca test (tüm akış: talep → belge → analiz → task → sync)
- [ ] Prompt iteration (gerçek verilerle)

## Çalıştırma

```bash
# PostgreSQL
docker compose up -d

# Backend (Java 21 gerekli — sdkman: source ~/.sdkman/bin/sdkman-init.sh)
cd backend
ANTHROPIC_API_KEY=$(grep '^ANTHROPIC_API_KEY' ../.env | cut -d= -f2) ./mvnw spring-boot:run

# Frontend
cd frontend
npm install && npm run dev
```

- Backend: http://localhost:8080
- Frontend: http://localhost:5173
- Varsayılan kullanıcılar: admin/admin123, user/user123
- Port 5432'de eski tiktak projesi olabilir, `docker stop` ile durdurulabilir

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

## Alınan Kararlar ve Nedenleri
| Karar | Neden |
|---|---|
| Spring Boot 3.5.3 + Java 21 + React 18 (Vite/TS) + Tailwind + PostgreSQL 17 | En iyi bilinen stack, LTS Java, enterprise standard |
| Claude API | Zaten Claude Code ekosistemindeyiz, reasoning'de güçlü |
| Spring AI > Anthropic SDK | Structured output, DIP, provider-agnostic. ADR-002 |
| Project context: local folder + remote git | Kurumsal ortamda erişim kısıtlı olabilir, her iki yol da desteklenmeli |
| AI SP önerisi (deterministik sorular değil) | Bağlamsal AI önerisi daha değerli |
| Learning SP sistemi (3 katman) | Takım kalibrasyonu + benzer task referansı (MVP), pattern tespiti (post-MVP). ADR-003 |
| Role-agnostic tasarım | "Talebi alan kim olursa olsun" yaklaşımı |
| Prompt engineering = geliştirme süresinin %50'si | Ürünün değeri prompt kalitesine bağlı |
| Dil: prompt İngilizce, çıktı Türkçe | Claude İngilizce'de daha tutarlı, kullanıcılar Türkçe çalışıyor. ADR-004 |
| Jira export: CSV, JSON değil | CSV her Jira sürümüyle uyumlu (Server, DC, Cloud) |
| Context staleness detection (3 katman) | Zaman bazlı (MVP), git diff (MVP+), AI tutarsızlık tespiti (ileride). ADR-007 |
| Multi-Model AI (3 tier) | Haiku basit işler, Sonnet standart, Opus kritik — maliyet 12x tasarruf |
| Model seçimi admin-only | Kalite kontrolü admin'de, user sadece badge görür |
| Belge özeti LIGHT tier ile | Upload'da 1 kerelik özet, analizlerde özet kullan — token tasarrufu |
| Belge proje + talep bazlı | Nullable requirement FK — null=proje geneli, dolu=talebe özel |

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
| ProjectDetail | 6 tab: Talepler, Talep Detay, Task'lar, Bağlam, Proje Ayarları, Kullanım |
| Settings | Global credential + prompt yönetimi (admin) |
| Login | Split-panel giriş ekranı |

### Frontend Mimari
- **Component split:** ProjectDetail.tsx orchestrator, 6 tab component `components/project/` altında
- **Design tokens:** Semantic renk sistemi + typography + spacing token'ları index.css'te — light + dark mode
- **Renk fonksiyonları:** `utils.ts` — `statusColor()`, `priorityColor()`, `categoryColor()` (CSS var tabanlı)
- **ErrorBoundary:** App root'ta, component crash → kullanıcı dostu hata ekranı
- **Stale guard:** `loadIdRef` ile hızlı navigasyonda eski response'lar ignore edilir

### Tab Yapısı (ProjectDetail)
| Tab | İçerik | Görünürlük |
|---|---|---|
| Talepler | Talep listesi, skeleton loader, Yeni Talep (+ AI'a Sor) | Herkes |
| Talep Detay | Ham talep metni + AI analiz, sorular, refinement | Herkes |
| Task'lar | Task grupları, SP, Gönder (Jira/GitHub/CSV), Task Sync | Herkes |
| Bağlam | Kaynak Kod (edit+tara), Proje Dokümanları, AI Analiz Raporu | Herkes |
| Proje Ayarları | Proje Bilgileri (admin), Issue Tracker, Projeyi Sil (admin) | Admin |
| Kullanım | Token/maliyet/ROI dashboard | Admin |

## Bilinen Davranışlar / Kararlar

- **Re-analiz soru üretmez:** Son soru cevaplanınca tetiklenen re-analiz `questions: []` döner. Sonsuz döngüyü önlemek için bilinçli karar (buildReAnalysisMessage'da explicit instruction var).
- **AI output validation:** Tüm structured AI çıktıları `AiResultValidationService` üzerinden geçer. SP fibonacci'ye düzeltilir, affected modules structuredContext'e karşı doğrulanır, sorular within-result ve cross-analysis dedup'lanır.
- **Enum fallback:** RiskLevel, TaskCategory, FeatureCategory, Complexity, QuestionType — AI geçersiz değer dönerse `@JsonCreator` ile fallback yapılır (WARN log).
- **BeanOutputConverter:** Spring AI'ın JSON schema tabanlı structured output'u kullanılır (manuel extractJson kaldırıldı).
- **Structured context injection:** structuredContext (modules, entities, endpoints) artık tüm AI çağrılarına enjekte ediliyor (StructuredContextFormatter util).
- **Dependency parsing:** DependencyParsingService build file'ları parse eder (Maven/npm/Gradle/Python/Go), token harcanmaz.
- **Module dependency graph:** CodeIntelligenceService import'lardan module dependency graph çıkarır (dependsOn/consumedBy), token harcanmaz.
- **SP refetch yok:** `TasksTab` mount'ta `task.spSuggestion` doluysa `suggestSp` API'si çağrılmaz. Sonuç `setTasks` ile parent state'e yazılır — tab geçişlerinde kaybolmaz.
- **Backend başlatma:** `cat .env | cut -d= -f2` tüm satırları birleştirir, sadece `grep '^ANTHROPIC_API_KEY'` kullan.
- **Dosya upload URL:** `uploadDocument` / `uploadRequirementDocument` API_BASE kullanır, `/api/v1/...` değil (Vite proxy yok).

## Açık Sorular / Bekleyen Konular
- Claude API maliyet optimizasyonu (context caching vs her seferinde gönderme)
- Sunum formatı henüz belli değil
- Jira description şablonu iyileştirilebilir
- PDF/DOCX belge desteği (Apache PDFBox/POI) — şimdilik sadece metin dosyaları
- Kullanıcının aklındaki ek fikirler var

## Açık Fikirler / Backlog

- **Sprint bazlı tarama stratejisi** — Taramayı on-demand yerine sprint ritüellerine bağla (sprint başı, commit hook, vb.). Gereksiz re-scan önlenir, token yanmaz. Mevcut staleness detection ile entegre olur.

## Sonraki Adımlar
1. Uçtan uca test (talep → belge → analiz → task → sync)
2. Prompt iteration (gerçek verilerle test)
3. Pre-submission review (Staff + Distinguished) — Opus session
4. Sunum hazırlığı

## Milestone Review Sistemi
Staff Engineer + Distinguished review milestone'larda yapılacak.
- Backend core milestone — review yapıldı, bulgular düzeltildi
- Frontend milestone — 9 UX bulgu + 11 engineering bulgu, hepsi düzeltildi
- Sonraki: Tüm feature'lar bittiğinde (pre-submission)
- Sonraki: Sunum öncesi (demo odaklı)

## Model ve Limit Yönetimi
- Sonnet → rutin kod işleri (default)
- Opus → Staff/Distinguished review (tek seferlik, ben bildiririm)
- Her session tek konuya odaklanır
- Model geçişlerini Claude yönetir

## Kısıtlar
- Deadline odaklı değil, doğru ürün odaklı gidiyoruz
- Yeni fikirler bilinçli şekilde eklenebilir — her eklemenin nedenini bilerek
- Yarışma veya ürün, hangisi olursa olsun kaliteden ödün yok

## Demo Notları (UNUTMA)
- ScopeSmith kendi kodunu taradı — meta-demo çok etkileyici, sunumda kullan
- Slogan: "Requirements hatasının production'da düzeltme maliyeti 100x. ScopeSmith bu hatayı kaynağında yakalar."
- ChatGPT'den farkı 30 saniyede anlatılabilmeli (ADR plan dosyasında)

## Plan Dosyaları
- `.claude/plans/zazzy-greeting-knuth.md` — Ana plan
- `.claude/plans/glimmering-herding-rainbow.md` — Multi-Model AI + Belge Yönetimi planı (5 phase)

## Çalışma Kuralları
- Gerçek kaynak konuşma değil, dosya (CLAUDE.md + docs/)
- Session başında CLAUDE.md oku, session sonunda güncelle
- Büyük kararlar anında docs/decisions.md'ye yazılır
- Türkçe sohbet, İngilizce kod/terim
- Her zaman "neden" açıklanır

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
