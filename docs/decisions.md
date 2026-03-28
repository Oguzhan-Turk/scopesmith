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
