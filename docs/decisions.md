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

## ADR-002: AI Integration Approach
**Date:** 2026-03-28
**Status:** Accepted

**Decision:** Claude API with structured prompts, no custom code parser — let Claude analyze raw code files

**Rationale:**
- Writing custom parsers for entity/service/controller detection is fragile and project-structure dependent
- Claude excels at understanding code structure from raw files
- Send file tree + key files → Claude extracts project context
- Context stored as structured summary in DB, reused across analyses

## ADR-003: Story Point Estimation
**Date:** 2026-03-28
**Status:** Accepted

**Decision:** AI-powered contextual SP suggestion instead of deterministic question-based calculation

**Rationale:**
- Existing SP calculator uses 6 fixed questions (service count, DB changes, integration, logic, testing, requirement maturity)
- Fixed questions can't capture project-specific complexity
- AI considers project context, similar past tasks, and provides rationale
- SP is a suggestion, not a final decision — team decides
