# ScopeSmith v0.dev Prompts

Paste each prompt into v0.dev. All screens use shadcn/ui + Tailwind CSS.

Global context for every prompt:
```
Tech: React 18, TypeScript, shadcn/ui, Tailwind CSS v4, dark mode support.
Language: All UI text must be in Turkish.
Style: Modern enterprise SaaS. Think Linear, Vercel, Notion. Minimal, spacious, professional. Inter font.
```

---

## 1. LOGIN

```
Design a login page for "ScopeSmith" — an AI-powered tool that helps software teams analyze requirements, break them into tasks, and estimate effort.

The user is a software developer or engineering manager at a mid-size company. They need to log in quickly and get to work.

Fields: username, password.
Error state: invalid credentials message.
Loading state: button shows spinner.

Brand: "ScopeSmith" with a small "AI" badge next to the name. Brief tagline about AI-powered requirement analysis.

Turkish UI text. shadcn/ui + Tailwind. Dark mode support.
```

---

## 2. DASHBOARD

```
Design the main dashboard for "ScopeSmith" — a tool where software teams manage multiple projects.

The user lands here after login. They need to:
- See all their projects at a glance
- Quickly find and open a project
- Create a new project (name + optional description)

Each project shows: name, description, last activity time.
Projects are sorted newest first.

States to handle:
- Empty: no projects yet, encourage creation
- Populated: list of 5-15 projects
- Create project: modal/dialog with name + description fields

Navigation bar: logo "ScopeSmith" + "AI" badge, "Projeler" link (active), "Ayarlar" link, dark mode toggle, user menu with logout.

Turkish UI. shadcn/ui + Tailwind. Dark mode support.
```

---

## 3. PROJECT — REQUIREMENTS LIST

```
Design a requirements intake screen for "ScopeSmith".

Context: A software team collects feature requests and bug reports here. Each requirement is a short text describing what needs to be built or fixed. AI will later analyze these requirements.

The user needs to:
- See all requirements for this project
- Add new requirements (feature or bug, with a text description)
- Trigger AI analysis on a requirement
- See the status of each requirement (New, Analyzed, Clarifying, Completed)
- See progress: has analysis, task count, synced to Jira count

Important states:
- Warning banner when project has no code context yet (AI analysis will be less accurate)
- Empty: no requirements, encourage adding the first one
- Requirement type: "Feature" or "Bug" visual distinction

This is a tab inside a project detail page. The project has these tabs:
"Talepler" (this one, active), "Talep Detay", "Task'lar", "Bağlam", "Proje Ayarları", "Kullanım"

Show the project name and description in the page header.

Turkish UI. shadcn/ui + Tailwind. Dark mode support.
```

---

## 4. PROJECT — REQUIREMENT DETAIL

```
Design a requirement analysis detail screen for "ScopeSmith".

Context: After AI analyzes a requirement, it produces questions to clarify scope, a technical analysis, and a stakeholder-friendly summary. This screen is the command center for refining a single requirement.

The user (developer or PM) needs to:

1. ANSWER CLARIFYING QUESTIONS from AI:
   - AI generates 3-8 questions to reduce ambiguity
   - Questions can be multiple-choice (chip selection) or free-text
   - User selects answers and confirms, or skips
   - Progress indicator: "3 of 5 answered"
   - Show completed questions in a collapsible section

2. REVIEW TECHNICAL ANALYSIS:
   - AI summary of the requirement
   - Risk assessment (High/Medium/Low) with reason
   - Assumptions the AI made
   - Affected modules (as clean tags)
   - User can refine: "How should I improve this analysis?" input + update button

3. REVIEW STAKEHOLDER SUMMARY:
   - Non-technical explanation for product owners
   - Covers: what's being built, scope, risks, decision points
   - User can refine: "How should I change this summary?" input + update button
   - Generate button if not yet created

This is the "Talep Detay" tab inside the project detail page.

Turkish UI. shadcn/ui + Tailwind. Dark mode support.
```

---

## 5. PROJECT — TASKS

```
Design a task management screen for "ScopeSmith".

Context: AI breaks a requirement into development tasks. Each task has a title, description, acceptance criteria, story point estimate, priority, and category. The team reviews and approves story points, then syncs tasks to Jira or GitHub Issues.

The user needs to:

1. GENERATE TASKS: Click "Task'lara Böl" to have AI create tasks from the analysis
2. VIEW TASKS: Expandable card list showing title, priority (color bar), category badge, SP estimate
3. APPROVE STORY POINTS: For each task, see AI suggestion, pick from Fibonacci buttons (1,2,3,5,8,13), optionally explain why they disagree
4. SYNC TO EXTERNAL: Send tasks to Jira or GitHub Issues (dropdown menu)
5. ADD MANUAL TASKS: Free-form task creation
6. REFINE: Give AI instructions to adjust the task breakdown
7. VIEW IMPLEMENTATION PROMPT: Each task has an AI-generated coding prompt (collapsible, copyable)
8. START AI AGENT: Trigger a managed agent to implement the task in a git branch (shows status: pending, running, completed, failed, with branch name)

Visual indicators:
- Synced tasks: green border accent
- Priority colors: critical=red, high=orange, medium=yellow, low=green
- SP: confirmed (bold primary) vs AI suggestion (muted with ~)

States:
- Empty: no tasks yet, show generate button
- Generate blocked: if unanswered questions exist, show tooltip warning

This is the "Task'lar" tab inside the project detail page.

Turkish UI. shadcn/ui + Tailwind. Dark mode support.
```

---

## 6. PROJECT — CONTEXT

```
Design a project context management screen for "ScopeSmith".

Context: ScopeSmith scans the project's source code to understand its tech stack, modules, and structure. This makes AI analysis more accurate. Users can also upload documents (meeting notes, specs, emails) as additional context.

The user needs to:

1. SEE CONTEXT STATUS: Is code scanned? When was the last scan? Is it stale (new commits since scan)?
2. UPLOAD DOCUMENTS: Meeting notes, architecture docs, emails — to enrich AI analysis
3. SCAN SOURCE CODE: Enter a local folder path OR a git URL to scan the codebase
4. SEE REFRESH HISTORY: Past partial refresh jobs with status (done/failed/running)

Layout suggestion — three sections:
- Status overview (is context ready? fresh or stale?)
- Documents (list + add)
- Advanced/collapsible (scan form, refresh history) — opens by default when no context exists

Turkish UI. shadcn/ui + Tailwind. Dark mode support.
```

---

## 7. PROJECT — SETTINGS

```
Design a project settings page for "ScopeSmith". Admin-only features.

The admin needs to manage:

1. PROJECT INFO: Edit project name and description
2. ISSUE TRACKER: Connect to Jira or GitHub Issues (mutually exclusive — only one active)
   - Jira: project key, issue type, category mode (labels, components, or both)
   - GitHub: repository (owner/repo format)
   - Show which is active/inactive with status badges
3. SERVICE ARCHITECTURE: Toggle multi-service mode for monorepo/multi-repo projects
   - When enabled: add services (name, type, path/URL), manage dependencies between services
4. DELETE PROJECT: Destructive action with name confirmation dialog

This is the "Proje Ayarları" tab inside the project detail page. Only visible to admins.

Turkish UI. shadcn/ui + Tailwind. Dark mode support.
```

---

## 8. SETTINGS — CREDENTIALS

```
Design a credentials settings page for "ScopeSmith".

Context: This is a global settings page (not per-project). It stores API credentials for external services. Per-project configuration (which Jira project, which GitHub repo) is separate.

The user needs to configure:
- Jira: base URL, email, API token
- GitHub: personal access token, default repository

Important: Make clear these are organization-wide credentials, not per-project settings. Add a note pointing to project-level settings.

This is the first tab of a 3-tab settings page:
"API Kimlik Bilgileri" (active), "AI Modelleri", "Prompt Yönetimi"

Turkish UI. shadcn/ui + Tailwind. Dark mode support.
```

---

## 9. SETTINGS — AI MODELS

```
Design an AI model configuration panel for "ScopeSmith".

Context: ScopeSmith uses 3 tiers of AI models for different operations:
- Light: fast, cheap operations (document summaries, code scanning)
- Standard: requirement analysis and task generation
- Premium: complex analysis and refinements

The admin needs to:
- Select which Claude model to use for each tier (dropdown with known models)
- See/edit per-million-token pricing (used for cost tracking)
- Option to enter a custom model name if not in the preset list

Known models: Claude Haiku 4.5, Claude Sonnet 4, Claude Opus 4.6

Design this as a compact single card with 3 rows (one per tier), not 3 separate cards. Each row: tier name + description on left, model picker + pricing on right.

This is the second tab of the settings page.

Turkish UI. shadcn/ui + Tailwind. Dark mode support.
```

---

## 10. SETTINGS — PROMPT MANAGEMENT

```
Design a prompt editor interface for "ScopeSmith".

Context: ScopeSmith uses ~13 AI prompts that control how the AI behaves during analysis, task generation, etc. Admins can customize these prompts and reset to defaults.

The user needs to:
- Browse a list of prompts by name
- Select one to edit in a large text editor
- Save changes
- Reset to default version
- See version number

Prompts: Talep Analizi, Bug Analizi, Analiz Düzenleme, Task Üretimi, Task Düzenleme, İş Özeti, İş Özeti Düzenleme, Değişiklik Etkisi, Kod Tarama, Yapısal Analiz, Belge Özeti, Özellik Önerisi, SP Tahmini

Two-panel layout: prompt list on left (narrow), editor on right (wide). The editor should feel like a mini IDE — monospace font, line numbers optional.

This is the third tab of the settings page.

Turkish UI. shadcn/ui + Tailwind. Dark mode support.
```

---

## 11. USAGE ANALYTICS

```
Design a usage analytics tab for "ScopeSmith".

Context: ScopeSmith tracks AI token usage, costs, and ROI per project. This helps teams understand the value of AI-assisted analysis.

The user sees:
- Key metrics: total AI calls, total tokens, total cost ($), total AI processing time
- ROI analysis: analyses completed, estimated hours saved, cost per analysis, ROI multiplier
- Operation breakdown: which AI operations (analysis, task generation, summaries) cost how much

States:
- Empty: no AI usage yet, informational message
- Populated: metrics grid + ROI card + operation table

This is the "Kullanım" tab inside the project detail page. Admin only.

Turkish UI. shadcn/ui + Tailwind. Dark mode support.
```
