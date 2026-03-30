const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8080/api/v1";
const DEFAULT_TIMEOUT_MS = 60_000;

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { "Content-Type": "application/json" },
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

// Projects
export const getProjects = () => request<Project[]>("/projects");
export const getProject = (id: number) => request<Project>(`/projects/${id}`);
export const createProject = (data: { name: string; description?: string }) =>
  request<Project>("/projects", { method: "POST", body: JSON.stringify(data) });
export const scanProject = (id: number, folderPath: string) =>
  request<Project>(`/projects/${id}/scan`, {
    method: "POST",
    body: JSON.stringify({ folderPath }),
  });
export const scanProjectGit = (id: number, gitUrl: string, token?: string) =>
  request<Project>(`/projects/${id}/scan-git`, {
    method: "POST",
    body: JSON.stringify({ gitUrl, token }),
  });

// Credentials
export const getCredentials = () => request<Record<string, string>>("/settings/credentials");
export const updateCredentials = (data: Record<string, string>) =>
  request<Record<string, string>>("/settings/credentials", {
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
export const analyzeRequirement = (id: number) =>
  request<Analysis>(`/requirements/${id}/analyze`, { method: "POST" });
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
export const setSpDecision = (taskId: number, spFinal: number) =>
  request<Task>(`/tasks/${taskId}/sp-decision`, {
    method: "PUT",
    body: JSON.stringify({ spFinal }),
  });

// Analysis retrieval
export const getAnalysesByRequirement = (requirementId: number) =>
  request<Analysis[]>(`/requirements/${requirementId}/analyses`);
export const getAnalysis = (analysisId: number) =>
  request<Analysis>(`/analyses/${analysisId}`);
export const getTasksByAnalysis = (analysisId: number) =>
  request<Task[]>(`/analyses/${analysisId}/tasks`);

export const refineTasks = (analysisId: number, instruction: string) =>
  request<Task[]>(`/analyses/${analysisId}/tasks/refine`, {
    method: "POST",
    body: JSON.stringify({ instruction }),
  });

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
export const syncToGitHub = (analysisId: number, repo?: string) =>
  request<GitHubSyncResult>(`/analyses/${analysisId}/sync/github`, {
    method: "POST",
    body: JSON.stringify({ repo }),
  });

export interface GitHubSyncResult {
  totalTasks: number;
  created: number;
  failed: number;
  issues: Array<{ taskId: string; issueNumber: string; status: string }>;
  errors?: Array<{ taskId: string; title: string; error: string }>;
}

// Jira Sync
export const syncToJira = (analysisId: number, projectKey?: string, issueType?: string) =>
  request<JiraSyncResult>(`/analyses/${analysisId}/sync/jira`, {
    method: "POST",
    body: JSON.stringify({ projectKey, issueType }),
  });

export interface JiraSyncResult {
  totalTasks: number;
  created: number;
  failed: number;
  issues: Array<{ taskId: string; jiraKey: string; status: string }>;
  errors?: Array<{ taskId: string; title: string; error: string }>;
}

// Jira Export
export async function exportJiraCsv(analysisId: number, projectKey: string, issueType: string = "Story") {
  const params = new URLSearchParams({ projectKey, issueType });
  const res = await fetch(`${API_BASE}/analyses/${analysisId}/export/jira-csv?${params}`);

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

// Documents
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

// AI Health
export const checkAiHealth = () =>
  request<{ status: string; response: string }>("/ai/health");

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
  createdAt: string;
  updatedAt: string;
}

export interface IntegrationConfig {
  jira?: { projectKey?: string; defaultIssueType?: string };
  github?: { repo?: string };
  preferredProvider?: "JIRA" | "GITHUB";
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
  durationMs: number | null;
  questions: Question[];
  createdAt: string;
}

export interface Question {
  id: number;
  questionText: string;
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
  priority: string;
  dependencyTitle: string | null;
  jiraKey: string | null;
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

export interface Document {
  id: number;
  projectId: number;
  filename: string;
  docType: string;
  contentLength: number;
  createdAt: string;
}
