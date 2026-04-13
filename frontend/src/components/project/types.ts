import type {
  Project,
  IntegrationConfig,
  Requirement,
  Analysis,
  Task,
  Document,
  UsageSummary,
  ContextFreshness,
  PartialRefreshResult,
  TraceabilityReport,
  ProjectService,
  ServiceGraph,
  ServiceType,
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
  loading?: boolean;
  selectedRequirementId: number | null;
  handleSelectRequirement: (reqId: number) => void;
  handleAnalyzeWithConfirm: (reqId: number, tier?: string) => void;
  handleDeleteRequirement: (reqId: number) => void;
  handleUpdateRequirement: (reqId: number, rawText: string, type: string) => void;
  setActiveTab: (tab: string) => void;
  setReqDialogOpen: (open: boolean) => void;
  traceability: TraceabilityReport | null;
}

export interface DetailTabProps extends ProjectTabProps {
  selectedRequirementId: number | null;
  selectedRequirement: Requirement | null;
  selectedAnalysis: Analysis | null;
  setSelectedAnalysis: (a: Analysis | null) => void;
  isBug: boolean;
  answers: Record<number, string>;
  setAnswers: (fn: (prev: Record<number, string>) => Record<number, string>) => void;
  handleAnswer: (questionId: number, answerOverride?: string) => void;
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
  handleSpDecision: (taskId: number, sp: number, divergenceReason?: string) => void;
  handleRefineTasks: () => void;
  handleSyncJira: () => void;
  handleSyncGitHub: () => void;
  handleExportCsv: () => void;
  handleVerifySync: () => void;
  taskInstruction: string;
  setTaskInstruction: (v: string) => void;
  setManualTaskDialog: (open: boolean) => void;
  setEditingTask: (task: Task | null) => void;
  projectServices: ProjectService[];
  setConfirmDialog: (d: { message: string; onConfirm: () => void } | null) => void;
  setActiveTab: (tab: string) => void;
  loadTasks: (analysisId: number) => void;
}

export interface ContextTabProps extends ProjectTabProps {
  handleScan: () => void;
  contextFreshness: ContextFreshness | null;
  partialRefreshStatus: PartialRefreshResult | null;
  partialRefreshHistory: PartialRefreshResult[];
  partialRefreshHasMore: boolean;
  partialRefreshLoadingMore: boolean;
  traceability: TraceabilityReport | null;
  onPartialRefresh: () => void;
  onLoadMorePartialRefreshHistory: () => void;
  scanPath: string;
  setScanPath: (v: string) => void;
  scanMode: "local" | "git";
  setScanMode: (v: "local" | "git") => void;
  gitUrl: string;
  setGitUrl: (v: string) => void;
  gitToken: string;
  setGitToken: (v: string) => void;
  documents: Document[];
  setDocDialog: (d: { type: "project" } | { type: "requirement"; reqId: number } | null) => void;
  handleDeleteDocument: (docId: number, reqId?: number) => void;
  integrationConfig: IntegrationConfig;
  setActiveTab: (tab: string) => void;
}

export interface IntegrationsTabProps extends ProjectTabProps {
  integrationConfig: IntegrationConfig;
  setIntegrationConfig: (v: IntegrationConfig) => void;
  handleSaveIntegrationConfig: () => void;
  handleUpdateProject: (name: string, description: string) => Promise<void>;
  onDeleteProject: () => void;
  // Workspace Services (multi-service projects)
  projectServices: ProjectService[];
  serviceGraph: ServiceGraph | null;
  newServiceForm: {
    name: string;
    serviceType: ServiceType;
    repoUrl: string;
    localPath: string;
    defaultBranch: string;
    ownerTeam: string;
  };
  setNewServiceForm: (v: {
    name: string;
    serviceType: ServiceType;
    repoUrl: string;
    localPath: string;
    defaultBranch: string;
    ownerTeam: string;
  }) => void;
  handleCreateService: () => Promise<void>;
  handleDeleteService: (serviceId: number) => Promise<void>;
  handleScanService: (serviceId: number) => Promise<void>;
  dependencyForm: { fromServiceId: number | ""; toServiceId: number | ""; dependencyType: string };
  setDependencyForm: (v: { fromServiceId: number | ""; toServiceId: number | ""; dependencyType: string }) => void;
  handleAddDependency: () => Promise<void>;
  handleDeleteDependency: (dependencyId: number) => Promise<void>;
}

export interface UsageTabProps extends ProjectTabProps {
  usageSummary: UsageSummary | null;
}
