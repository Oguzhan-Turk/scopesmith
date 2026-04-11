const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8080/api/v1";
const DEFAULT_TIMEOUT_MS = 60_000;
const CSRF_COOKIE_NAME = "XSRF-TOKEN";
const CSRF_HEADER_NAME = "X-XSRF-TOKEN";
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

let csrfInitPromise: Promise<void> | null = null;
let csrfTokenCache: string | null = null;

function readCookie(name: string): string | null {
  const prefixed = `${name}=`;
  return document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefixed))
    ?.slice(prefixed.length) ?? null;
}

async function ensureCsrfToken(force = false): Promise<string | null> {
  const cookieToken = readCookie(CSRF_COOKIE_NAME);
  if (!force && (csrfTokenCache || cookieToken)) {
    return csrfTokenCache || cookieToken;
  }
  if (!csrfInitPromise) {
    csrfInitPromise = fetch(`${API_BASE}/auth/csrf`, {
      method: "GET",
      credentials: "include",
    }).then(async (res) => {
      let tokenFromBody: string | null = null;
      try {
        const data = (await res.json()) as { token?: string };
        tokenFromBody = data?.token ?? null;
      } catch {
        tokenFromBody = null;
      }
      csrfTokenCache = tokenFromBody || readCookie(CSRF_COOKIE_NAME);
    });
  }
  try {
    await csrfInitPromise;
    return csrfTokenCache || readCookie(CSRF_COOKIE_NAME);
  } finally {
    csrfInitPromise = null;
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  const method = (options?.method ?? "GET").toUpperCase();
  const headers = new Headers(options?.headers ?? { "Content-Type": "application/json" });

  try {
    if (MUTATING_METHODS.has(method)) {
      // Always refresh CSRF token before mutating calls.
      // This avoids stale token/session mismatches causing false "invalid credentials" UX.
      const csrfToken = await ensureCsrfToken(true);
      if (csrfToken) {
        headers.set(CSRF_HEADER_NAME, csrfToken);
      }
    }

    const res = await fetch(`${API_BASE}${path}`, {
      headers,
      credentials: "include",
      ...options,
      signal: controller.signal,
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
      throw new Error(error.message || `HTTP ${res.status}`);
    }

    if (res.status === 204) return undefined as T;
    return res.json();
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      throw new Error("İstek zaman aşımına uğradı. Sunucu yanıt vermedi.");
    }
    throw e;
  } finally {
    clearTimeout(timeout);
  }
}

// Features
export interface Features {
  managedAgentEnabled: boolean;
  selfAssistantEnabled: boolean;
}
export const getFeatures = () => request<Features>("/features");

// Projects
export const getProjects = () => request<Project[]>("/projects");
export const getProject = (id: number) => request<Project>(`/projects/${id}`);
export const createProject = (data: { name: string; description?: string }) =>
  request<Project>("/projects", { method: "POST", body: JSON.stringify(data) });
export const updateProject = (id: number, data: { name: string; description?: string }) =>
  request<Project>(`/projects/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const scanProject = (id: number, folderPath: string) =>
  request<{ status: string }>(`/projects/${id}/scan`, {
    method: "POST",
    body: JSON.stringify({ folderPath }),
  });
export const scanProjectGit = (id: number, gitUrl: string, token?: string) =>
  request<{ status: string }>(`/projects/${id}/scan-git`, {
    method: "POST",
    body: JSON.stringify({ gitUrl, token }),
  });
export const getScanStatus = (id: number) =>
  request<{ status: "IDLE" | "SCANNING" | "FAILED"; error: string }>(`/projects/${id}/scan-status`);
export const getContextFreshness = (id: number) =>
  request<ContextFreshness>(`/projects/${id}/context-freshness`);
export const getProjectServices = (id: number) =>
  request<ProjectService[]>(`/projects/${id}/services`);
export const createProjectService = (id: number, data: ProjectServiceRequest) =>
  request<ProjectService>(`/projects/${id}/services`, {
    method: "POST",
    body: JSON.stringify(data),
  });
export const updateProjectService = (id: number, serviceId: number, data: Partial<ProjectServiceRequest>) =>
  request<ProjectService>(`/projects/${id}/services/${serviceId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
export const deleteProjectService = (id: number, serviceId: number) =>
  request<void>(`/projects/${id}/services/${serviceId}`, { method: "DELETE" });
export const getServiceGraph = (id: number) =>
  request<ServiceGraph>(`/projects/${id}/services/graph`);
export const getFederatedContext = (id: number) =>
  request<FederatedContext>(`/projects/${id}/services/federated-context`);
export const scanProjectService = (id: number, serviceId: number, folderPath?: string) =>
  request<ServiceScanResult>(`/projects/${id}/services/${serviceId}/scan`, {
    method: "POST",
    body: JSON.stringify(folderPath ? { folderPath } : {}),
  });
export const addServiceDependency = (id: number, data: ServiceDependencyRequest) =>
  request<ServiceDependency>(`/projects/${id}/services/dependencies`, {
    method: "POST",
    body: JSON.stringify(data),
  });
export const deleteServiceDependency = (id: number, dependencyId: number) =>
  request<void>(`/projects/${id}/services/dependencies/${dependencyId}`, { method: "DELETE" });
export const runPartialRefresh = (id: number, data?: { maxAnalyses?: number; force?: boolean }) =>
  request<PartialRefreshResult>(`/projects/${id}/context-freshness/partial-refresh`, {
    method: "POST",
    body: JSON.stringify(data ?? {}),
  });
export const getPartialRefreshStatus = (id: number) =>
  request<PartialRefreshResult>(`/projects/${id}/context-freshness/partial-refresh-status`);
export const getPartialRefreshJobs = (id: number, page: number = 0, size: number = 5) =>
  request<PartialRefreshHistory | PartialRefreshResult[]>(`/projects/${id}/context-freshness/partial-refresh-jobs?page=${page}&size=${size}`);
export const getTraceability = (id: number) =>
  request<TraceabilityReport>(`/projects/${id}/traceability`);
export const getDeleteSummary = (id: number) =>
  request<{ requirements: number; documents: number; aiCalls: number }>(`/projects/${id}/delete-summary`);
export const deleteProject = (id: number, confirmName: string) =>
  request<void>(`/projects/${id}`, { method: "DELETE", body: JSON.stringify({ confirmName }) });

// Auth
export const login = (username: string, password: string) =>
  request<AuthUser>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
    credentials: "include",
  } as RequestInit);
export const getMe = () => request<AuthUser>("/auth/me", { credentials: "include" } as RequestInit);
export const logout = () => request<void>("/auth/logout", { method: "POST", credentials: "include" } as RequestInit);

export interface AuthUser {
  username: string;
  role: "ADMIN" | "USER";
}

// Credentials
export const getCredentials = () => request<Record<string, string>>("/settings/credentials");
export const updateCredentials = (data: Record<string, string>) =>
  request<Record<string, string>>("/settings/credentials", {
    method: "PUT",
    body: JSON.stringify(data),
  });

// AI Model Registry
export type ModelTier = "LIGHT" | "STANDARD" | "PREMIUM";

export interface AiModelConfig {
  id: number;
  tier: ModelTier;
  provider: string;
  modelName: string;
  active: boolean;
  inputPerMillion: number | null;
  outputPerMillion: number | null;
  latencyClass: string | null;
  qualityClass: string | null;
  updatedAt: string;
}

export const getModelConfigs = () => request<AiModelConfig[]>("/settings/models");
export const updateModelConfig = (tier: ModelTier, data: Partial<AiModelConfig>) =>
  request<AiModelConfig>(`/settings/models/${tier}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

// Prompts
export const getPrompts = () => request<PromptItem[]>("/prompts");
export const getPrompt = (name: string) => request<PromptItem>(`/prompts/${name}`);
export const updatePrompt = (name: string, content: string) =>
  request<PromptItem>(`/prompts/${name}`, { method: "PUT", body: JSON.stringify({ content }) });
export const resetPrompt = (name: string) =>
  request<PromptItem>(`/prompts/${name}/reset`, { method: "POST" });

export interface PromptItem {
  id: number;
  name: string;
  content: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

// Usage & ROI
export const getProjectUsage = (projectId: number) =>
  request<UsageSummary>(`/usage/projects/${projectId}/summary`);

export interface UsageSummary {
  totalAiCalls: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  totalEstimatedCostUsd: number;
  totalDurationMs: number;
  byOperationType: Record<string, { count: number; costUsd: number; avgDurationMs: number }>;
  roi?: {
    totalAnalyses: number;
    estimatedHoursSaved: number;
    costPerAnalysis: number;
    analystHourlyRateUsd: number;
    estimatedValueSavedUsd: number;
    roiMultiplier: number;
  };
}

// Integration Config
export const getIntegrationConfig = (projectId: number) =>
  request<IntegrationConfig>(`/projects/${projectId}/integration-config`);
export const updateIntegrationConfig = (projectId: number, config: IntegrationConfig) =>
  request<IntegrationConfig>(`/projects/${projectId}/integration-config`, {
    method: "PUT",
    body: JSON.stringify(config),
  });

// Task Groups
export const getTaskGroups = (projectId: number) =>
  request<TaskGroup[]>(`/projects/${projectId}/task-groups`);

export interface TaskGroup {
  analysisId: number;
  requirementId: number;
  requirementText: string;
  requirementType: "FEATURE" | "BUG";
  requirementSeq: number | null;
  riskLevel: string;
  createdAt: string;
  taskCount: number;
  totalSp: number;
  tasks: Task[];
}

// Requirements
export const getRequirements = (projectId: number) =>
  request<Requirement[]>(`/projects/${projectId}/requirements`);
export const createRequirement = (projectId: number, rawText: string, type?: string) =>
  request<Requirement>(`/projects/${projectId}/requirements`, {
    method: "POST",
    body: JSON.stringify({ rawText, type }),
  });
export const deleteRequirement = (id: number) =>
  request<void>(`/requirements/${id}`, { method: "DELETE" });
export const analyzeRequirement = (id: number, modelTier?: string) => {
  const params = modelTier ? `?modelTier=${modelTier}` : "";
  return request<Analysis>(`/requirements/${id}/analyze${params}`, { method: "POST" });
};
export const getChangeImpact = (id: number) =>
  request<ChangeImpact>(`/requirements/${id}/change-impact`, { method: "POST" });

// Questions
export const answerQuestion = (id: number, answer: string) =>
  request<Analysis>(`/questions/${id}/answer`, {
    method: "PUT",
    body: JSON.stringify({ answer }),
  });
export const dismissQuestion = (id: number) =>
  request<Analysis>(`/questions/${id}/dismiss`, { method: "PUT" });

// Tasks
export const generateTasks = (analysisId: number) =>
  request<Task[]>(`/analyses/${analysisId}/tasks`, { method: "POST" });
export const updateTask = (
  taskId: number,
  data: Partial<Pick<Task, "title" | "description" | "acceptanceCriteria" | "priority" | "category" | "serviceId">>
) =>
  request<Task>(`/tasks/${taskId}`, { method: "PUT", body: JSON.stringify(data) });
export const setSpDecision = (taskId: number, spFinal: number, divergenceReason?: string) =>
  request<Task>(`/tasks/${taskId}/sp-decision`, {
    method: "PUT",
    body: JSON.stringify({ spFinal, ...(divergenceReason ? { divergenceReason } : {}) }),
  });

export const suggestSp = (taskId: number) =>
  request<{ spSuggestion: number; spRationale: string }>(`/tasks/${taskId}/suggest-sp`, { method: "POST" });
export const getClaudeCodePrompt = (taskId: number) =>
  request<{ prompt: string }>(`/tasks/${taskId}/claude-code-prompt`);

// Managed Agent
export interface AgentStartResult { sessionId: string | null; status: string; branch: string; }
export interface AgentStatusResult { sessionId: string | null; status: string; branch: string | null; error: string | null; }
export const startManagedAgent = (taskId: number) =>
  request<AgentStartResult>(`/tasks/${taskId}/agent/start`, { method: "POST" });
export const getManagedAgentStatus = (taskId: number) =>
  request<AgentStatusResult>(`/tasks/${taskId}/agent/status`);
export const refineAnalysis = (analysisId: number, instruction: string) =>
  request<Analysis>(`/analyses/${analysisId}/refine`, {
    method: "POST",
    body: JSON.stringify({ instruction }),
  });
export const suggestFeatures = (projectId: number) =>
  request<FeatureSuggestionResult>(`/projects/${projectId}/suggest-features`, { method: "POST" });

export interface FeatureSuggestionResult {
  suggestions: Array<{
    title: string;
    description: string;
    category: string;
    complexity: string;
    rationale: string;
  }>;
}

// Analysis retrieval
export const getAnalysesByRequirement = (requirementId: number) =>
  request<Analysis[]>(`/requirements/${requirementId}/analyses`);
export const getAnalysis = (analysisId: number) =>
  request<Analysis>(`/analyses/${analysisId}`);
export const getTasksByAnalysis = (analysisId: number) =>
  request<Task[]>(`/analyses/${analysisId}/tasks`);

export const refineTasks = (analysisId: number, instruction: string) =>
  request<TaskRefineResult>(`/analyses/${analysisId}/tasks/refine`, {
    method: "POST",
    body: JSON.stringify({ instruction }),
  });

export const createManualTask = (
  analysisId: number,
  data: { title: string; description?: string; priority?: string; category?: string; serviceId?: number | null }
) =>
  request<Task>(`/analyses/${analysisId}/tasks/manual`, {
    method: "POST",
    body: JSON.stringify(data),
  });

export interface TaskRefineResult {
  tasks: Task[];
  orphanedIssues: string[];
  preservedIssues: string[];
}

// Stakeholder Summary
export const generateStakeholderSummary = (analysisId: number) =>
  request<{ summary: string }>(`/analyses/${analysisId}/stakeholder-summary`, {
    method: "POST",
  });
export const refineStakeholderSummary = (analysisId: number, instruction: string) =>
  request<{ summary: string }>(`/analyses/${analysisId}/stakeholder-summary/refine`, {
    method: "POST",
    body: JSON.stringify({ instruction }),
  });

// GitHub Sync
export const syncToGitHub = (analysisId: number, repo?: string, taskIds?: number[]) =>
  request<GitHubSyncResult>(`/analyses/${analysisId}/sync/github`, {
    method: "POST",
    body: JSON.stringify({ repo, taskIds }),
  });

export interface GitHubSyncResult {
  totalTasks: number;
  created: number;
  failed: number;
  issues: Array<{ taskId: string; issueNumber: string; status: string }>;
  errors?: Array<{ taskId: string; title: string; error: string }>;
}

// Jira Sync
export const syncToJira = (analysisId: number, projectKey?: string, issueType?: string, taskIds?: number[]) =>
  request<JiraSyncResult>(`/analyses/${analysisId}/sync/jira`, {
    method: "POST",
    body: JSON.stringify({ projectKey, issueType, taskIds }),
  });

export interface JiraSyncResult {
  totalTasks: number;
  created: number;
  failed: number;
  issues: Array<{ taskId: string; jiraKey: string; status: string }>;
  errors?: Array<{ taskId: string; title: string; error: string }>;
}

// Sync Verify
export const verifySyncStatus = (analysisId: number) =>
  request<{ jira?: { checked: number; cleared: number }; github?: { checked: number; cleared: number } }>(
    `/analyses/${analysisId}/sync/verify`, { method: "POST" }
  );

// Jira Export
export async function exportJiraCsv(analysisId: number, projectKey: string, issueType: string = "Story") {
  const params = new URLSearchParams({ projectKey, issueType });
  const res = await fetch(`${API_BASE}/analyses/${analysisId}/export/jira-csv?${params}`, {
    credentials: "include",
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
    throw new Error(error.message || `HTTP ${res.status}`);
  }

  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition");
  const filename = disposition?.match(/filename="(.+)"/)?.[1] || `scopesmith-${projectKey}-${analysisId}.csv`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Documents — project-level
export const getDocuments = (projectId: number) =>
  request<Document[]>(`/projects/${projectId}/documents`);
export const addDocument = (
  projectId: number,
  data: { filename: string; content: string; docType?: string }
) =>
  request<Document>(`/projects/${projectId}/documents`, {
    method: "POST",
    body: JSON.stringify(data),
  });
export const deleteDocument = (id: number) =>
  request<void>(`/documents/${id}`, { method: "DELETE" });
export const uploadDocument = async (projectId: number, file: File, docType: string): Promise<Document> => {
  await ensureCsrfToken();
  const csrfToken = readCookie(CSRF_COOKIE_NAME);
  const form = new FormData();
  form.append("file", file);
  form.append("docType", docType);
  const res = await fetch(`${API_BASE}/projects/${projectId}/documents/upload`, {
    method: "POST",
    body: form,
    credentials: "include",
    headers: csrfToken ? { [CSRF_HEADER_NAME]: csrfToken } : undefined,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};
export const uploadRequirementDocument = async (reqId: number, file: File, docType: string): Promise<Document> => {
  await ensureCsrfToken();
  const csrfToken = readCookie(CSRF_COOKIE_NAME);
  const form = new FormData();
  form.append("file", file);
  form.append("docType", docType);
  const res = await fetch(`${API_BASE}/requirements/${reqId}/documents/upload`, {
    method: "POST",
    body: form,
    credentials: "include",
    headers: csrfToken ? { [CSRF_HEADER_NAME]: csrfToken } : undefined,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

// Documents — requirement-level
export const getRequirementDocuments = (requirementId: number) =>
  request<Document[]>(`/requirements/${requirementId}/documents`);
export const addRequirementDocument = (
  requirementId: number,
  data: { filename: string; content: string; docType?: string }
) =>
  request<Document>(`/requirements/${requirementId}/documents`, {
    method: "POST",
    body: JSON.stringify(data),
  });

// AI Health
export const checkAiHealth = () =>
  request<{ status: string; response: string }>("/ai/health");

// ScopeSmith Self Assistant
export interface SelfAssistantRequest {
  question: string;
  projectId?: number;
}

export interface SelfAssistantEvidence {
  sourceType: string;
  sourceRef: string;
  detail: string;
}

export interface SelfAssistantAction {
  label: string;
  actionType: string;
  target: string;
}

export interface SelfAssistantResponse {
  answer: string;
  confidence: "HIGH" | "MEDIUM" | "LOW" | string;
  fallbackUsed: boolean;
  evidence: SelfAssistantEvidence[];
  actions: SelfAssistantAction[];
}

export const askSelfAssistant = (data: SelfAssistantRequest) =>
  request<SelfAssistantResponse>("/assistant/self-help", {
    method: "POST",
    body: JSON.stringify(data),
  });

// Types
export interface Project {
  id: number;
  name: string;
  description: string | null;
  repoUrl: string | null;
  localPath: string | null;
  hasContext: boolean;
  techContext: string | null;
  structuredContext: string | null;
  contextVersion: number;
  lastScannedAt: string | null;
  requirementCount: number;
  documentCount: number;
  integrationConfig: string | null;
  daysSinceLastScan: number | null;
  commitsBehind: number | null;
  contextStale: boolean;
  stalenessWarning: string | null;
  organizationId: number | null;
  organizationName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IntegrationConfig {
  jira?: {
    projectKey?: string;
    defaultIssueType?: string;
    categoryMode?: "LABELS_ONLY" | "COMPONENTS" | "BOTH";
    categoryMapping?: Record<string, string>;
  };
  github?: { repo?: string };
  preferredProvider?: "JIRA" | "GITHUB";
  serviceRouting?: Record<string, {
    preferredProvider?: "JIRA" | "GITHUB";
    jiraProjectKey?: string;
    githubRepo?: string;
    defaultIssueType?: string;
  }>;
}

export interface Requirement {
  id: number;
  projectId: number;
  rawText: string;
  type: "FEATURE" | "BUG";
  sequenceNumber: number;
  version: number;
  status: string;
  analysisCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Analysis {
  id: number;
  requirementId: number;
  structuredSummary: string;
  assumptions: string;
  riskLevel: string;
  riskReason: string;
  affectedModules: string;
  stakeholderSummary: string | null;
  requirementVersion: number;
  contextVersion: number | null;
  durationMs: number | null;
  modelTier: string | null;
  questions: Question[];
  createdAt: string;
}

export interface Question {
  id: number;
  questionText: string;
  suggestedAnswer: string | null;
  questionType: string | null; // OPEN, SINGLE_CHOICE, MULTIPLE_CHOICE
  options: string[] | null;
  answer: string | null;
  status: string;
}

export interface Task {
  id: number;
  analysisId: number;
  title: string;
  description: string;
  acceptanceCriteria: string;
  spSuggestion: number | null;
  spRationale: string | null;
  spFinal: number | null;
  spDivergenceReason?: string;
  priority: string;
  category: string | null;
  serviceId?: number | null;
  serviceName?: string | null;
  dependencyTitle: string | null;
  jiraKey: string | null;
  syncRefs?: Array<{
    id: number;
    provider: "JIRA" | "GITHUB";
    externalRef: string;
    target: string | null;
    syncState: string;
    lastVerifiedAt: string | null;
  }>;
  agentSessionId: string | null;
  agentStatus: string | null;
  agentBranch: string | null;
  createdAt: string;
}

export interface ChangeImpact {
  changeSummary: string;
  changes: string[];
  affectedTasks: string[];
  newTasksNeeded: string[];
  scopeImpact: string;
  newRiskLevel: string;
  riskReason: string;
  stakeholderSummary: string;
}

export interface ContextFreshness {
  status: "NO_BASELINE" | "FRESH" | "STALE";
  commitsBehind: number | null;
  changedFiles: number;
  impactedModules: string[];
  analysisFreshnessScore: number;
  contextConfidence: number;
  recommendation: "NO_ACTION" | "PARTIAL_REFRESH" | "FULL_REFRESH";
  reason: string;
}

export interface PartialRefreshResult {
  jobId?: number;
  status: "IDLE" | "RUNNING" | "DONE" | "FAILED";
  recommendation?: "NO_ACTION" | "PARTIAL_REFRESH" | "FULL_REFRESH";
  reason?: string;
  totalAnalyses?: number;
  processedAnalyses?: number;
  refreshedCount: number;
  refreshedRequirementIds?: number[];
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface PartialRefreshHistory {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  items: PartialRefreshResult[];
}

export type ServiceType = "BACKEND" | "FRONTEND" | "MOBILE" | "GATEWAY" | "DATA" | "PLATFORM" | "SHARED" | "OTHER";

export interface ProjectServiceRequest {
  name: string;
  serviceType?: ServiceType;
  repoUrl?: string;
  localPath?: string;
  defaultBranch?: string;
  ownerTeam?: string;
  active?: boolean;
}

export interface ProjectService {
  id: number;
  projectId: number;
  name: string;
  serviceType: ServiceType;
  repoUrl: string | null;
  localPath: string | null;
  defaultBranch: string | null;
  ownerTeam: string | null;
  active: boolean;
  contextVersion: number;
  lastScannedAt: string | null;
  lastScannedCommitHash: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceDependencyRequest {
  fromServiceId: number;
  toServiceId: number;
  dependencyType?: string;
}

export interface ServiceDependency {
  id: number;
  projectId: number;
  fromServiceId: number;
  fromServiceName: string;
  toServiceId: number;
  toServiceName: string;
  dependencyType: string;
  createdAt: string;
}

export interface ServiceGraph {
  projectId: number;
  services: ProjectService[];
  dependencies: ServiceDependency[];
}

export interface ServiceScanResult {
  serviceId: number;
  serviceName: string;
  status: "DONE";
  contextVersion: number;
  lastScannedAt: string | null;
  lastScannedCommitHash: string | null;
}

export interface FederatedContext {
  projectId: number;
  generatedAt: string;
  serviceCount: number;
  services: Array<{
    serviceId: number;
    name: string;
    serviceType: ServiceType;
    contextVersion: number;
    lastScannedAt: string | null;
    hasContext: boolean;
  }>;
  combinedContext: string;
}

export interface TraceabilityReport {
  projectId: number;
  generatedAt: string;
  summary: {
    totalRequirements: number;
    analyzedRequirements: number;
    requirementsWithTasks: number;
    totalTasks: number;
    approvedTasks: number;
    syncedTasks: number;
    syncCoveragePercent: number;
  };
  items: Array<{
    requirementId: number;
    requirementSeq: number | null;
    requirementType: string;
    requirementPreview: string;
    analysisId: number | null;
    analysisCreatedAt: string | null;
    taskCount: number;
    approvedTaskCount: number;
    syncedTaskCount: number;
    syncTargets: string[];
    tasks: Array<{
      taskId: number;
      title: string;
      spFinal: number | null;
      syncRef: string | null;
      syncTarget: string | null;
      syncStatus: "DRAFT" | "READY" | "SYNCED";
      syncRefs?: Array<{
        provider: "JIRA" | "GITHUB";
        externalRef: string;
        target: string | null;
        syncState: string;
      }>;
    }>;
  }>;
}

export interface Document {
  id: number;
  projectId: number;
  requirementId: number | null;
  filename: string;
  docType: string;
  summary: string | null;
  contentLength: number;
  createdAt: string;
}
