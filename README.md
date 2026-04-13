<div align="center">

# ScopeSmith

**AI-Powered Requirement Analysis for Software Teams**

Turn ambiguous requests into structured analysis, actionable tasks, and story point estimates — with full project context awareness.

[![CI](https://github.com/Oguzhan-Turk/scopesmith/actions/workflows/ci.yml/badge.svg)](https://github.com/Oguzhan-Turk/scopesmith/actions)

[Features](#features) · [Architecture](#architecture) · [Getting Started](#getting-started) · [How It Works](#how-it-works) · [Cost Optimization](#cost-optimization)

</div>

---

## The Problem

Most software project delays don't come from technical failures — they come from **poor requirement quality**. Teams start building before clarifying what needs to be built. The cost of fixing a requirement error in production is **100x** what it would cost to catch it during planning.

ScopeSmith catches these errors at the source — before development begins.

## Features

### Core Analysis Pipeline

- **Structured Requirement Analysis** — Raw requests are analyzed into risk levels, affected modules, assumptions, and dependencies
- **Targeted Question Generation** — Identifies ambiguities and generates specific clarifying questions for the Product Owner
- **Task Breakdown** — Decomposes analyzed requirements into implementable tasks with descriptions, acceptance criteria, and categories (Backend, Frontend, Test, DevOps, Design, Documentation)
- **AI Story Point Estimation** — Fibonacci-calibrated SP suggestions, refined using historical data from similar tasks via vector similarity search (pgvector)
- **Stakeholder Summary** — Generates non-technical executive summaries from the same analysis

### Context Engine

- **Source Code Scanning** — Scans local folders or Git repositories to extract file trees, modules, entities, endpoints, and dependencies
- **Zero-Token Static Analysis** — File trees, dependency graphs, and module structures are extracted via regex and JGit — no AI tokens spent
- **Build File Parsing** — Maven, npm, Gradle, Python, and Go dependencies parsed statically
- **Context Freshness** — Tracks commit diffs since last scan, supports partial refresh
- **Federated Context** — Multi-service projects analyzed with per-service context and cross-service awareness

### Enterprise Governance

- **3-Tier Model Strategy** — Haiku for simple operations, Sonnet for analysis, Opus for complex breakdowns. Right model for the right job
- **Usage Tracking & ROI** — Token counts, per-operation costs, and ROI calculations reported in-app
- **Multi-Tenant** — Organization-level data isolation with admin/user role separation
- **Prompt Management** — 16 prompts versioned in database, editable at runtime without redeployment
- **Credential Security** — Jira/GitHub credentials AES-encrypted, masked in frontend

### Integrations

- **Jira Cloud** — Issue creation, status verification, orphan issue cleanup, CSV export
- **GitHub Issues** — Issue creation, label management, status sync, orphan cleanup
- **Claude Code** — Generate implementation prompts directly from tasks

### Managed Agent (Feature-Flagged)

Autonomous agent infrastructure ready — can pick up a task, create a branch, write code, and commit. Disabled by default (human-in-the-loop mandatory, no output goes directly to production).

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        Frontend                               │
│           React 18 · TypeScript · Vite · Tailwind v4          │
└──────────────────────┬───────────────────────────────────────┘
                       │ REST API
┌──────────────────────┴───────────────────────────────────────┐
│                        Backend                                │
│         Spring Boot 3.5.3 · Java 21 · Spring Security         │
│                                                               │
│  Controller → Service → Repository (Layered Architecture)     │
│                                                               │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│  │ Spring AI    │  │ Context      │  │ Integration          │ │
│  │ (Anthropic)  │  │ Resolution   │  │ (Jira · GitHub)      │ │
│  └─────────────┘  └──────────────┘  └──────────────────────┘ │
└──────────────────────┬───────────────────────────────────────┘
                       │
┌──────────────────────┴───────────────────────────────────────┐
│                       Database                                │
│        PostgreSQL 17 · JSONB · pgvector (1536 dim)            │
│              Flyway Migrations · AES Encryption               │
└──────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

| Decision | Rationale |
|---|---|
| AI calls outside transactions | 15-30s AI operations don't hold DB connections |
| BeanOutputConverter | Type-safe AI output — no string parsing, no retry loops |
| PromptLoader (DB-first, classpath-fallback) | Runtime prompt editing without redeployment |
| ContextResolutionService | Single entry point for single-repo and federated workspace contexts |
| Managed Agent behind feature flag | Separation of analysis/planning from code generation |
| `Locale.ENGLISH` for all `toLowerCase()` | Turkish locale bug prevention (LIGHT → lıght) |

## Tech Stack

| Layer | Technologies |
|---|---|
| **Backend** | Java 21, Spring Boot 3.5.3, Spring AI 1.1.4, Spring Data JPA, Spring Security, Flyway |
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS v4, shadcn/ui |
| **Database** | PostgreSQL 17 (JSONB + pgvector), Docker |
| **AI** | Claude API (Haiku / Sonnet / Opus) via Spring AI |
| **Integrations** | Jira Cloud REST API, GitHub REST API |
| **CI** | GitHub Actions (Java 21 + Node 22 + PostgreSQL + Playwright) |

## Getting Started

### Prerequisites

- Java 21
- Node.js 22+
- Docker (for PostgreSQL)
- Anthropic API key

### Run

```bash
# 1. Start PostgreSQL
docker compose up -d

# 2. Start backend
cd backend
ANTHROPIC_API_KEY=$(grep '^ANTHROPIC_API_KEY' ../.env | cut -d= -f2) ./mvnw spring-boot:run

# 3. Start frontend
cd frontend
npm install
npm run dev
```

**Backend:** http://localhost:8080  
**Frontend:** http://localhost:5173  
**Default users:** `admin/admin123`, `user/user123`

### Optional: Vector Memory

For organizational memory (similar task lookup, SP calibration):

```bash
# Set OpenAI API key in .env for embeddings
OPENAI_API_KEY=your-key-here
```

Uses `text-embedding-3-small` (1536 dimensions). Gracefully degrades if not configured — embeddings are simply skipped.

## How It Works

```
Raw Request
    │
    ▼
┌─────────────────────┐
│  Structured Analysis │ ← Context Engine injects project knowledge
│  Risk · Modules ·    │   (modules, entities, endpoints, dependencies)
│  Assumptions         │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Question Generation │ ← Identifies gaps, generates targeted questions
└─────────┬───────────┘
          │  PO answers → analysis auto-updates
          ▼
┌─────────────────────┐
│  Task Breakdown      │ ← Tasks with descriptions, acceptance criteria,
│  + SP Estimation     │   categories, and Fibonacci SP estimates
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Stakeholder Summary │ ← Non-technical executive overview
└─────────┬───────────┘
          │
          ▼
    Jira / GitHub Sync
```

### Meta-Demo

ScopeSmith analyzed its own repository. It scanned its own source code, listed its own modules, and generated tasks for its own codebase — the most meaningful proof of what it can do.

## Cost Optimization

Every architectural decision asks: **"Is AI necessary for this?"**

| Technique | Impact |
|---|---|
| Zero-token code analysis (regex + JGit) | Thousands of lines processed without spending a single token |
| 3-tier model routing (Haiku/Sonnet/Opus) | Each operation uses the sufficient model, not the most expensive |
| Static build file parsing | Dependency graphs extracted without any AI prompt |
| Computed data caching | SP estimates, task lists, analysis results — computed once, stored |
| Type-safe structured output | BeanOutputConverter eliminates parse-retry cycles |

**Measured result:** $0.28 AI cost → 270x ROI (tracked and reported in-app).

## Project Structure

```
scopesmith/
├── backend/
│   └── src/main/java/com/scopesmith/
│       ├── controller/        # REST endpoints
│       ├── service/           # Business logic + AI services
│       ├── repository/        # Data access
│       ├── entity/            # JPA entities
│       └── config/            # Security, AI, app config
├── frontend/
│   └── src/
│       ├── pages/             # Dashboard, ProjectDetail, Settings, Login
│       ├── components/project/# Tab components (Requirements, Tasks, Context, etc.)
│       ├── api/               # API client
│       └── hooks/             # Custom hooks (toast, etc.)
├── docs/                      # ADRs, decisions, presentation
└── docker-compose.yml         # PostgreSQL + pgvector
```

---

<div align="center">

*"Asking the right question is half the answer."*

**ScopeSmith asks the questions.**

</div>
