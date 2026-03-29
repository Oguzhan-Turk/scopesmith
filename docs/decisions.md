# Architectural Decisions

## ADR-001: Tech Stack Selection
**Date:** 2026-03-28
**Status:** Accepted

**Decision:** Spring Boot 3.5.3 + Java 21 + React 18 (Vite, TypeScript) + Tailwind CSS + PostgreSQL 17

**Rationale:**
- Java 21 LTS: stable, battle-tested, virtual threads available
- Spring Boot 3.5.x: latest supported, Java 21 compatible
- React + Vite + TypeScript: fast dev experience, type safety
- PostgreSQL: strong JSON support for storing analysis results, well-known
- Tailwind CSS: rapid UI development without custom design system

**Alternatives Considered:**
- Next.js full stack: faster prototyping but less enterprise credibility
- Python FastAPI: better AI ecosystem but new backend language for developer
- Java 25 + Spring Boot 4.0: too new, risk of unexpected issues in 15-day timeline

## ADR-002: AI Integration — Spring AI over Anthropic SDK
**Date:** 2026-03-29
**Status:** Accepted (updated from raw SDK)

**Decision:** Spring AI (spring-ai-starter-model-anthropic 1.1.4) with AiService interface abstraction

**Rationale:**
- Structured output: `.entity(Class)` auto-maps JSON to Java objects — critical for our use case
- Reduced boilerplate: no manual JSON parsing, retry, error handling
- Provider-agnostic: swap Claude for GPT by changing config, not code
- DIP applied: AiService interface → SpringAiService implementation
- Code parsing: no custom parser — let Claude analyze raw code files

**Trade-off:**
- Less low-level control than raw SDK
- Spring AI still evolving (1.x) — version locked to avoid breaking changes
- Acceptable for 15-day competition timeline

## ADR-003: Story Point Estimation — Learning System
**Date:** 2026-03-29
**Status:** Accepted (updated)

**Decision:** AI-powered contextual SP suggestion that learns from team decisions over time

**Rationale:**
- Existing SP calculator uses 6 fixed questions — can't capture project-specific complexity
- AI considers project context, similar past tasks, and provides rationale
- SP is a suggestion, not the final decision — team decides

**Learning mechanism (3 layers):**

1. **Team calibration** — spFinal (team decision) stored per task. When enough data
   accumulates (20+ tasks), AI references team's historical SP patterns.
   "I suggest 5 SP, but your team typically rates similar tasks at 8."
   Minimum threshold: don't reference history with < 20 tasks.

2. **Overestimate/underestimate pattern** — AI suggestion vs team decision vs actual
   completion. Triple comparison. "This team consistently underestimates DB tasks."
   Requires Jira sprint completion data — post-MVP.

3. **Similar task reference** — Show actual past tasks as evidence.
   "Similar to 'Create DiscountCode entity' (5 SP, completed in 3 days)."
   Past task title + description sent to Claude for similarity matching.
   This is MVP-feasible and high impact.

**Implementation priority:**
- MVP: Layer 1 (calibration) + Layer 3 (similar task reference)
- Post-MVP: Layer 2 (pattern detection, needs Jira data)

## ADR-004: Language Strategy
**Date:** 2026-03-29
**Status:** Accepted

**Decision:** Prompts in English, user-facing output in Turkish. Multi-language support deferred.

**Rationale:**
- Claude produces more consistent structured output in English
- JSON field names and enum values stay English regardless
- Atmosware users work in Turkish — PO'lar teknik İngilizce bilmeyebilir
- Demo impact: Turkish output much more impressive for Turkish jury

**Implementation:**
- System prompts: English
- Prompt instruction: "Return all human-readable text in Turkish. Keep JSON field names, enum values, and technical terms in English."
- Future: language parameter per project/user profile (e.g., `language: tr`)

**Trade-off:**
- Single API call (no separate translation step) — cost efficient
- Mixed language in JSON (English keys, Turkish values) — acceptable, frontend handles display

## ADR-005: Feature Prioritization
**Date:** 2026-03-29
**Status:** Accepted

**Decision:** All features stay in scope. Priority order for implementation:

**Core (this week):**
1. Feature E: Project Context — differentiator, without it we're a chatbot
2. Feature A+B: Already done, iterate prompts
3. Learning SP: Layer 1 + Layer 3
4. Feature D: PO Summary
5. Frontend: 3 core pages

**Enrichment (next week):**
6. Feature C: Change Impact Analysis
7. Feature F: Document Management
8. Jira integration (JSON export minimum)
9. UI polish + testing

**Rationale:**
- Feature E first because it's the key differentiator from ChatGPT
- No features cut — team committed to full delivery
- Prioritization ensures core value is deliverable even if time runs short

## ADR-006: Demo Data Requirements
**Date:** 2026-03-29
**Status:** Action Required

**Decision:** Request anonymized data from Atmosware for demo and learning SP testing.

**What we need:**
1. Real requirement examples (5-10) — raw, unstructured, real-world
2. Historical tasks (20-30) — title, description, SP final value
3. One project's general structure — tech stack, module names, entity list

**Rules:**
- All data must be anonymized (no customer names, no sensitive info)
- Structure and format matter, not actual content
- Can be from any directorate's projects

## ADR-007: Context Staleness Detection
**Date:** 2026-03-29
**Status:** Accepted

**Decision:** Three-layer system to detect when project context is outdated.

**Problem:** Project code evolves. If ScopeSmith analyzes new requirements against
stale context, results will be inaccurate and users will lose trust.

**Layers:**

1. **Time-based (MVP)** — Track `lastScannedAt` on Project entity.
   Show "Last scanned X days ago" in UI. Simple, always available,
   works for both git and local folder projects.

2. **Git diff detection (MVP+)** — Store `lastScannedCommitHash`.
   When project has remote git, compare against current HEAD.
   Report: "47 commits since last scan, 3 new files in /entity/".
   No full rescan needed — just git log comparison.
   Only available for git-connected projects.

3. **AI inconsistency detection (future)** — During analysis, Claude
   notices references to modules/entities not in context.
   "You mention OrderService but it's not in the project context.
   Context may be outdated." Triggered at analysis time, zero overhead
   when context is fresh.

**Data model changes (Project entity):**
- `lastScannedAt: LocalDateTime` — when was the project last scanned
- `lastScannedCommitHash: String` — git commit hash at last scan (nullable)
- `contextVersion: Integer` — incremented on each rescan

**Implementation priority:**
- MVP: Layer 1 (time-based) — implemented with Feature E
- MVP+: Layer 2 (git diff) — when remote git is connected
- Future: Layer 3 (AI detection) — prompt engineering addition

## ADR-008: Usage Tracking & Billing
**Date:** 2026-03-29
**Status:** Accepted

**Decision:** Lightweight usage tracking in MVP, full billing dashboard deferred.

**MVP:**
- `durationMs` field on Analysis entity — track how long each analysis took
- Display "this analysis completed in X seconds" in UI
- Analysis count per project (simple DB count)
- Cost discussed verbally in presentation using Anthropic Console data

**Future (full billing dashboard):**
- Token usage tracking per API call (input/output tokens)
- Cost calculation per analysis, per project, per team
- Monthly usage reports
- Budget alerts and limits
- ROI metrics: manual analysis time vs ScopeSmith time + cost

**Rationale:**
- MVP: zero extra effort, durationMs is one field, high presentation impact
- Full billing: requires Spring AI token usage extraction, aggregation logic, dedicated UI — not worth the effort in 15-day sprint
- "This analysis cost $0.45 and took 12 seconds" is a killer demo line
