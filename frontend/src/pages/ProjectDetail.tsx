import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import {
  getProject,
  getRequirements,
  createRequirement,
  deleteRequirement,
  analyzeRequirement,
  answerQuestion,
  dismissQuestion,
  generateTasks,
  createManualTask,
  generateStakeholderSummary,
  refineStakeholderSummary,
  refineTasks,
  setSpDecision,
  updateTask,
  exportJiraCsv,
  verifySyncStatus,
  syncToJira,
  syncToGitHub,
  getAnalysesByRequirement,
  getTasksByAnalysis,
  scanProject,
  scanProjectGit,
  getScanStatus,
  getContextFreshness,
  runPartialRefresh,
  getPartialRefreshStatus,
  getPartialRefreshJobs,
  getTraceability,
  getProjectServices,
  createProjectService,
  deleteProjectService,
  scanProjectService,
  getServiceGraph,
  addServiceDependency,
  deleteServiceDependency,
  getIntegrationConfig,
  updateIntegrationConfig,
  getProjectUsage,
  getDocuments,
  addDocument,
  deleteDocument,
  uploadDocument,
  addRequirementDocument,
  uploadRequirementDocument,
  updateProject,
  suggestFeatures,
  type UsageSummary,
  type FeatureSuggestionResult,
  type Project,
  type IntegrationConfig,
  type Requirement,
  type Analysis,
  type Task,
  type Document,
  type ContextFreshness,
  type PartialRefreshResult,
  type TraceabilityReport,
  type ProjectService,
  type ServiceGraph,
  type ServiceType,
} from "@/api/client";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/hooks/useToast";
import { useAuth } from "@/hooks/useAuth";

import RequirementsTab from "@/components/project/RequirementsTab";
import DetailTab from "@/components/project/DetailTab";
import TasksTab from "@/components/project/TasksTab";
import ContextTab from "@/components/project/ContextTab";
import IntegrationsTab from "@/components/project/IntegrationsTab";
import UsageTab from "@/components/project/UsageTab";
import DeleteProjectDialog from "@/components/project/DeleteProjectDialog";
import EditTaskDialog from "@/components/project/dialogs/EditTaskDialog";
import ManualTaskDialog from "@/components/project/dialogs/ManualTaskDialog";
import ConfirmDialog from "@/components/project/dialogs/ConfirmDialog";
import ReqDialog from "@/components/project/dialogs/ReqDialog";
import DocDialog from "@/components/project/dialogs/DocDialog";
import ScopeSmithAssistantWidget from "@/components/project/ScopeSmithAssistantWidget";
import { getFeatures } from "@/api/client";

const LOADING_LABELS: Record<string, string> = {
  scan: "Proje taranıyor... Bu birkaç dakika sürebilir.",
  tasks: "Task'lar AI tarafından üretiliyor...",
  summary: "İş özeti hazırlanıyor...",
  "refine-summary": "Özet iyileştiriliyor...",
  "refine-tasks": "Task'lar iyileştiriliyor...",
  "re-analyze": "Tüm sorular cevaplandı, yeniden analiz yapılıyor...",
  "partial-refresh": "Etkilenen talepler için kısmi yeniden analiz yapılıyor...",
};

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const projectId = Number(id);
  const { showToast } = useToast();
  const { isAdmin } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [selectedRequirementId, setSelectedRequirementId] = useState<number | null>(null);
  const [, setAnalyses] = useState<Analysis[]>([]);
  const [selectedAnalysis, setSelectedAnalysis] = useState<Analysis | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);

  const [newRequirement, setNewRequirement] = useState("");
  const [newRequirementType, setNewRequirementType] = useState<"FEATURE" | "BUG">("FEATURE");
  const [scanPath, setScanPath] = useState("");
  const [scanMode, setScanMode] = useState<"local" | "git">("local");
  const [gitUrl, setGitUrl] = useState("");
  const [scanFieldsInitialized, setScanFieldsInitialized] = useState(false);
  const [gitToken, setGitToken] = useState("");
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [summaryInstruction, setSummaryInstruction] = useState("");
  const [taskInstruction, setTaskInstruction] = useState("");
  const [integrationConfig, setIntegrationConfig] = useState<IntegrationConfig>({});
  const [projectServices, setProjectServices] = useState<ProjectService[]>([]);
  const [serviceGraph, setServiceGraph] = useState<ServiceGraph | null>(null);
  const [newServiceForm, setNewServiceForm] = useState<{
    name: string;
    serviceType: ServiceType;
    repoUrl: string;
    localPath: string;
    defaultBranch: string;
    ownerTeam: string;
  }>({
    name: "",
    serviceType: "OTHER",
    repoUrl: "",
    localPath: "",
    defaultBranch: "main",
    ownerTeam: "",
  });
  const [dependencyForm, setDependencyForm] = useState<{ fromServiceId: number | ""; toServiceId: number | ""; dependencyType: string }>({
    fromServiceId: "",
    toServiceId: "",
    dependencyType: "SYNC",
  });
  const [confirmDialog, setConfirmDialog] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [usageSummary, setUsageSummary] = useState<UsageSummary | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selfAssistantEnabled, setSelfAssistantEnabled] = useState(false);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [manualTaskDialog, setManualTaskDialog] = useState(false);
  const [manualTaskForm, setManualTaskForm] = useState({ title: "", description: "", priority: "MEDIUM", category: "", serviceId: "" as number | "" });
  const [expandedTasks, setExpandedTasks] = useState<Set<number>>(new Set());
  const [documents, setDocuments] = useState<Document[]>([]);
  const [docForm, setDocForm] = useState({ filename: "", content: "", docType: "OTHER" });
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docMode, setDocMode] = useState<"file" | "paste">("file");
  const [reqDialogOpen, setReqDialogOpen] = useState(false);
  const [docDialog, setDocDialog] = useState<{ type: "project" } | { type: "requirement"; reqId: number } | null>(null);
  const [reqDocs, setReqDocs] = useState<Record<number, Document[]>>({});
  const [featureSuggestions, setFeatureSuggestions] = useState<FeatureSuggestionResult | null>(null);
  const [contextFreshness, setContextFreshness] = useState<ContextFreshness | null>(null);
  const [partialRefreshStatus, setPartialRefreshStatus] = useState<PartialRefreshResult | null>(null);
  const [partialRefreshHistory, setPartialRefreshHistory] = useState<PartialRefreshResult[]>([]);
  const [partialRefreshHistoryPage, setPartialRefreshHistoryPage] = useState(0);
  const [partialRefreshHistoryTotalPages, setPartialRefreshHistoryTotalPages] = useState(0);
  const [partialRefreshLoadingMore, setPartialRefreshLoadingMore] = useState(false);
  const [traceability, setTraceability] = useState<TraceabilityReport | null>(null);

  function normalizeHistoryResponse(
    value: unknown,
  ): { page: number; totalPages: number; items: PartialRefreshResult[] } {
    if (Array.isArray(value)) {
      return { page: 0, totalPages: 1, items: value as PartialRefreshResult[] };
    }
    if (value && typeof value === "object") {
      const maybe = value as { page?: number; totalPages?: number; items?: PartialRefreshResult[] };
      return {
        page: maybe.page ?? 0,
        totalPages: maybe.totalPages ?? 0,
        items: Array.isArray(maybe.items) ? maybe.items : [],
      };
    }
    return { page: 0, totalPages: 0, items: [] };
  }

  // Guard against stale responses when navigating between projects
  const loadIdRef = useRef(0);

  function toggleTask(id: number) {
    setExpandedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  // Tab state from URL
  const activeTab = searchParams.get("tab") || "requirements";
  function setActiveTab(tab: string) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tab", tab);
      return next;
    }, { replace: true });
  }

  useEffect(() => {
    async function loadProject() {
      const currentLoadId = ++loadIdRef.current;
      try {
        const [proj, reqs, config, usage, docs, freshness, refreshStatus, refreshHistory, traceabilityResult, services, graph, features] = await Promise.all([
          getProject(projectId),
          getRequirements(projectId),
          getIntegrationConfig(projectId).catch(() => ({})),
          getProjectUsage(projectId).catch(() => null),
          getDocuments(projectId).catch(() => []),
          getContextFreshness(projectId).catch(() => null),
          getPartialRefreshStatus(projectId).catch(() => null),
          getPartialRefreshJobs(projectId, 0, 5).catch(() => ({ page: 0, size: 5, totalElements: 0, totalPages: 0, items: [] })),
          getTraceability(projectId).catch(() => null),
          getProjectServices(projectId).catch(() => []),
          getServiceGraph(projectId).catch(() => null),
          getFeatures().catch(() => ({ managedAgentEnabled: false, selfAssistantEnabled: false })),
        ]);
        // Stale response guard — discard if user navigated away
        if (currentLoadId !== loadIdRef.current) return;
        setProject(proj);
        setRequirements(reqs);
        setIntegrationConfig(config);
        setUsageSummary(usage);
        setDocuments(docs);
        setContextFreshness(freshness);
        setPartialRefreshStatus(refreshStatus);
        const normalizedHistory = normalizeHistoryResponse(refreshHistory);
        setPartialRefreshHistory(normalizedHistory.items);
        setPartialRefreshHistoryPage(normalizedHistory.page);
        setPartialRefreshHistoryTotalPages(normalizedHistory.totalPages);
        setTraceability(traceabilityResult);
        setProjectServices(services);
        setServiceGraph(graph);
        setSelfAssistantEnabled(features.selfAssistantEnabled);
        if (!scanFieldsInitialized) {
          if (proj.repoUrl) { setGitUrl(proj.repoUrl); setScanMode("git"); }
          else if (proj.localPath) { setScanPath(proj.localPath); setScanMode("local"); }
          setScanFieldsInitialized(true);
        }
      } catch (e) {
        showToast("Proje yüklenemedi. Lütfen sayfayı yenileyin.");
        console.error("Failed to load project:", e);
      } finally {
        setLoading(false);
      }
    }

    void loadProject();
  }, [projectId, scanFieldsInitialized, showToast]);

  const loadTasks = useCallback(async (analysisId: number) => {
    try {
      const result = await getTasksByAnalysis(analysisId);
      setTasks(result);
    } catch (e) {
      showToast("Task'lar yüklenemedi.");
      console.error("Failed to load tasks:", e);
    }
  }, [showToast]);

  const loadAnalyses = useCallback(async (requirementId: number) => {
    try {
      const result = await getAnalysesByRequirement(requirementId);
      setAnalyses(result);
      if (result.length > 0) {
        const latest = result[0];
        setSelectedAnalysis(latest);
        await loadTasks(latest.id);
      } else {
        setSelectedAnalysis(null);
        setTasks([]);
      }
    } catch (e) {
      showToast("Analizler yüklenemedi.");
      console.error("Failed to load analyses:", e);
    }
  }, [loadTasks, showToast]);

  const handleSelectRequirement = useCallback((reqId: number) => {
    if (reqId === -1) {
      // deselect
      setSelectedRequirementId(null);
      setSelectedAnalysis(null);
      setTasks([]);
      setAnalyses([]);
      return;
    }
    setSelectedRequirementId(reqId);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("req", String(reqId));
      return next;
    }, { replace: true });
    void loadAnalyses(reqId);
  }, [loadAnalyses, setSearchParams]);

  // Restore requirement selection from URL
  useEffect(() => {
    const reqId = searchParams.get("req");
    if (reqId && requirements.length > 0 && !selectedRequirementId) {
      handleSelectRequirement(Number(reqId));
    }
  }, [handleSelectRequirement, requirements, searchParams, selectedRequirementId]);

  async function handleDeleteRequirement(reqId: number) {
    setConfirmDialog({
      message: "Bu talebi ve tüm analizlerini silmek istediğinizden emin misiniz?",
      onConfirm: () => executeDeleteRequirement(reqId),
    });
  }

  async function executeDeleteRequirement(reqId: number) {
    try {
      await deleteRequirement(reqId);
      const reqs = await getRequirements(projectId);
      setRequirements(reqs);
      if (selectedRequirementId === reqId) {
        setSelectedRequirementId(null);
        setSelectedAnalysis(null);
        setTasks([]);
        setAnalyses([]);
      }
      showToast("Talep silindi.", "success");
    } catch (e) {
      showToast("Talep silinemedi.");
      console.error("Delete failed:", e);
    }
  }

  async function handleScan() {
    if (scanMode === "git") {
      if (!gitUrl.trim()) { showToast("Proje Ayarları sekmesinden Git URL'i ayarlayın.", "info"); return; }
    } else {
      if (!scanPath.trim()) { showToast("Proje Ayarları sekmesinden klasör yolunu ayarlayın.", "info"); return; }
    }
    setActionLoading("scan");
    try {
      // Start async scan — backend returns 202 immediately
      if (scanMode === "git") {
        await scanProjectGit(projectId, gitUrl.trim(), gitToken.trim() || undefined);
      } else {
        await scanProject(projectId, scanPath.trim());
      }
      // Poll for completion every 3 seconds
      await new Promise<void>((resolve, reject) => {
        const interval = setInterval(async () => {
          try {
            const { status, error } = await getScanStatus(projectId);
            if (status === "IDLE") {
              clearInterval(interval);
              resolve();
            } else if (status === "FAILED") {
              clearInterval(interval);
              reject(new Error(error || "Tarama başarısız oldu."));
            }
            // SCANNING → keep polling
          } catch {
            clearInterval(interval);
            reject(new Error("Durum sorgulanamadı."));
          }
        }, 3000);
      });
      // Scan done — reload project + usage
      const updated = await getProject(projectId);
      setProject(updated);
      getContextFreshness(projectId).then(setContextFreshness).catch(() => {});
      getPartialRefreshStatus(projectId).then(setPartialRefreshStatus).catch(() => {});
      getPartialRefreshJobs(projectId, 0, 5).then((res) => {
        const normalized = normalizeHistoryResponse(res);
        setPartialRefreshHistory(normalized.items);
        setPartialRefreshHistoryPage(normalized.page);
        setPartialRefreshHistoryTotalPages(normalized.totalPages);
      }).catch(() => {});
      getProjectUsage(projectId).then(setUsageSummary).catch(() => {});
      showToast("Proje başarıyla tarandı.", "success");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Tarama başarısız oldu.";
      showToast(msg);
      console.error("Scan failed:", e);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleCreateRequirement() {
    if (!newRequirement.trim()) return;
    setActionLoading("create-req");
    try {
      await createRequirement(projectId, newRequirement, newRequirementType);
      setNewRequirement("");
      setNewRequirementType("FEATURE");
      const reqs = await getRequirements(projectId);
      setRequirements(reqs);
      showToast("Talep eklendi.", "success");
    } catch (e) {
      showToast("Talep eklenemedi.");
      console.error("Failed to create requirement:", e);
    } finally {
      setActionLoading(null);
    }
  }

  function handleAnalyzeWithConfirm(reqId: number, tier?: string) {
    if (!project?.hasContext) {
      showToast("Proje context'i oluşturulmamış. Bağlam sekmesinden tarama yaparak daha isabetli analiz alabilirsiniz.", "info");
    } else if (project?.contextStale) {
      showToast("Proje context'i güncel değil. Sonuçlar yanıltıcı olabilir.", "info");
    }

    const req = requirements.find((r) => r.id === reqId);
    const isReanalyze = req && req.status !== "DRAFT" && req.status !== "ANALYZING";
    if (isReanalyze) {
      setConfirmDialog({
        message: "Yeniden analiz başlatmak üzeresiniz.\n\n• Mevcut analiz sonuçları yeni analizle değiştirilecek\n• Üretilmiş task'lar sıfırlanacak\n• Jira/GitHub'a gönderilmiş issue'lar etkilenmez, ancak bağlantıları kopabilir\n\nDevam etmek istiyor musunuz?",
        onConfirm: () => handleAnalyze(reqId, tier),
      });
    } else {
      handleAnalyze(reqId, tier);
    }
  }

  async function handleAnalyze(reqId: number, tier?: string) {
    setActionLoading(`analyze-${reqId}`);
    try {
      const analysis = await analyzeRequirement(reqId, tier);
      setSelectedRequirementId(reqId);
      setSelectedAnalysis(analysis);
      setTasks([]);
      const updatedAnalyses = await getAnalysesByRequirement(reqId);
      setAnalyses(updatedAnalyses);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set("req", String(reqId));
        next.set("tab", "detail");
        return next;
      }, { replace: true });
      showToast("Analiz tamamlandı.", "success");
      // Refresh usage after analysis
      getProjectUsage(projectId).then(setUsageSummary).catch(() => {});
      // Refresh requirements to update status
      getRequirements(projectId).then(setRequirements).catch(() => {});
    } catch (e) {
      showToast("Analiz başarısız oldu. AI servisi yanıt vermemiş olabilir.");
      console.error("Analysis failed:", e);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleAnswer(questionId: number, answerOverride?: string) {
    const answer = answerOverride ?? answers[questionId];
    if (!answer?.trim()) return;
    const openCount = selectedAnalysis?.questions.filter((q) => q.status === "OPEN").length ?? 0;
    const isLast = openCount === 1;
    setActionLoading(isLast ? "re-analyze" : `answer-${questionId}`);
    try {
      const updated = await answerQuestion(questionId, answer);
      setSelectedAnalysis(updated);
      setAnalyses((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      setAnswers((prev) => ({ ...prev, [questionId]: "" }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      showToast(`Cevap gönderilemedi: ${msg}`);
      console.error("Failed to answer:", e);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDismiss(questionId: number) {
    setActionLoading(`dismiss-${questionId}`);
    try {
      const updated = await dismissQuestion(questionId);
      setSelectedAnalysis(updated);
      setAnalyses((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    } catch (e) {
      showToast("İşlem başarısız oldu.");
      console.error("Failed to dismiss:", e);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleGenerateTasks() {
    if (!selectedAnalysis) return;
    setActionLoading("tasks");
    try {
      const generated = await generateTasks(selectedAnalysis.id);
      setTasks(generated);
      setActiveTab("tasks");
      showToast(`${generated.length} task üretildi.`, "success");
      getProjectUsage(projectId).then(setUsageSummary).catch(() => {});
    } catch (e) {
      showToast("Task üretimi başarısız oldu.");
      console.error("Task generation failed:", e);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleCreateManualTask() {
    if (!selectedAnalysis || !manualTaskForm.title.trim()) return;
    setActionLoading("manual-task");
    try {
      const created = await createManualTask(selectedAnalysis.id, {
        title: manualTaskForm.title.trim(),
        description: manualTaskForm.description || undefined,
        priority: manualTaskForm.priority,
        category: manualTaskForm.category || undefined,
        serviceId: manualTaskForm.serviceId === "" ? undefined : manualTaskForm.serviceId,
      });
      if (manualTaskForm.serviceId !== "" && created.serviceId !== manualTaskForm.serviceId) {
        const updated = await updateTask(created.id, { serviceId: manualTaskForm.serviceId });
        setTasks((prev) => [...prev, updated]);
      } else {
        setTasks((prev) => [...prev, created]);
      }
      setManualTaskForm({ title: "", description: "", priority: "MEDIUM", category: "", serviceId: "" });
      setManualTaskDialog(false);
      showToast("Task eklendi.", "success");
    } catch (e) {
      showToast("Task eklenemedi.");
      console.error("Manual task creation failed:", e);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleStakeholderSummary() {
    if (!selectedAnalysis) return;
    setActionLoading("summary");
    try {
      const result = await generateStakeholderSummary(selectedAnalysis.id);
      setSelectedAnalysis({ ...selectedAnalysis, stakeholderSummary: result.summary });
      setAnalyses((prev) =>
        prev.map((a) =>
          a.id === selectedAnalysis.id ? { ...a, stakeholderSummary: result.summary } : a
        )
      );
      showToast("İş özeti hazır.", "success");
    } catch (e) {
      showToast("Özet oluşturulamadı.");
      console.error("Summary failed:", e);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleSyncGitHub() {
    if (!selectedAnalysis) return;
    setActionLoading("github-sync");
    try {
      const result = await syncToGitHub(selectedAnalysis.id, integrationConfig.github?.repo);
      if (result.failed > 0) {
        showToast(`${result.created} issue oluşturuldu, ${result.failed} başarısız.`);
      } else {
        showToast(`${result.created} issue GitHub'da oluşturuldu!`, "success");
      }
      await loadTasks(selectedAnalysis.id);
      getTraceability(projectId).then(setTraceability).catch(() => {});
    } catch (e) {
      const msg = e instanceof Error ? e.message : "GitHub sync başarısız oldu.";
      showToast(msg);
      console.error("GitHub sync failed:", e);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleSaveTask() {
    if (!editingTask) return;
    try {
      const updated = await updateTask(editingTask.id, {
        title: editingTask.title,
        description: editingTask.description,
        acceptanceCriteria: editingTask.acceptanceCriteria,
        priority: editingTask.priority,
        category: editingTask.category ?? "",
        serviceId: editingTask.serviceId ?? 0,
      });
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setEditingTask(null);
      showToast("Task güncellendi.", "success");
    } catch {
      showToast("Task güncellenemedi.");
    }
  }

  async function handleSpDecision(taskId: number, spFinal: number, divergenceReason?: string) {
    try {
      const updated = await setSpDecision(taskId, spFinal, divergenceReason);
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } catch (e) {
      showToast("SP kararı kaydedilemedi.");
      console.error("SP decision failed:", e);
    }
  }

  async function handleVerifySync() {
    if (!selectedAnalysis) return;
    setActionLoading("verify-sync");
    try {
      const result = await verifySyncStatus(selectedAnalysis.id);
      const jiraCleared = result.jira?.cleared || 0;
      const githubCleared = result.github?.cleared || 0;
      const total = jiraCleared + githubCleared;
      if (total > 0) {
        showToast(`${total} task'ın sync durumu güncellendi (kapalı/silinmiş issue'lar temizlendi).`, "success");
        await loadTasks(selectedAnalysis.id);
      } else {
        showToast("Tüm sync'ler güncel.", "info");
      }
    } catch (e) {
      showToast("Sync durumu kontrol edilemedi.");
      console.error("Verify sync failed:", e);
    } finally {
      setActionLoading(null);
    }
  }

  function handleRefineTasks() {
    if (!selectedAnalysis || !taskInstruction.trim()) return;

    const hasSynced = tasks.some((t) => (t.syncRefs?.some((r) => r.syncState === "SYNCED") ?? false) || !!t.jiraKey);
    if (hasSynced) {
      setConfirmDialog({
        message: `${tasks.filter((t) => (t.syncRefs?.some((r) => r.syncState === "SYNCED") ?? false) || !!t.jiraKey).length} task Jira/GitHub'da oluşturulmuş. İyileştirme sonrası aynı başlıklı task'ların bağlantısı korunur, değişen task'ların issue'ları yetim kalır. Devam?`,
        onConfirm: () => executeRefineTasks(),
      });
    } else {
      executeRefineTasks();
    }
  }

  async function executeRefineTasks() {
    if (!selectedAnalysis || !taskInstruction.trim()) return;
    setActionLoading("refine-tasks");
    try {
      const result = await refineTasks(selectedAnalysis.id, taskInstruction);
      setTasks(result.tasks);
      setTaskInstruction("");

      if (result.orphanedIssues.length > 0) {
        showToast(`Task'lar iyileştirildi. ${result.orphanedIssues.length} issue yetim kaldı: ${result.orphanedIssues.join(", ")}. Bu issue'ları manuel kapatmanız gerekebilir.`);
      } else {
        showToast(`Task'lar iyileştirildi. ${result.preservedIssues.length} issue bağlantısı korundu.`, "success");
      }
    } catch (e) {
      showToast("Task iyileştirme başarısız oldu.");
      console.error("Task refinement failed:", e);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRefineSummary() {
    if (!selectedAnalysis || !summaryInstruction.trim()) return;
    setActionLoading("refine-summary");
    try {
      const result = await refineStakeholderSummary(selectedAnalysis.id, summaryInstruction);
      setSelectedAnalysis({ ...selectedAnalysis, stakeholderSummary: result.summary });
      setAnalyses((prev) =>
        prev.map((a) =>
          a.id === selectedAnalysis.id ? { ...a, stakeholderSummary: result.summary } : a
        )
      );
      setSummaryInstruction("");
      showToast("Özet iyileştirildi.", "success");
    } catch (e) {
      showToast("Özet iyileştirme başarısız oldu.");
      console.error("Summary refinement failed:", e);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleExportCsv() {
    if (!selectedAnalysis) return;
    const key = integrationConfig.jira?.projectKey;
    if (!key) { showToast("Önce Proje Ayarları sekmesinden Jira proje key'ini ayarlayın."); return; }
    setActionLoading("export");
    try {
      await exportJiraCsv(selectedAnalysis.id, key, integrationConfig.jira?.defaultIssueType || "Story");
      showToast("CSV dosyası indirildi.", "success");
    } catch (e) {
      showToast("Export başarısız oldu.");
      console.error("Export failed:", e);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleSyncJira() {
    if (!selectedAnalysis) return;
    const key = integrationConfig.jira?.projectKey;
    if (!key) { showToast("Önce Proje Ayarları sekmesinden Jira proje key'ini ayarlayın."); return; }
    setActionLoading("jira-sync");
    try {
      const result = await syncToJira(selectedAnalysis.id, key, integrationConfig.jira?.defaultIssueType || "Task");
      if (result.failed > 0) {
        showToast(`${result.created} issue oluşturuldu, ${result.failed} başarısız.`);
      } else {
        showToast(`${result.created} issue Jira'da oluşturuldu! (${key})`, "success");
      }
      await loadTasks(selectedAnalysis.id);
      getTraceability(projectId).then(setTraceability).catch(() => {});
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Jira sync başarısız oldu.";
      showToast(msg);
      console.error("Jira sync failed:", e);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleSaveIntegrationConfig() {
    setActionLoading("save-config");
    try {
      const saved = await updateIntegrationConfig(projectId, integrationConfig);
      setIntegrationConfig(saved);
      showToast("Entegrasyon ayarları kaydedildi.", "success");
    } catch (e) {
      showToast("Ayarlar kaydedilemedi.");
      console.error("Save config failed:", e);
    } finally {
      setActionLoading(null);
    }
  }

  async function refreshServiceRegistry() {
    const [services, graph] = await Promise.all([
      getProjectServices(projectId).catch(() => []),
      getServiceGraph(projectId).catch(() => null),
    ]);
    setProjectServices(services);
    setServiceGraph(graph);
  }

  async function handleCreateService() {
    if (!newServiceForm.name.trim()) {
      showToast("Service adı zorunlu.");
      return;
    }
    setActionLoading("create-service");
    try {
      await createProjectService(projectId, {
        name: newServiceForm.name.trim(),
        serviceType: newServiceForm.serviceType,
        repoUrl: newServiceForm.repoUrl.trim() || undefined,
        localPath: newServiceForm.localPath.trim() || undefined,
        defaultBranch: newServiceForm.defaultBranch.trim() || undefined,
        ownerTeam: newServiceForm.ownerTeam.trim() || undefined,
      });
      setNewServiceForm({
        name: "",
        serviceType: "OTHER",
        repoUrl: "",
        localPath: "",
        defaultBranch: "main",
        ownerTeam: "",
      });
      await refreshServiceRegistry();
      showToast("Service eklendi.", "success");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Service eklenemedi.";
      showToast(msg);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDeleteService(serviceId: number) {
    setActionLoading(`delete-service-${serviceId}`);
    try {
      await deleteProjectService(projectId, serviceId);
      await refreshServiceRegistry();
      showToast("Service silindi.", "success");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Service silinemedi.";
      showToast(msg);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleScanService(serviceId: number) {
    const service = projectServices.find((s) => s.id === serviceId);
    if (!service) return;
    setActionLoading(`scan-service-${serviceId}`);
    try {
      await scanProjectService(projectId, serviceId, service.localPath || undefined);
      await refreshServiceRegistry();
      showToast(`${service.name} için service context güncellendi.`, "success");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Service scan başarısız.";
      showToast(msg);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleAddDependency() {
    if (!dependencyForm.fromServiceId || !dependencyForm.toServiceId) {
      showToast("Kaynak ve hedef service seçin.");
      return;
    }
    setActionLoading("add-service-dependency");
    try {
      await addServiceDependency(projectId, {
        fromServiceId: Number(dependencyForm.fromServiceId),
        toServiceId: Number(dependencyForm.toServiceId),
        dependencyType: dependencyForm.dependencyType,
      });
      setDependencyForm({ fromServiceId: "", toServiceId: "", dependencyType: "SYNC" });
      await refreshServiceRegistry();
      showToast("Service bağımlılığı eklendi.", "success");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Bağımlılık eklenemedi.";
      showToast(msg);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDeleteDependency(dependencyId: number) {
    setActionLoading(`delete-dependency-${dependencyId}`);
    try {
      await deleteServiceDependency(projectId, dependencyId);
      await refreshServiceRegistry();
      showToast("Service bağımlılığı silindi.", "success");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Bağımlılık silinemedi.";
      showToast(msg);
    } finally {
      setActionLoading(null);
    }
  }

  async function handlePartialRefresh() {
    setActionLoading("partial-refresh");
    try {
      const started = await runPartialRefresh(projectId, { maxAnalyses: 5 });
      setPartialRefreshStatus(started);

      if (started.status !== "RUNNING") {
        if (started.status === "DONE" && (started.recommendation === "NO_ACTION" || started.totalAnalyses === 0)) {
          showToast("Partial refresh gerektiren etkilenmiş analiz bulunmadı.", "info");
        } else if (started.status === "FAILED") {
          showToast(started.error || "Partial refresh başlatılamadı.");
        }
        return;
      }

      await new Promise<void>((resolve, reject) => {
        const interval = setInterval(async () => {
          try {
            const status = await getPartialRefreshStatus(projectId);
            setPartialRefreshStatus(status);

            if (status.status === "DONE") {
              clearInterval(interval);
              resolve();
            } else if (status.status === "FAILED") {
              clearInterval(interval);
              reject(new Error(status.error || "Partial refresh başarısız."));
            }
          } catch {
            clearInterval(interval);
            reject(new Error("Partial refresh durumu alınamadı."));
          }
        }, 2500);
      });

      const [proj, reqs, freshness] = await Promise.all([
        getProject(projectId),
        getRequirements(projectId),
        getContextFreshness(projectId).catch(() => null),
      ]);
      setProject(proj);
      setRequirements(reqs);
      setContextFreshness(freshness);
      const latest = await getPartialRefreshStatus(projectId).catch(() => null);
      if (latest) setPartialRefreshStatus(latest);
      getPartialRefreshJobs(projectId, 0, 5).then((res) => {
        const normalized = normalizeHistoryResponse(res);
        setPartialRefreshHistory(normalized.items);
        setPartialRefreshHistoryPage(normalized.page);
        setPartialRefreshHistoryTotalPages(normalized.totalPages);
      }).catch(() => {});

      const refreshed = latest?.refreshedCount ?? 0;
      showToast(
        refreshed > 0
          ? `${refreshed} talep için kısmi yeniden analiz tamamlandı.`
          : "Etkilenen analiz bulunamadı, kısmi refresh yapılmadı.",
        refreshed > 0 ? "success" : "info",
      );
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Partial refresh başarısız.");
      console.error("Partial refresh failed:", e);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleLoadMorePartialRefreshHistory() {
    if (partialRefreshLoadingMore) return;
    const nextPage = partialRefreshHistoryPage + 1;
    if (nextPage >= partialRefreshHistoryTotalPages) return;

    setPartialRefreshLoadingMore(true);
    try {
      const res = await getPartialRefreshJobs(projectId, nextPage, 5);
      const normalized = normalizeHistoryResponse(res);
      setPartialRefreshHistory((prev) => [...prev, ...normalized.items]);
      setPartialRefreshHistoryPage(normalized.page);
      setPartialRefreshHistoryTotalPages(normalized.totalPages);
    } catch {
      showToast("Geçmiş job kayıtları yüklenemedi.");
    } finally {
      setPartialRefreshLoadingMore(false);
    }
  }

  async function handleUpdateProject(name: string, description: string) {
    setActionLoading("update-project");
    try {
      const updated = await updateProject(projectId, { name, description });
      setProject(updated);
      showToast("Proje bilgileri güncellendi.", "success");
    } catch (e) {
      showToast("Proje güncellenemedi.");
      console.error("Update project failed:", e);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleAddDocument() {
    setActionLoading("add-doc");
    try {
      let doc;
      if (docMode === "file" && docFile) {
        if (docDialog?.type === "requirement") {
          doc = await uploadRequirementDocument(docDialog.reqId, docFile, docForm.docType);
        } else {
          doc = await uploadDocument(projectId, docFile, docForm.docType);
        }
      } else {
        if (!docForm.filename.trim() || !docForm.content.trim()) return;
        if (docDialog?.type === "requirement") {
          doc = await addRequirementDocument(docDialog.reqId, docForm);
        } else {
          doc = await addDocument(projectId, docForm);
        }
      }

      if (docDialog?.type === "requirement") {
        setReqDocs((prev) => ({ ...prev, [docDialog.reqId]: [...(prev[docDialog.reqId] || []), doc] }));
      } else {
        setDocuments((prev) => [...prev, doc]);
      }
      showToast("Belge eklendi. AI özeti oluşturuldu.", "success");
      setDocForm({ filename: "", content: "", docType: "OTHER" });
      setDocFile(null);
      setDocDialog(null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Belge eklenemedi.";
      showToast(msg.includes("çok büyük") ? msg : "Belge eklenemedi.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDeleteDocument(docId: number, reqId?: number) {
    try {
      await deleteDocument(docId);
      if (reqId) {
        setReqDocs((prev) => ({ ...prev, [reqId]: (prev[reqId] || []).filter((d) => d.id !== docId) }));
      } else {
        setDocuments((prev) => prev.filter((d) => d.id !== docId));
      }
      showToast("Belge silindi.", "success");
    } catch {
      showToast("Belge silinemedi.");
    }
  }

  if (loading) return <Spinner label="Proje yükleniyor..." />;
  if (!project) return <div className="text-center text-destructive py-12">Proje bulunamadı</div>;

  const selectedRequirement = requirements.find((r) => r.id === selectedRequirementId);
  const isBug = selectedRequirement?.type === "BUG";

  const aiLoadingLabel = actionLoading ? LOADING_LABELS[actionLoading] : null;
  const isAnalyzing = actionLoading?.startsWith("analyze-");
  const showProgress = !!(aiLoadingLabel || isAnalyzing);
  const progressLabel = aiLoadingLabel || (isAnalyzing ? "AI analiz ediyor..." : null);

  return (
    <div className="space-y-6 relative">
      {/* AI Progress Bar */}
      {showProgress && (
        <div className="sticky top-0 z-30 -mx-6 -mt-6 mb-2 px-6 py-2.5 bg-primary/10 border-b flex items-center gap-3">
          <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm font-medium">{progressLabel}</p>
        </div>
      )}

      {/* Project Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight truncate">{project.name}</h1>
          {project.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{project.description}</p>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        {/* Underline tab navigation — Linear/GitHub style */}
        <div className="flex items-center justify-between border-b border-border mb-6">
          {/* Primary workflow tabs */}
          <div className="flex items-center">
            {[
              { value: "requirements", label: "Talepler" },
              { value: "detail", label: "Talep Detay" },
              {
                value: "tasks",
                label: (
                  <>
                    Task'lar
                    {tasks.length > 0 && (
                      <span className="ml-1.5 text-xs tabular-nums opacity-50">({tasks.length})</span>
                    )}
                  </>
                ),
              },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`flex items-center gap-1 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ${
                  activeTab === tab.value
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Utility / config tabs */}
          <div className="flex items-center">
            <button
              onClick={() => setActiveTab("context")}
              className={`flex items-center gap-1 px-3 py-2.5 text-sm border-b-2 -mb-px transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                activeTab === "context"
                  ? "border-primary text-foreground font-medium"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              Bağlam
              {project.hasContext && (
                <span className="text-xs opacity-50 font-normal">v{project.contextVersion}</span>
              )}
              {(project.contextStale || !project.hasContext) && (
                <span className="w-1.5 h-1.5 rounded-full bg-warning inline-block" />
              )}
            </button>
            {isAdmin && (
              <button
                onClick={() => setActiveTab("integrations")}
                className={`px-3 py-2.5 text-sm border-b-2 -mb-px transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  activeTab === "integrations"
                    ? "border-primary text-foreground font-medium"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                }`}
              >
                Proje Ayarları
              </button>
            )}
            {isAdmin && (
              <button
                onClick={() => setActiveTab("usage")}
                className={`px-3 py-2.5 text-sm border-b-2 -mb-px transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  activeTab === "usage"
                    ? "border-primary text-foreground font-medium"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                }`}
              >
                Kullanım
              </button>
            )}
          </div>
        </div>

        <TabsContent value="requirements" className="space-y-4">
          <RequirementsTab
            project={project}
            projectId={projectId}
            isAdmin={isAdmin}
            actionLoading={actionLoading}
            setActionLoading={setActionLoading}
            showToast={showToast}
            requirements={requirements}
            loading={loading}
            selectedRequirementId={selectedRequirementId}
            handleSelectRequirement={handleSelectRequirement}
            handleAnalyzeWithConfirm={handleAnalyzeWithConfirm}
            handleDeleteRequirement={handleDeleteRequirement}
            setActiveTab={setActiveTab}
            setReqDialogOpen={setReqDialogOpen}
          />
        </TabsContent>

        <TabsContent value="detail" className="space-y-6">
          <DetailTab
            project={project}
            projectId={projectId}
            isAdmin={isAdmin}
            actionLoading={actionLoading}
            setActionLoading={setActionLoading}
            showToast={showToast}
            selectedRequirementId={selectedRequirementId}
            selectedRequirement={selectedRequirement ?? null}
            selectedAnalysis={selectedAnalysis}
            setSelectedAnalysis={setSelectedAnalysis}
            isBug={isBug}
            answers={answers}
            setAnswers={setAnswers}
            handleAnswer={handleAnswer}
            handleDismiss={handleDismiss}
            handleStakeholderSummary={handleStakeholderSummary}
            summaryInstruction={summaryInstruction}
            setSummaryInstruction={setSummaryInstruction}
            handleRefineSummary={handleRefineSummary}
            setActiveTab={setActiveTab}
          />
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <TasksTab
            project={project}
            projectId={projectId}
            isAdmin={isAdmin}
            actionLoading={actionLoading}
            setActionLoading={setActionLoading}
            showToast={showToast}
            selectedRequirementId={selectedRequirementId}
            selectedAnalysis={selectedAnalysis}
            tasks={tasks}
            setTasks={setTasks}
            expandedTasks={expandedTasks}
            toggleTask={toggleTask}
            integrationConfig={integrationConfig}
            handleGenerateTasks={handleGenerateTasks}
            handleSpDecision={handleSpDecision}
            handleRefineTasks={handleRefineTasks}
            handleSyncJira={handleSyncJira}
            handleSyncGitHub={handleSyncGitHub}
            handleExportCsv={handleExportCsv}
            handleVerifySync={handleVerifySync}
            taskInstruction={taskInstruction}
            setTaskInstruction={setTaskInstruction}
            setManualTaskDialog={setManualTaskDialog}
            setEditingTask={setEditingTask}
            projectServices={projectServices}
            setConfirmDialog={setConfirmDialog}
            setActiveTab={setActiveTab}
            loadTasks={loadTasks}
          />
        </TabsContent>

        <TabsContent value="context" className="space-y-4">
          <ContextTab
            project={project}
            projectId={projectId}
            isAdmin={isAdmin}
            actionLoading={actionLoading}
            setActionLoading={setActionLoading}
            showToast={showToast}
            scanPath={scanPath}
            setScanPath={setScanPath}
            scanMode={scanMode}
            setScanMode={setScanMode}
            gitUrl={gitUrl}
            setGitUrl={setGitUrl}
            gitToken={gitToken}
            setGitToken={setGitToken}
            handleScan={handleScan}
            contextFreshness={contextFreshness}
            partialRefreshStatus={partialRefreshStatus}
            partialRefreshHistory={partialRefreshHistory}
            partialRefreshHasMore={partialRefreshHistoryPage + 1 < partialRefreshHistoryTotalPages}
            partialRefreshLoadingMore={partialRefreshLoadingMore}
            traceability={traceability}
            onPartialRefresh={handlePartialRefresh}
            onLoadMorePartialRefreshHistory={handleLoadMorePartialRefreshHistory}
            documents={documents}
            setDocDialog={setDocDialog}
            handleDeleteDocument={handleDeleteDocument}
            integrationConfig={integrationConfig}
            setActiveTab={setActiveTab}
          />
        </TabsContent>

        <TabsContent value="integrations" className="space-y-4">
          <IntegrationsTab
            project={project}
            projectId={projectId}
            isAdmin={isAdmin}
            actionLoading={actionLoading}
            setActionLoading={setActionLoading}
            showToast={showToast}
            integrationConfig={integrationConfig}
            setIntegrationConfig={setIntegrationConfig}
            handleSaveIntegrationConfig={handleSaveIntegrationConfig}
            handleUpdateProject={handleUpdateProject}
            projectServices={projectServices}
            serviceGraph={serviceGraph}
            newServiceForm={newServiceForm}
            setNewServiceForm={setNewServiceForm}
            handleCreateService={handleCreateService}
            handleDeleteService={handleDeleteService}
            handleScanService={handleScanService}
            dependencyForm={dependencyForm}
            setDependencyForm={setDependencyForm}
            handleAddDependency={handleAddDependency}
            handleDeleteDependency={handleDeleteDependency}
            onDeleteProject={() => setDeleteDialogOpen(true)}
          />
        </TabsContent>

        <TabsContent value="usage" className="space-y-4">
          <UsageTab
            project={project}
            projectId={projectId}
            isAdmin={isAdmin}
            actionLoading={actionLoading}
            setActionLoading={setActionLoading}
            showToast={showToast}
            usageSummary={usageSummary}
          />
        </TabsContent>
      </Tabs>

      <EditTaskDialog
        task={editingTask}
        onClose={() => setEditingTask(null)}
        onSave={handleSaveTask}
        onChange={setEditingTask}
        loading={actionLoading === "save-task"}
        projectServices={projectServices}
      />

      <ManualTaskDialog
        open={manualTaskDialog}
        onClose={() => setManualTaskDialog(false)}
        form={manualTaskForm}
        onChange={setManualTaskForm}
        onSubmit={handleCreateManualTask}
        loading={actionLoading === "manual-task"}
        projectServices={projectServices}
      />

      <ConfirmDialog
        dialog={confirmDialog}
        onClose={() => setConfirmDialog(null)}
      />

      {/* Delete Project Dialog */}
      <DeleteProjectDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        projectId={projectId}
        projectName={project.name}
        onDeleted={() => navigate("/")}
      />

      <ReqDialog
        open={reqDialogOpen}
        onClose={() => { setReqDialogOpen(false); setFeatureSuggestions(null); }}
        value={newRequirement}
        onChange={setNewRequirement}
        type={newRequirementType}
        onTypeChange={setNewRequirementType}
        onSubmit={handleCreateRequirement}
        loading={actionLoading === "create-req"}
        hasContext={!!project?.hasContext}
        suggestions={featureSuggestions}
        onSuggest={async () => {
          setActionLoading("suggest-features");
          try {
            const result = await suggestFeatures(projectId);
            setFeatureSuggestions(result);
          } catch { showToast("Öneriler üretilemedi."); }
          finally { setActionLoading(null); }
        }}
        onPickSuggestion={(text) => { setNewRequirement(text); setFeatureSuggestions(null); }}
        suggestLoading={actionLoading === "suggest-features"}
      />

      <DocDialog
        dialog={docDialog}
        onClose={() => setDocDialog(null)}
        mode={docMode}
        onModeChange={setDocMode}
        file={docFile}
        onFileChange={setDocFile}
        form={docForm}
        onFormChange={setDocForm}
        reqDocs={reqDocs}
        onDeleteDoc={handleDeleteDocument}
        onSubmit={handleAddDocument}
        loading={actionLoading === "add-doc"}
      />

      {selfAssistantEnabled && (
        <ScopeSmithAssistantWidget
          projectId={projectId}
          showToast={showToast}
        />
      )}
    </div>
  );
}
