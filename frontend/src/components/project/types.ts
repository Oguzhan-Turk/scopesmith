import type {
  Project,
  IntegrationConfig,
  Requirement,
  Analysis,
  Task,
  Document,
  UsageSummary,
  TaskGroup,
  FeatureSuggestionResult,
} from "@/api/client";

export interface ProjectTabProps {
  project: Project;
  projectId: number;
  isAdmin: boolean;
  actionLoading: string | null;
  setActionLoading: (v: string | null) => void;
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
}

export interface RequirementsTabProps extends ProjectTabProps {
  requirements: Requirement[];
  selectedRequirementId: number | null;
  handleSelectRequirement: (reqId: number) => void;
  handleAnalyzeWithConfirm: (reqId: number, tier?: string) => void;
  handleDeleteRequirement: (reqId: number) => void;
  setActiveTab: (tab: string) => void;
  setReqDialogOpen: (open: boolean) => void;
}

export interface DetailTabProps extends ProjectTabProps {
  selectedRequirementId: number | null;
  selectedAnalysis: Analysis | null;
  setSelectedAnalysis: (a: Analysis | null) => void;
  isBug: boolean;
  answers: Record<number, string>;
  setAnswers: (fn: (prev: Record<number, string>) => Record<number, string>) => void;
  handleAnswer: (questionId: number) => void;
  handleDismiss: (questionId: number) => void;
  handleStakeholderSummary: () => void;
  summaryInstruction: string;
  setSummaryInstruction: (v: string) => void;
  handleRefineSummary: () => void;
  setActiveTab: (tab: string) => void;
}

export interface TasksTabProps extends ProjectTabProps {
  selectedRequirementId: number | null;
  selectedAnalysis: Analysis | null;
  tasks: Task[];
  setTasks: (fn: (prev: Task[]) => Task[]) => void;
  expandedTasks: Set<number>;
  toggleTask: (id: number) => void;
  integrationConfig: IntegrationConfig;
  handleGenerateTasks: () => void;
  handleSpDecision: (taskId: number, sp: number) => void;
  handleRefineTasks: () => void;
  handleSyncJira: () => void;
  handleSyncGitHub: () => void;
  handleExportCsv: () => void;
  handleVerifySync: () => void;
  taskInstruction: string;
  setTaskInstruction: (v: string) => void;
  setManualTaskDialog: (open: boolean) => void;
  setEditingTask: (task: Task | null) => void;
  setConfirmDialog: (d: { message: string; onConfirm: () => void } | null) => void;
  taskGroups: TaskGroup[];
  handleSelectRequirement: (reqId: number) => void;
  setActiveTab: (tab: string) => void;
  loadTasks: (analysisId: number) => void;
}

export interface ContextTabProps extends ProjectTabProps {
  handleScan: () => void;
  scanPath: string;
  gitUrl: string;
  scanMode: "local" | "git";
  documents: Document[];
  setDocDialog: (d: { type: "project" } | { type: "requirement"; reqId: number } | null) => void;
  handleDeleteDocument: (docId: number, reqId?: number) => void;
  featureSuggestions: FeatureSuggestionResult | null;
  setFeatureSuggestions: (v: FeatureSuggestionResult | null) => void;
  integrationConfig: IntegrationConfig;
  setActiveTab: (tab: string) => void;
}

export interface IntegrationsTabProps extends ProjectTabProps {
  integrationConfig: IntegrationConfig;
  setIntegrationConfig: (v: IntegrationConfig) => void;
  handleSaveIntegrationConfig: () => void;
  scanPath: string;
  setScanPath: (v: string) => void;
  scanMode: "local" | "git";
  setScanMode: (v: "local" | "git") => void;
  gitUrl: string;
  setGitUrl: (v: string) => void;
  gitToken: string;
  setGitToken: (v: string) => void;
}

export interface UsageTabProps extends ProjectTabProps {
  usageSummary: UsageSummary | null;
}
