import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
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
  getTaskGroups,
  type TaskGroup,
  scanProject,
  scanProjectGit,
  getIntegrationConfig,
  updateIntegrationConfig,
  getProjectUsage,
  getDocuments,
  addDocument,
  deleteDocument,
  uploadDocument,
  getRequirementDocuments,
  addRequirementDocument,
  uploadRequirementDocument,
  suggestSp,
  refineAnalysis,
  suggestFeatures,
  getClaudeCodePrompt,
  type UsageSummary,
  type FeatureSuggestionResult,
  type Project,
  type IntegrationConfig,
  type Requirement,
  type Analysis,
  type Task,
  type Document,
} from "@/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { timeAgo } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/useToast";
import { useAuth } from "@/hooks/useAuth";

type BadgeVariant = "default" | "secondary" | "destructive";

function riskColor(level: string): BadgeVariant {
  const l = level?.toUpperCase();
  if (l?.includes("HIGH")) return "destructive";
  if (l?.includes("MEDIUM")) return "secondary";
  return "default";
}

function categoryColor(cat: string): string {
  const colors: Record<string, string> = {
    BACKEND: "border-blue-500 text-blue-700",
    FRONTEND: "border-green-500 text-green-700",
    MOBILE: "border-purple-500 text-purple-700",
    DATABASE: "border-amber-500 text-amber-700",
    DEVOPS: "border-indigo-500 text-indigo-700",
    TESTING: "border-cyan-500 text-cyan-700",
    FULLSTACK: "border-teal-500 text-teal-700",
  };
  return colors[cat?.toUpperCase()] || "";
}

const LOADING_LABELS: Record<string, string> = {
  scan: "Proje taranıyor... Bu birkaç dakika sürebilir.",
  tasks: "Task'lar AI tarafından üretiliyor...",
  summary: "İş özeti hazırlanıyor...",
  "refine-summary": "Özet iyileştiriliyor...",
  "refine-tasks": "Task'lar iyileştiriliyor...",
};

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const projectId = Number(id);
  const { showToast } = useToast();
  const { isAdmin } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [selectedRequirementId, setSelectedRequirementId] = useState<number | null>(null);
  const [_analyses, setAnalyses] = useState<Analysis[]>([]);
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
  const [confirmDialog, setConfirmDialog] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskGroups, setTaskGroups] = useState<TaskGroup[]>([]);
  const [usageSummary, setUsageSummary] = useState<UsageSummary | null>(null);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [manualTaskDialog, setManualTaskDialog] = useState(false);
  const [manualTaskForm, setManualTaskForm] = useState({ title: "", description: "", priority: "MEDIUM", category: "" });
  const [expandedTasks, setExpandedTasks] = useState<Set<number>>(new Set());
  const [reqMenuOpen, setReqMenuOpen] = useState<number | null>(null);
  const [tierMenuOpen, setTierMenuOpen] = useState<number | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [docForm, setDocForm] = useState({ filename: "", content: "", docType: "OTHER" });
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docMode, setDocMode] = useState<"file" | "paste">("file");
  const [reqDialogOpen, setReqDialogOpen] = useState(false);
  const [docDialog, setDocDialog] = useState<{ type: "project" } | { type: "requirement"; reqId: number } | null>(null);
  const [reqDocs, setReqDocs] = useState<Record<number, Document[]>>({});
  const [analysisRefineInput, setAnalysisRefineInput] = useState("");
  const [featureSuggestions, setFeatureSuggestions] = useState<FeatureSuggestionResult | null>(null);

  function toggleTask(id: number) {
    setExpandedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  // Tab state from URL (madde 6 + 8)
  const activeTab = searchParams.get("tab") || "requirements";
  function setActiveTab(tab: string) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tab", tab);
      return next;
    }, { replace: true });
  }

  useEffect(() => {
    loadProject();
  }, [projectId]);

  // Restore requirement selection from URL (madde 8)
  useEffect(() => {
    const reqId = searchParams.get("req");
    if (reqId && requirements.length > 0 && !selectedRequirementId) {
      handleSelectRequirement(Number(reqId));
    }
  }, [requirements]);

  async function loadProject() {
    try {
      const [proj, reqs, config, usage, groups, docs] = await Promise.all([
        getProject(projectId),
        getRequirements(projectId),
        getIntegrationConfig(projectId).catch(() => ({})),
        getProjectUsage(projectId).catch(() => null),
        getTaskGroups(projectId).catch(() => []),
        getDocuments(projectId).catch(() => []),
      ]);
      setProject(proj);
      setRequirements(reqs);
      setIntegrationConfig(config);
      setUsageSummary(usage);
      setTaskGroups(groups);
      setDocuments(docs);
      // Pre-fill scan fields from existing project data
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

  async function loadAnalyses(requirementId: number) {
    try {
      const result = await getAnalysesByRequirement(requirementId);
      setAnalyses(result);
      if (result.length > 0) {
        const latest = result[0]; // sorted by createdAt DESC on backend
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
  }

  async function loadTasks(analysisId: number) {
    try {
      const result = await getTasksByAnalysis(analysisId);
      setTasks(result);
    } catch (e) {
      showToast("Task'lar yüklenemedi.");
      console.error("Failed to load tasks:", e);
    }
  }

  function handleSelectRequirement(reqId: number) {
    setSelectedRequirementId(reqId);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("req", String(reqId));
      return next;
    }, { replace: true });
    loadAnalyses(reqId);
  }

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
    setActionLoading("scan");
    try {
      let updated: Project;
      if (scanMode === "git") {
        if (!gitUrl.trim()) return;
        updated = await scanProjectGit(projectId, gitUrl.trim(), gitToken.trim() || undefined);
        setGitUrl("");
        setGitToken("");
      } else {
        if (!scanPath.trim()) return;
        updated = await scanProject(projectId, scanPath.trim());
        setScanPath("");
      }
      setProject(updated);
      showToast("Proje başarıyla tarandı.", "success");
    } catch (e) {
      showToast("Tarama başarısız oldu.");
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
    // Context quality gate — uyar ama engelleme
    if (!project?.hasContext) {
      showToast("Proje context'i oluşturulmamış. Context sekmesinden tarama yaparak daha isabetli analiz alabilirsiniz.", "info");
    } else if (project?.contextStale) {
      showToast("Proje context'i güncel değil. Sonuçlar yanıltıcı olabilir.", "info");
    }

    const req = requirements.find((r) => r.id === reqId);
    const isReanalyze = req && req.status !== "NEW";
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
    } catch (e) {
      showToast("Analiz başarısız oldu. AI servisi yanıt vermemiş olabilir.");
      console.error("Analysis failed:", e);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleAnswer(questionId: number) {
    const answer = answers[questionId];
    if (!answer?.trim()) return;
    setActionLoading(`answer-${questionId}`);
    try {
      const updated = await answerQuestion(questionId, answer);
      setSelectedAnalysis(updated);
      setAnalyses((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      setAnswers((prev) => ({ ...prev, [questionId]: "" }));
    } catch (e) {
      showToast("Cevap gönderilemedi.");
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
      });
      setTasks((prev) => [...prev, created]);
      setManualTaskForm({ title: "", description: "", priority: "MEDIUM", category: "" });
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
    } catch (e) {
      showToast("GitHub sync başarısız oldu.");
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
      });
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setEditingTask(null);
      showToast("Task güncellendi.", "success");
    } catch (e) {
      showToast("Task güncellenemedi.");
    }
  }

  async function handleSpDecision(taskId: number, spFinal: number) {
    try {
      const updated = await setSpDecision(taskId, spFinal);
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

    const hasSynced = tasks.some((t) => t.jiraKey);
    if (hasSynced) {
      setConfirmDialog({
        message: `${tasks.filter((t) => t.jiraKey).length} task Jira/GitHub'da oluşturulmuş. İyileştirme sonrası aynı başlıklı task'ların bağlantısı korunur, değişen task'ların issue'ları yetim kalır. Devam?`,
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
    if (!key) { showToast("Önce Entegrasyonlar sekmesinden Jira proje key'ini ayarlayın."); return; }
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
    if (!key) { showToast("Önce Entegrasyonlar sekmesinden Jira proje key'ini ayarlayın."); return; }
    setActionLoading("jira-sync");
    try {
      const result = await syncToJira(selectedAnalysis.id, key, integrationConfig.jira?.defaultIssueType || "Task");
      if (result.failed > 0) {
        showToast(`${result.created} issue oluşturuldu, ${result.failed} başarısız.`);
      } else {
        showToast(`${result.created} issue Jira'da oluşturuldu! (${key})`, "success");
      }
      await loadTasks(selectedAnalysis.id);
    } catch (e) {
      showToast("Jira sync başarısız oldu.");
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

  async function loadReqDocs(reqId: number) {
    if (reqDocs[reqId]) return; // already loaded
    try {
      const docs = await getRequirementDocuments(reqId);
      setReqDocs((prev) => ({ ...prev, [reqId]: docs }));
    } catch {
      // silent
    }
  }

  if (loading) return <Spinner label="Proje yükleniyor..." />;
  if (!project) return <div className="text-center text-destructive py-12">Proje bulunamadı</div>;

  const selectedRequirement = requirements.find((r) => r.id === selectedRequirementId);
  const isBug = selectedRequirement?.type === "BUG";

  // Check if current action is a long-running AI call
  const aiLoadingLabel = actionLoading ? LOADING_LABELS[actionLoading] : null;
  const isAnalyzing = actionLoading?.startsWith("analyze-");
  const showProgress = !!(aiLoadingLabel || isAnalyzing);

  return (
    <div className="space-y-6 relative">
      {/* AI Progress Bar — non-blocking, user can still browse */}
      {showProgress && (
        <div className="sticky top-0 z-30 -mx-6 -mt-6 mb-2 px-6 py-2.5 bg-primary/10 border-b flex items-center gap-3">
          <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm font-medium">{aiLoadingLabel || "AI analiz ediyor..."}</p>
        </div>
      )}

      {/* Project Header — kompakt */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
        <div className="flex items-center gap-3 mt-1">
          {project.description && (
            <p className="text-sm text-muted-foreground">{project.description}</p>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="requirements">Talepler</TabsTrigger>
            <TabsTrigger value="detail">Talep Detay</TabsTrigger>
            <TabsTrigger value="tasks">
              Task'lar
              {tasks.length > 0 && <span className="ml-1.5 text-xs opacity-60">({tasks.length})</span>}
            </TabsTrigger>
          </TabsList>
          <TabsList>
            <TabsTrigger value="context">
              Context{project.hasContext && <span className="ml-1 text-xs opacity-60">v{project.contextVersion}</span>}
              {(project.contextStale || !project.hasContext) && (
                <span className="ml-1 w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
              )}
            </TabsTrigger>
            {isAdmin && <TabsTrigger value="integrations">Entegrasyonlar</TabsTrigger>}
            {isAdmin && <TabsTrigger value="usage">Kullanım</TabsTrigger>}
          </TabsList>
        </div>

        {/* REQUIREMENTS TAB */}
        <TabsContent value="requirements" className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{requirements.length} talep</p>
            <Button size="sm" onClick={() => setManualTaskDialog(false) /* reuse state for req dialog */ }>
              <span onClick={(e) => { e.stopPropagation(); setNewRequirement(""); setNewRequirementType("FEATURE"); setConfirmDialog(null); /* open req dialog via state below */ }}>
              </span>
            </Button>
          </div>

          {requirements.length === 0 ? (
            <div className="text-center py-16 border border-dashed rounded-xl">
              <p className="text-sm text-muted-foreground mb-3">Henüz talep eklenmedi</p>
              <Button variant="outline" onClick={() => setReqDialogOpen(true)}>+ İlk Talebi Ekle</Button>
            </div>
          ) : (
            <div className="border rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5 w-10">#</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5 w-16">Tip</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Açıklama</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5 w-28">Durum</th>
                    <th className="text-right text-xs font-medium text-muted-foreground px-4 py-2.5 w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {requirements.map((req) => {
                    const isSelected = selectedRequirementId === req.id;
                    const statusLabel: Record<string, string> = {
                      NEW: "Yeni", ANALYZED: "Analiz Edildi", CLARIFYING: "Soru Bekleniyor",
                      COMPLETED: "Tamamlandı", RE_ANALYZED: "Yeniden Analiz",
                    };
                    const statusColor: Record<string, string> = {
                      NEW: "bg-muted-foreground", ANALYZED: "bg-green-500", CLARIFYING: "bg-amber-500",
                      COMPLETED: "bg-green-500", RE_ANALYZED: "bg-blue-500",
                    };
                    return (
                      <tr
                        key={req.id}
                        className={`border-b last:border-0 cursor-pointer transition-colors group ${
                          isSelected ? "bg-primary/5" : "hover:bg-muted/30"
                        }`}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedRequirementId(null); setSelectedAnalysis(null); setTasks([]); setAnalyses([]);
                          } else {
                            handleSelectRequirement(req.id);
                            setActiveTab("detail");
                          }
                        }}
                      >
                        <td className="px-4 py-2.5 text-sm text-muted-foreground">
                          {req.sequenceNumber || req.id}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                            req.type === "BUG" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
                          }`}>
                            {req.type === "BUG" ? "Bug" : "Feature"}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="text-sm line-clamp-1">{req.rawText}</span>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${statusColor[req.status] || "bg-muted-foreground"}`} />
                            <span className="text-xs text-muted-foreground">{statusLabel[req.status] || req.status}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleAnalyzeWithConfirm(req.id)}
                              disabled={!!actionLoading}
                              className="text-xs text-primary hover:underline"
                            >
                              {actionLoading === `analyze-${req.id}` ? "..." : "Analiz"}
                            </button>
                            <button
                              onClick={() => { setReqMenuOpen(reqMenuOpen === req.id ? null : req.id); }}
                              className="px-1 text-muted-foreground hover:text-foreground text-sm"
                            >
                              ···
                            </button>
                            {reqMenuOpen === req.id && (
                              <div className="absolute right-4 mt-16 z-50 bg-background border rounded-md shadow-lg p-0.5 min-w-[80px]" onMouseLeave={() => setReqMenuOpen(null)}>
                                <button className="w-full text-left px-2.5 py-1.5 text-xs text-destructive hover:bg-muted rounded-sm" onClick={() => { setReqMenuOpen(null); handleDeleteRequirement(req.id); }}>Sil</button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Talep ekleme butonu — sağ alt */}
          <div className="flex justify-end">
            <Button onClick={() => setReqDialogOpen(true)}>+ Yeni Talep</Button>
          </div>
        </TabsContent>

        {/* WORKSPACE TAB — Analiz + Task'lar + Talep Açıklaması tek akışta */}
        <TabsContent value="detail" className="space-y-6">
          {!selectedRequirementId ? (
            <Card className="text-center py-16">
              <CardContent className="space-y-3">
                <p className="text-muted-foreground">
                  Analiz ve task üretmek için önce bir talep seçin.
                </p>
                <Button variant="outline" onClick={() => setActiveTab("requirements")}>
                  ← Talepler'e Git
                </Button>
              </CardContent>
            </Card>
          ) : !selectedAnalysis ? (
            <Card className="text-center py-16">
              <CardContent className="space-y-3">
                <p className="text-muted-foreground">
                  Bu talep henüz analiz edilmedi.
                </p>
                <Button variant="outline" onClick={() => setActiveTab("requirements")}>
                  ← Talepler'e Dön ve Analiz Et
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Analysis Summary */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{isBug ? "Bug Analizi" : "Teknik Analiz"}</CardTitle>
                    <div className="flex gap-2">
                      <Tooltip content={selectedAnalysis.riskReason || "Risk bilgisi yok"}>
                        <Badge variant={riskColor(selectedAnalysis.riskLevel)} className="cursor-help">
                          {selectedAnalysis.riskLevel === "HIGH" ? "Yüksek Karmaşıklık" : selectedAnalysis.riskLevel === "MEDIUM" ? "Orta Karmaşıklık" : "Düşük Karmaşıklık"}
                        </Badge>
                      </Tooltip>
                      {selectedAnalysis.durationMs && (
                        <Tooltip content="AI analiz süresi">
                          <Badge variant="outline" className="cursor-help">
                            {(selectedAnalysis.durationMs / 1000).toFixed(1)}s
                          </Badge>
                        </Tooltip>
                      )}
                      {selectedAnalysis.contextVersion != null && (
                        <Tooltip content={
                          selectedAnalysis.contextVersion < (project.contextVersion ?? 0)
                            ? `Context v${selectedAnalysis.contextVersion} ile analiz edildi (güncel: v${project.contextVersion})`
                            : `Güncel context ile analiz edildi (v${selectedAnalysis.contextVersion})`
                        }>
                          <Badge variant="outline" className="cursor-help text-xs">
                            Cv{selectedAnalysis.contextVersion}
                          </Badge>
                        </Tooltip>
                      )}
                      {selectedAnalysis.modelTier && (
                        <Tooltip content={{
                          LIGHT: "Hızlı model (Haiku) — düşük maliyet",
                          STANDARD: "Standart model (Sonnet) — dengeli",
                          PREMIUM: "Detaylı model (Opus) — en yüksek kalite",
                        }[selectedAnalysis.modelTier] || selectedAnalysis.modelTier}>
                          <Badge
                            variant={selectedAnalysis.modelTier === "PREMIUM" ? "default" : "outline"}
                            className={`cursor-help text-xs ${
                              selectedAnalysis.modelTier === "LIGHT" ? "border-green-500 text-green-700" :
                              selectedAnalysis.modelTier === "PREMIUM" ? "bg-primary" : ""
                            }`}
                          >
                            {selectedAnalysis.modelTier === "LIGHT" ? "⚡ Haiku" :
                             selectedAnalysis.modelTier === "PREMIUM" ? "🔬 Opus" : "Sonnet"}
                          </Badge>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-0">
                  <div className="border-l-2 border-primary/30 pl-4 py-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-primary mb-1.5">Özet</h4>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{selectedAnalysis.structuredSummary}</p>
                  </div>
                  <Separator />
                  <div className="border-l-2 border-muted-foreground/20 pl-4 py-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Varsayımlar</h4>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{selectedAnalysis.assumptions}</p>
                  </div>
                  <Separator />
                  <div className="border-l-2 border-destructive/30 pl-4 py-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-destructive mb-1.5">{isBug ? "Severity Nedeni" : "Karmaşıklık Nedeni"}</h4>
                    <p className="text-sm leading-relaxed">{selectedAnalysis.riskReason}</p>
                  </div>
                  <Separator />
                  <div className="border-l-2 border-muted-foreground/20 pl-4 py-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Etkilenen Modüller</h4>
                    <p className="text-sm leading-relaxed">{selectedAnalysis.affectedModules}</p>
                  </div>
                  <Separator />
                  <div className="flex gap-2 py-2">
                    <input
                      type="text"
                      placeholder="Analizi nasıl iyileştireyim? (örn: frontend etkisini detaylı analiz et)"
                      value={analysisRefineInput}
                      onChange={(e) => setAnalysisRefineInput(e.target.value)}
                      className="flex-1 px-3 py-1.5 text-sm border rounded-md bg-background"
                    />
                    <Button
                      size="sm"
                      onClick={async () => {
                        if (!analysisRefineInput.trim()) return;
                        setActionLoading("refine-analysis");
                        try {
                          const refined = await refineAnalysis(selectedAnalysis!.id, analysisRefineInput);
                          setSelectedAnalysis(refined);
                          setAnalysisRefineInput("");
                          showToast("Analiz güncellendi.", "success");
                        } catch { showToast("Analiz güncellenemedi."); }
                        finally { setActionLoading(null); }
                      }}
                      disabled={!!actionLoading || !analysisRefineInput.trim()}
                    >
                      {actionLoading === "refine-analysis" ? "Güncelleniyor..." : "Analizi Güncelle"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Questions */}
              {selectedAnalysis.questions.length > 0 && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Açık Noktalar</CardTitle>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {selectedAnalysis.questions.filter((q) => q.status === "OPEN").length} / {selectedAnalysis.questions.length} açık
                        </span>
                        <div className="h-1.5 w-20 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${((selectedAnalysis.questions.length - selectedAnalysis.questions.filter((q) => q.status === "OPEN").length) / selectedAnalysis.questions.length) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {selectedAnalysis.questions.map((q, idx) => (
                      <div key={q.id} className={`rounded-lg border p-4 ${q.status === "OPEN" ? "bg-background" : "bg-muted/30"}`}>
                        <div className="flex items-start gap-3">
                          <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                            q.status === "OPEN" ? "bg-primary/10 text-primary" : "bg-green-500/10 text-green-600"
                          }`}>
                            {q.status === "OPEN" ? idx + 1 : "✓"}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium mb-2">{q.questionText}</p>

                            {q.status === "OPEN" ? (
                              <div className="space-y-2">
                                {/* AI Öneri */}
                                {q.suggestedAnswer && (
                                  <button
                                    className="text-xs text-primary/80 hover:text-primary text-left block"
                                    onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: q.suggestedAnswer! }))}
                                  >
                                    💡 <span className="italic">{q.suggestedAnswer}</span>
                                  </button>
                                )}

                                {/* Şıklı soru */}
                                {q.options && q.options.length > 0 && (q.questionType === "MULTIPLE_CHOICE" || q.questionType === "SINGLE_CHOICE") ? (
                                  <div className="space-y-2">
                                    <div className="flex flex-wrap gap-2">
                                      {q.options.map((opt) => {
                                        const currentAnswer = answers[q.id] || "";
                                        const selected = currentAnswer.split(", ").includes(opt);
                                        return (
                                          <button
                                            key={opt}
                                            className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
                                              selected ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted"
                                            }`}
                                            onClick={() => {
                                              if (q.questionType === "SINGLE_CHOICE") {
                                                setAnswers((prev) => ({ ...prev, [q.id]: opt }));
                                              } else {
                                                const parts = currentAnswer ? currentAnswer.split(", ").filter(Boolean) : [];
                                                const next = selected ? parts.filter((p) => p !== opt) : [...parts, opt];
                                                setAnswers((prev) => ({ ...prev, [q.id]: next.join(", ") }));
                                              }
                                            }}
                                          >
                                            {opt}
                                          </button>
                                        );
                                      })}
                                    </div>
                                    <div className="flex gap-2">
                                      <Button size="sm" onClick={() => handleAnswer(q.id)} disabled={actionLoading === `answer-${q.id}` || !(answers[q.id] || "").trim()}>
                                        {actionLoading === `answer-${q.id}` ? "..." : "Onayla"}
                                      </Button>
                                      <Button size="sm" variant="ghost" onClick={() => handleDismiss(q.id)} disabled={actionLoading === `dismiss-${q.id}`}>
                                        Atla
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  /* Açık uçlu soru */
                                  <div className="flex gap-2">
                                    <input
                                      type="text"
                                      placeholder="Cevap girin..."
                                      value={answers[q.id] || ""}
                                      onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                                      className="flex-1 px-3 py-1.5 text-sm border rounded-md bg-background"
                                    />
                                    <Button size="sm" onClick={() => handleAnswer(q.id)} disabled={actionLoading === `answer-${q.id}` || !(answers[q.id] || "").trim()}>
                                      {actionLoading === `answer-${q.id}` ? "..." : "Onayla"}
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => handleDismiss(q.id)} disabled={actionLoading === `dismiss-${q.id}`}>
                                      Atla
                                    </Button>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-sm text-muted-foreground">
                                  {q.status === "ANSWERED" ? q.answer : "Atlandı"}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Talep Açıklaması section */}
              {selectedAnalysis.stakeholderSummary ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Talep Açıklaması</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="border-l-2 border-primary/30 pl-4 py-2">
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-primary mb-1.5">Paylaşım Metni</h4>
                      <div className="text-sm leading-relaxed whitespace-pre-wrap">{selectedAnalysis.stakeholderSummary}</div>
                    </div>
                    <Separator />
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Özeti nasıl değiştireyim? (örn: daha kısa olsun, riskleri vurgula, teknik detay ekle)"
                        value={summaryInstruction}
                        onChange={(e) => setSummaryInstruction(e.target.value)}
                        className="flex-1 px-3 py-1.5 text-sm border rounded-md bg-background"
                      />
                      <Button
                        size="sm"
                        onClick={handleRefineSummary}
                        disabled={!!actionLoading || !summaryInstruction.trim()}
                      >
                        {actionLoading === "refine-summary" ? "İyileştiriliyor..." : "Özeti Güncelle"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-dashed">
                  <CardContent className="py-6 flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">İş özeti henüz üretilmedi.</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleStakeholderSummary}
                      disabled={!!actionLoading}
                    >
                      {actionLoading === "summary" ? "Hazırlanıyor..." : "Talep Açıklaması Üret"}
                    </Button>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* TASKS TAB */}
        <TabsContent value="tasks" className="space-y-4">
          {!selectedRequirementId ? (
            <Card className="text-center py-16">
              <CardContent className="space-y-3">
                <p className="text-muted-foreground">Task'lari görmek için önce bir talep seçin.</p>
                <Button variant="outline" onClick={() => setActiveTab("requirements")}>← Talepler'e Git</Button>
              </CardContent>
            </Card>
          ) : !selectedAnalysis ? (
            <Card className="text-center py-16">
              <CardContent className="space-y-3">
                <p className="text-muted-foreground">Bu talep henüz analiz edilmedi.</p>
                <Button variant="outline" onClick={() => setActiveTab("requirements")}>← Talepler'e Dön ve Analiz Et</Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">
                  Task'lar
                  {tasks.length > 0 && (
                    <span className="ml-2 text-base font-normal text-muted-foreground">
                      {tasks.length} task — {tasks.reduce((sum, t) => sum + (t.spFinal || t.spSuggestion || 0), 0)} SP
                    </span>
                  )}
                </h2>
                <div className="flex items-center gap-2">
                  {tasks.length === 0 ? (() => {
                    const openCount = selectedAnalysis?.questions.filter((q) => q.status === "OPEN").length || 0;
                    const blocked = openCount > 0;
                    return (
                      <Tooltip content={blocked ? `${openCount} açık soru var — önce soruları cevaplayın` : ""}>
                        <span>
                          <Button onClick={handleGenerateTasks} disabled={!!actionLoading || blocked}>
                            {actionLoading === "tasks" ? "Üretiliyor..." : "Task'lara Böl"}
                          </Button>
                        </span>
                      </Tooltip>
                    );
                  })() : null}
                  <Button variant="outline" onClick={() => setManualTaskDialog(true)} disabled={!!actionLoading}>
                    + Task Ekle
                  </Button>
                  {isAdmin && tasks.length > 0 && (() => {
                    const syncedCount = tasks.filter((t) => t.jiraKey).length;
                    const unsyncedCount = tasks.length - syncedCount;
                    const allSynced = unsyncedCount === 0;
                    const askConfirm = (message: string, onConfirm: () => void) => {
                      setConfirmDialog({ message, onConfirm });
                    };
                    return (
                      <>
                        {syncedCount > 0 && (() => {
                          const jiraCount = tasks.filter((t) => t.jiraKey && !t.jiraKey.startsWith("#")).length;
                          const ghCount = tasks.filter((t) => t.jiraKey && t.jiraKey.startsWith("#")).length;
                          return (
                            <>
                              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                                {jiraCount > 0 && <span className="flex items-center gap-0.5"><svg className="w-3 h-3 text-blue-500" viewBox="0 0 24 24" fill="currentColor"><path d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.005-1.005zm5.723-5.756H5.736a5.215 5.215 0 0 0 5.215 5.214h2.129v2.058a5.218 5.218 0 0 0 5.215 5.214V6.758a1.001 1.001 0 0 0-1.001-1.001z"/></svg>{jiraCount}</span>}
                                {ghCount > 0 && <span className="flex items-center gap-0.5"><svg className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>{ghCount}</span>}
                                <span>/ {tasks.length}</span>
                              </span>
                              <Button size="sm" variant="ghost" onClick={handleVerifySync} disabled={!!actionLoading} className="text-xs h-6 px-2">
                                {actionLoading === "verify-sync" ? "..." : "Doğrula"}
                              </Button>
                            </>
                          );
                        })()}
                        {integrationConfig.jira?.projectKey && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => {
                              askConfirm(
                                allSynced
                                  ? "Tüm task'lar zaten gönderilmiş. Tekrar göndermek istiyor musunuz?"
                                  : `${unsyncedCount} task Jira'ya (${integrationConfig.jira!.projectKey}) gönderilecek.`,
                                handleSyncJira
                              );
                            }} disabled={!!actionLoading}>
                              {actionLoading === "jira-sync" ? "Gönderiliyor..." : "Jira'ya Gönder"}
                            </Button>
                            <Button size="sm" variant="outline" onClick={handleExportCsv} disabled={!!actionLoading}>
                              {actionLoading === "export" ? "İndiriliyor..." : "CSV İndir"}
                            </Button>
                          </>
                        )}
                        {integrationConfig.github?.repo && (
                          <Button size="sm" variant="outline" onClick={() => {
                            askConfirm(
                              allSynced
                                ? "Tüm task'lar zaten gönderilmiş. Tekrar göndermek istiyor musunuz?"
                                : `${unsyncedCount} task GitHub Issues'a gönderilecek.`,
                              handleSyncGitHub
                            );
                          }} disabled={!!actionLoading}>
                            {actionLoading === "github-sync" ? "Gönderiliyor..." : "GitHub'a Gönder"}
                          </Button>
                        )}
                        {!integrationConfig.jira?.projectKey && !integrationConfig.github?.repo && (
                          <Button size="sm" variant="outline" onClick={() => setActiveTab("integrations")}>
                            Entegrasyon Ayarla
                          </Button>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>

              {tasks.length === 0 ? (
                <Card className="text-center py-8">
                  <CardContent>
                    <p className="text-muted-foreground text-sm">
                      Henüz task üretilmedi. "Task'lara Böl" butonunu kullanın.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {tasks.map((task) => {
                    const isExpanded = expandedTasks.has(task.id);
                    return (
                      <Card key={task.id}>
                        <CardHeader className="pb-3">
                          <div
                            className="flex items-center justify-between cursor-pointer select-none"
                            onClick={() => toggleTask(task.id)}
                          >
                            <CardTitle className="text-base flex items-center gap-2 min-w-0 mr-3">
                              <span className="text-muted-foreground text-xs flex-shrink-0">{isExpanded ? "▾" : "▸"}</span>
                              <span className="truncate">{task.title}</span>
                            </CardTitle>
                            <div className="flex items-center gap-1.5 self-center" onClick={(e) => e.stopPropagation()}>
                              <Badge variant="outline" className="text-xs">AI: {task.spSuggestion}</Badge>
                              {task.spFinal && <Badge variant="default" className="text-xs">Final: {task.spFinal}</Badge>}
                              <Badge variant="secondary" className="text-xs min-w-[52px] justify-center">
                                <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${
                                  task.priority === "CRITICAL" ? "bg-red-500" :
                                  task.priority === "HIGH" ? "bg-orange-500" :
                                  task.priority === "MEDIUM" ? "bg-yellow-500" : "bg-green-500"
                                }`} />
                                {task.priority === "LOW" ? "Düşük" : task.priority === "MEDIUM" ? "Orta" : task.priority === "HIGH" ? "Yüksek" : "Kritik"}
                              </Badge>
                              {task.category && <Badge variant="outline" className={`text-xs ${categoryColor(task.category)}`}>{task.category}</Badge>}
                              {task.jiraKey && (() => {
                                const isGH = task.jiraKey.startsWith("#");
                                const url = isGH
                                  ? `https://github.com/${integrationConfig.github?.repo || ""}/issues/${task.jiraKey.replace("#", "")}`
                                  : null; // Jira URL needs base URL from credentials, link will be added when available
                                return (
                                  <span className="inline-flex items-center" onClick={(e) => e.stopPropagation()}>
                                    {url ? (
                                      <a href={url} target="_blank" rel="noopener noreferrer">
                                        <Badge variant="outline" className="text-xs hover:bg-muted cursor-pointer gap-1">
                                          <svg className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
                                          {task.jiraKey}
                                        </Badge>
                                      </a>
                                    ) : (
                                      <Badge variant="outline" className="text-xs gap-1">
                                        <svg className="w-3 h-3 text-blue-500" viewBox="0 0 24 24" fill="currentColor"><path d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.005-1.005zm5.723-5.756H5.736a5.215 5.215 0 0 0 5.215 5.214h2.129v2.058a5.218 5.218 0 0 0 5.215 5.214V6.758a1.001 1.001 0 0 0-1.001-1.001zM23.013 0H11.455a5.215 5.215 0 0 0 5.215 5.215h2.129v2.057A5.215 5.215 0 0 0 24.013 12.487V1.005A1.005 1.005 0 0 0 23.013 0z"/></svg>
                                        {task.jiraKey}
                                      </Badge>
                                    )}
                                  </span>
                                );
                              })()}
                              <span className="ml-1 border-l pl-2 border-muted">
                                <button
                                  onClick={() => setEditingTask({...task})}
                                  className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                                </button>
                              </span>
                            </div>
                          </div>
                        </CardHeader>
                        {isExpanded && (
                          <CardContent className="space-y-3">
                            <p className="text-sm text-muted-foreground">{task.description}</p>
                            {task.acceptanceCriteria && (
                              <div>
                                <h5 className="text-xs font-medium mb-1">Kabul Kriterleri</h5>
                                <p className="text-xs text-muted-foreground whitespace-pre-wrap">{task.acceptanceCriteria}</p>
                              </div>
                            )}
                            {task.spRationale && (
                              <div>
                                <h5 className="text-xs font-medium mb-1">SP Gerekçesi</h5>
                                <p className="text-xs text-muted-foreground">{task.spRationale}</p>
                              </div>
                            )}
                            {task.dependencyTitle && (
                              <p className="text-xs text-muted-foreground">Bağımlılık: {task.dependencyTitle}</p>
                            )}
                            <Separator />
                            <div>
                              <h5 className="text-xs font-medium mb-2">SP Kararı</h5>
                              <div className="flex items-center gap-1.5">
                                {[1, 2, 3, 5, 8, 13].map((sp) => (
                                  <button
                                    key={sp}
                                    onClick={() => handleSpDecision(task.id, sp)}
                                    className={`px-2.5 py-1 text-xs rounded-md border ${
                                      task.spFinal === sp
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-background hover:bg-muted"
                                    }`}
                                  >
                                    {sp}
                                  </button>
                                ))}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-xs ml-2"
                                  disabled={!!actionLoading}
                                  onClick={async () => {
                                    setActionLoading(`sp-${task.id}`);
                                    try {
                                      const result = await suggestSp(task.id);
                                      handleSpDecision(task.id, result.spSuggestion);
                                      showToast(`AI önerisi: ${result.spSuggestion} SP — ${result.spRationale}`, "success");
                                    } catch { showToast("SP önerisi alınamadı."); }
                                    finally { setActionLoading(null); }
                                  }}
                                >
                                  {actionLoading === `sp-${task.id}` ? "..." : "AI Öner"}
                                </Button>
                              </div>
                            </div>
                            <div className="flex gap-2 pt-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs"
                                onClick={async () => {
                                  try {
                                    const result = await getClaudeCodePrompt(task.id);
                                    await navigator.clipboard.writeText(result.prompt);
                                    showToast("Claude Code prompt'u kopyalandı!", "success");
                                  } catch { showToast("Prompt kopyalanamadı."); }
                                }}
                              >
                                Claude Code Prompt'u Kopyala
                              </Button>
                            </div>
                          </CardContent>
                        )}
                      </Card>
                    );
                  })}

                  {/* Task Refinement */}
                  <Card>
                    <CardContent className="pt-6 space-y-3">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="İyileştirme talimatı girin..."
                          value={taskInstruction}
                          onChange={(e) => setTaskInstruction(e.target.value)}
                          className="flex-1 px-3 py-1.5 text-sm border rounded-md bg-background"
                        />
                        <Button
                          size="sm"
                          onClick={handleRefineTasks}
                          disabled={!!actionLoading || !taskInstruction.trim()}
                        >
                          {actionLoading === "refine-tasks" ? "İyileştiriliyor..." : "İyileştir"}
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          "Frontend ve backend'e ayır",
                          "Daha küçük parçalara böl",
                          "Test task'ları ekle",
                          "Öncelikleri yükselt",
                          "Database task'larını ayır",
                        ].map((chip) => (
                          <button
                            key={chip}
                            onClick={() => setTaskInstruction(chip)}
                            className="px-2.5 py-1 text-xs rounded-full border bg-muted hover:bg-muted/80 transition-colors"
                          >
                            {chip}
                          </button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}

              {/* Geçmiş Task Grupları */}
              {taskGroups.filter((g) => g.analysisId !== selectedAnalysis?.id).length > 0 && (
                <>
                  <Separator />
                  <h3 className="text-lg font-semibold">Geçmiş Task Grupları</h3>
                  {taskGroups
                    .filter((g) => g.analysisId !== selectedAnalysis?.id)
                    .map((group) => (
                      <details key={group.analysisId} className="border rounded-lg">
                        <summary className="px-4 py-3 cursor-pointer hover:bg-muted/50">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant={group.requirementType === "BUG" ? "destructive" : "default"}>
                                {group.requirementType === "BUG" ? "Bug" : "Feature"}
                              </Badge>
                              <span className="text-sm font-medium">
                                #{group.requirementSeq || "?"} — {group.requirementText}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{group.taskCount} task</Badge>
                              <Badge variant="outline">{group.totalSp} SP</Badge>
                            </div>
                          </div>
                        </summary>
                        <div className="px-4 pb-3 space-y-2">
                          {group.tasks.map((t) => (
                            <div key={t.id} className="flex items-center justify-between py-1.5 border-b last:border-0">
                              <span className="text-sm">{t.title}</span>
                              <div className="flex gap-2">
                                <Badge variant="outline">{t.spFinal || t.spSuggestion} SP</Badge>
                                <Badge variant="secondary">{t.priority}</Badge>
                                {t.category && <Badge variant="outline" className={categoryColor(t.category)}>{t.category}</Badge>}
                                {t.jiraKey && <Badge variant="default">{t.jiraKey}</Badge>}
                              </div>
                            </div>
                          ))}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              handleSelectRequirement(group.requirementId);
                              setActiveTab("detail");
                            }}
                          >
                            Analize Git →
                          </Button>
                        </div>
                      </details>
                    ))}
                </>
              )}
            </>
          )}
        </TabsContent>

        {/* CONTEXT TAB */}
        <TabsContent value="context" className="space-y-4">
          {/* Context uyarıları */}
          {!project.hasContext && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm">
              <span className="font-medium text-amber-700 dark:text-amber-400">Proje context'i henüz oluşturulmadı.</span>
              <span className="text-muted-foreground ml-1">Aşağıdan kod taraması yaparak AI analizlerinin kalitesini artırabilirsiniz.</span>
            </div>
          )}
          {project.contextStale && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
              <span className="font-medium text-destructive">Context güncel değil.</span>
              <span className="text-muted-foreground ml-1">{project.stalenessWarning || "Yeniden tarama yapmanız önerilir."}</span>
            </div>
          )}

          {/* Proje Dokümanları */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Proje Dokümanları</CardTitle>
                <Button size="sm" variant="outline" onClick={() => { setDocForm({ filename: "", content: "", docType: "OTHER" }); setDocDialog({ type: "project" }); }}>
                  + Doküman Ekle
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {documents.length === 0 ? (
                <p className="text-sm text-muted-foreground">Henüz proje dokümanı eklenmedi. Toplantı notları, mimari dokümanlar veya e-posta içerikleri ekleyerek AI analizlerini zenginleştirin.</p>
              ) : (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-start justify-between py-2 border-b last:border-0">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{doc.filename}</span>
                          <Badge variant="outline" className="text-xs">{doc.docType}</Badge>
                          <span className="text-xs text-muted-foreground">{(doc.contentLength / 1024).toFixed(1)}KB</span>
                        </div>
                        {doc.summary && (
                          <p className="text-xs text-muted-foreground mt-1 truncate max-w-lg">{doc.summary}</p>
                        )}
                      </div>
                      <button onClick={() => handleDeleteDocument(doc.id)} className="text-xs text-destructive hover:underline flex-shrink-0 ml-2">Sil</button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Kod Tarama */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Kod Tarama</CardTitle>
                {project.lastScannedAt && (
                  <span className="text-xs text-muted-foreground">{timeAgo(project.lastScannedAt)} tarandı</span>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setScanMode("local")}
                  className={`px-3 py-1.5 text-sm rounded-md border ${
                    scanMode === "local" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"
                  }`}
                >
                  Yerel Klasör
                </button>
                <button
                  onClick={() => setScanMode("git")}
                  className={`px-3 py-1.5 text-sm rounded-md border ${
                    scanMode === "git" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"
                  }`}
                >
                  Git URL
                </button>
              </div>
              {scanMode === "local" ? (
                <input
                  type="text"
                  placeholder="Proje klasör yolu"
                  value={scanPath}
                  onChange={(e) => setScanPath(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                />
              ) : (
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="https://github.com/owner/repo.git"
                    value={gitUrl}
                    onChange={(e) => setGitUrl(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                  />
                  <input
                    type="password"
                    placeholder="Token (private repo için, opsiyonel)"
                    value={gitToken}
                    onChange={(e) => setGitToken(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                  />
                </div>
              )}
              <Button
                onClick={handleScan}
                disabled={!!actionLoading || (scanMode === "local" ? !scanPath.trim() : !gitUrl.trim())}
              >
                {actionLoading === "scan" ? "Taranıyor..." : "Tara"}
              </Button>
            </CardContent>
          </Card>
          {project.structuredContext && (() => {
            try {
              const sc = JSON.parse(project.structuredContext) as Record<string, unknown>;
              const fieldLabels: Record<string, string> = {
                techStack: "Teknoloji Stack", architecture: "Mimari", mainModules: "Ana Modüller",
                buildTool: "Build Aracı", testFramework: "Test Framework", codeStyle: "Kod Stili",
                dependencies: "Bağımlılıklar", summary: "Özet", language: "Dil", framework: "Framework",
                architecturePattern: "Mimari Desen", architectureDescription: "Mimari Açıklama",
                modules: "Modüller", entities: "Entity'ler", apiEndpoints: "API Endpoint'leri",
                externalIntegrations: "Dış Entegrasyonlar", keyObservations: "Önemli Gözlemler",
              };
              // Show only the most useful fields in a clean layout
              const priorityKeys = ["techStack", "architecturePattern", "modules", "entities", "externalIntegrations"];
              const otherKeys = Object.keys(sc).filter((k) => !priorityKeys.includes(k));
              const renderValue = (val: unknown): string => {
                if (Array.isArray(val)) {
                  if (val.length === 0) return "—";
                  if (typeof val[0] === "object" && val[0] !== null) {
                    return (val as Record<string, unknown>[])
                      .map((item) => String(item.name || item.title || JSON.stringify(item)))
                      .join(", ");
                  }
                  return val.join(", ");
                }
                if (typeof val === "object" && val !== null) {
                  return Object.entries(val as Record<string, unknown>)
                    .map(([k, v]) => `${k}: ${Array.isArray(v) ? (v as unknown[]).join(", ") : String(v)}`)
                    .join(" · ");
                }
                return String(val);
              };
              return (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Yapısal Analiz</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {priorityKeys.filter((k) => sc[k]).map((key) => (
                        <div key={key} className="border-l-2 border-muted-foreground/15 pl-3 space-y-1">
                          <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            {fieldLabels[key] || key}
                          </h5>
                          <p className="text-sm leading-relaxed">{renderValue(sc[key])}</p>
                        </div>
                      ))}
                    </div>
                    {otherKeys.length > 0 && (
                      <details className="mt-4">
                        <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                          Tüm detaylar ({otherKeys.length} alan daha)
                        </summary>
                        <div className="mt-3 space-y-3">
                          {otherKeys.filter((k) => sc[k]).map((key) => (
                            <div key={key}>
                              <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                                {fieldLabels[key] || key}
                              </h5>
                              <p className="text-sm leading-relaxed">{renderValue(sc[key])}</p>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </CardContent>
                </Card>
              );
            } catch { return null; }
          })()}
          {project.techContext && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Context Özeti</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm leading-relaxed whitespace-pre-wrap">{project.techContext}</div>
              </CardContent>
            </Card>
          )}
          {!project.structuredContext && !project.techContext && (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center text-muted-foreground text-sm">
                Kod taraması yapıldıktan sonra proje yapısı burada görünecek.
              </CardContent>
            </Card>
          )}

          {/* Feature Önerisi */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Feature Önerisi</CardTitle>
                <div className="flex items-center gap-2">
                  {project.contextStale && (
                    <span className="text-xs text-amber-600">Context güncel değil</span>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      setActionLoading("suggest-features");
                      try {
                        const result = await suggestFeatures(projectId);
                        setFeatureSuggestions(result);
                        showToast(`${result.suggestions.length} öneri üretildi.`, "success");
                      } catch { showToast("Öneriler üretilemedi."); }
                      finally { setActionLoading(null); }
                    }}
                    disabled={!!actionLoading || !project.hasContext}
                  >
                    {actionLoading === "suggest-features" ? "Üretiliyor..." : "AI'a Sor"}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {!project.hasContext ? (
                <p className="text-sm text-muted-foreground">Feature önerisi için önce proje context'i oluşturulmalı. Yukarıdan kod taraması yapın.</p>
              ) : !featureSuggestions ? (
                <p className="text-sm text-muted-foreground">Proje context'ine göre AI'ın önerdiği özellikler burada görünecek.</p>
              ) : (
                <div className="space-y-3">
                  {featureSuggestions.suggestions.map((s, i) => (
                    <div key={i} className="border-l-2 border-primary/20 pl-3 py-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{s.title}</span>
                        <Badge variant="outline" className="text-xs">{s.category}</Badge>
                        <Badge variant="secondary" className="text-xs">{s.complexity}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{s.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* INTEGRATIONS TAB */}
        <TabsContent value="integrations" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Jira Card */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600 text-sm font-bold">J</div>
                    <CardTitle className="text-base">Jira</CardTitle>
                  </div>
                  {integrationConfig.jira?.projectKey ? (
                    <Badge variant="default" className="text-xs">Bağlı</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">Yapılandırılmamış</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="jira-project-key" className="text-xs text-muted-foreground mb-1 block">Proje Key</label>
                    <input id="jira-project-key" type="text" placeholder="SS"
                      value={integrationConfig.jira?.projectKey || ""}
                      onChange={(e) => setIntegrationConfig({ ...integrationConfig, jira: { ...integrationConfig.jira, projectKey: e.target.value.toUpperCase() } })}
                      className="w-full px-3 py-1.5 border rounded-md bg-background text-sm" />
                  </div>
                  <div>
                    <label htmlFor="jira-issue-type" className="text-xs text-muted-foreground mb-1 block">Issue Type</label>
                    <input id="jira-issue-type" type="text" placeholder="Task"
                      value={integrationConfig.jira?.defaultIssueType || ""}
                      onChange={(e) => setIntegrationConfig({ ...integrationConfig, jira: { ...integrationConfig.jira, defaultIssueType: e.target.value } })}
                      className="w-full px-3 py-1.5 border rounded-md bg-background text-sm" />
                  </div>
                </div>
                <div>
                  <label htmlFor="jira-category-mode" className="text-xs text-muted-foreground mb-1 block">Kategori Modu</label>
                  <select id="jira-category-mode"
                    value={integrationConfig.jira?.categoryMode || "BOTH"}
                    onChange={(e) => setIntegrationConfig({ ...integrationConfig, jira: { ...integrationConfig.jira, categoryMode: e.target.value as "LABELS_ONLY" | "COMPONENTS" | "BOTH" } })}
                    className="w-full px-3 py-1.5 border rounded-md bg-background text-sm">
                    <option value="BOTH">Label + Component</option>
                    <option value="LABELS_ONLY">Sadece Label</option>
                    <option value="COMPONENTS">Sadece Component</option>
                  </select>
                </div>
              </CardContent>
            </Card>

            {/* GitHub Card */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-foreground/5 flex items-center justify-center text-sm font-bold">G</div>
                    <CardTitle className="text-base">GitHub Issues</CardTitle>
                  </div>
                  {integrationConfig.github?.repo ? (
                    <Badge variant="default" className="text-xs">Bağlı</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">Yapılandırılmamış</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <label htmlFor="github-repo" className="text-xs text-muted-foreground mb-1 block">Repository</label>
                <input id="github-repo" type="text" placeholder="owner/repo"
                  value={integrationConfig.github?.repo || ""}
                  onChange={(e) => setIntegrationConfig({ ...integrationConfig, github: { repo: e.target.value } })}
                  className="w-full px-3 py-1.5 border rounded-md bg-background text-sm" />
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSaveIntegrationConfig} disabled={actionLoading === "save-config"}>
              {actionLoading === "save-config" ? "Kaydediliyor..." : "Ayarları Kaydet"}
            </Button>
          </div>
        </TabsContent>

        {/* USAGE & ROI TAB */}
        <TabsContent value="usage" className="space-y-4">
          {!usageSummary || usageSummary.totalAiCalls === 0 ? (
            <Card className="text-center py-8">
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  Henüz AI kullanımı yok. Bir talep analiz ettiğinizde burada maliyet ve ROI bilgileri görünecek.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-2xl font-bold">{usageSummary.totalAiCalls}</p>
                    <p className="text-xs text-muted-foreground">AI Çağrısı</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-2xl font-bold">{usageSummary.totalTokens.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Toplam Token</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-2xl font-bold">${usageSummary.totalEstimatedCostUsd.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">Toplam Maliyet</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-2xl font-bold">{(usageSummary.totalDurationMs / 1000).toFixed(0)}s</p>
                    <p className="text-xs text-muted-foreground">Toplam AI Süresi</p>
                  </CardContent>
                </Card>
              </div>
              {usageSummary.roi && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">ROI Analizi</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-2xl font-bold">{usageSummary.roi.totalAnalyses}</p>
                        <p className="text-xs text-muted-foreground">Analiz Yapıldı</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{usageSummary.roi.estimatedHoursSaved.toFixed(0)} saat</p>
                        <p className="text-xs text-muted-foreground">Tahmini Tasarruf</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold">${usageSummary.roi.costPerAnalysis.toFixed(3)}</p>
                        <p className="text-xs text-muted-foreground">Analiz Başına Maliyet</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-primary">{usageSummary.roi.roiMultiplier}x</p>
                        <p className="text-xs text-muted-foreground">ROI Çarpanı</p>
                      </div>
                    </div>
                    <Separator />
                    <p className="text-xs text-muted-foreground">
                      Tahmini tasarruf: {usageSummary.roi.estimatedHoursSaved.toFixed(0)} saat × ${usageSummary.roi.analystHourlyRateUsd}/saat.
                      AI maliyeti: ${usageSummary.totalEstimatedCostUsd.toFixed(2)}.
                      Bu değerler varsayımsaldır, gerçek tasarruf proje karmaşıklığına bağlıdır.
                    </p>
                  </CardContent>
                </Card>
              )}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">İşlem Bazlı Dağılım</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(usageSummary.byOperationType).map(([op, data]) => (
                      <div key={op} className="flex items-center justify-between py-1.5 border-b last:border-0">
                        <span className="text-sm">{formatOperationType(op)}</span>
                        <div className="flex gap-4 text-xs text-muted-foreground">
                          <span>{data.count} çağrı</span>
                          <span>${data.costUsd.toFixed(3)}</span>
                          <span>{(data.avgDurationMs / 1000).toFixed(1)}s ort.</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Task Edit Dialog */}
      <Dialog open={!!editingTask} onOpenChange={(open) => { if (!open) setEditingTask(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Task Düzenle</DialogTitle>
          </DialogHeader>
          {editingTask && (
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Başlık</label>
                <input
                  type="text"
                  value={editingTask.title}
                  onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Açıklama</label>
                <Textarea
                  value={editingTask.description}
                  onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Kabul Kriterleri</label>
                <Textarea
                  value={editingTask.acceptanceCriteria}
                  onChange={(e) => setEditingTask({ ...editingTask, acceptanceCriteria: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">Priority</label>
                  <select
                    value={editingTask.priority}
                    onChange={(e) => setEditingTask({ ...editingTask, priority: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="CRITICAL">CRITICAL</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Category</label>
                  <select
                    value={editingTask.category || ""}
                    onChange={(e) => setEditingTask({ ...editingTask, category: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                  >
                    <option value="">—</option>
                    <option value="BACKEND">BACKEND</option>
                    <option value="FRONTEND">FRONTEND</option>
                    <option value="MOBILE">MOBILE</option>
                    <option value="DATABASE">DATABASE</option>
                    <option value="DEVOPS">DEVOPS</option>
                    <option value="TESTING">TESTING</option>
                    <option value="FULLSTACK">FULLSTACK</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="outline" onClick={() => setEditingTask(null)}>İptal</Button>
                <Button size="sm" onClick={handleSaveTask}>Kaydet</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Manuel Task Dialog */}
      <Dialog open={manualTaskDialog} onOpenChange={(open) => { if (!open) setManualTaskDialog(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Task Ekle</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div>
              <label htmlFor="manual-task-title" className="text-sm font-medium mb-1 block">Başlık *</label>
              <input
                id="manual-task-title"
                type="text"
                value={manualTaskForm.title}
                onChange={(e) => setManualTaskForm((f) => ({ ...f, title: e.target.value }))}
                className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                placeholder="Task başlığı"
                autoFocus
              />
            </div>
            <div>
              <label htmlFor="manual-task-desc" className="text-sm font-medium mb-1 block">Açıklama</label>
              <textarea
                id="manual-task-desc"
                value={manualTaskForm.description}
                onChange={(e) => setManualTaskForm((f) => ({ ...f, description: e.target.value }))}
                className="w-full px-3 py-2 border rounded-md bg-background text-sm resize-none"
                rows={3}
                placeholder="Opsiyonel"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="manual-task-priority" className="text-sm font-medium mb-1 block">Öncelik</label>
                <select
                  id="manual-task-priority"
                  value={manualTaskForm.priority}
                  onChange={(e) => setManualTaskForm((f) => ({ ...f, priority: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>
              <div>
                <label htmlFor="manual-task-category" className="text-sm font-medium mb-1 block">Kategori</label>
                <input
                  id="manual-task-category"
                  type="text"
                  value={manualTaskForm.category}
                  onChange={(e) => setManualTaskForm((f) => ({ ...f, category: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                  placeholder="Opsiyonel"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button size="sm" variant="outline" onClick={() => setManualTaskDialog(false)}>İptal</Button>
              <Button
                size="sm"
                onClick={handleCreateManualTask}
                disabled={!manualTaskForm.title.trim() || actionLoading === "manual-task"}
              >
                {actionLoading === "manual-task" ? "Ekleniyor..." : "Ekle"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={!!confirmDialog} onOpenChange={(open) => { if (!open) setConfirmDialog(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Onay</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{confirmDialog?.message}</p>
          <div className="flex justify-end gap-2 mt-4">
            <Button size="sm" variant="outline" onClick={() => setConfirmDialog(null)}>İptal</Button>
            <Button size="sm" onClick={() => { confirmDialog?.onConfirm(); setConfirmDialog(null); }}>Onayla</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Requirement Dialog */}
      <Dialog open={reqDialogOpen} onOpenChange={setReqDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni Talep</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="flex gap-2">
              <button
                onClick={() => setNewRequirementType("FEATURE")}
                className={`px-3 py-1.5 text-sm rounded-md border ${
                  newRequirementType === "FEATURE" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"
                }`}
              >
                Feature
              </button>
              <button
                onClick={() => setNewRequirementType("BUG")}
                className={`px-3 py-1.5 text-sm rounded-md border ${
                  newRequirementType === "BUG" ? "bg-destructive text-destructive-foreground" : "bg-background hover:bg-muted"
                }`}
              >
                Bug
              </button>
            </div>
            <div>
              <label htmlFor="req-text" className="text-sm font-medium mb-1 block">Açıklama</label>
              <Textarea
                id="req-text"
                placeholder="Talep açıklaması"
                value={newRequirement}
                onChange={(e) => setNewRequirement(e.target.value)}
                rows={6}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setReqDialogOpen(false)}>İptal</Button>
              <Button
                size="sm"
                onClick={async () => {
                  await handleCreateRequirement();
                  setReqDialogOpen(false);
                }}
                disabled={actionLoading === "create-req" || !newRequirement.trim()}
              >
                {actionLoading === "create-req" ? "Ekleniyor..." : "Ekle"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Document Add Dialog */}
      <Dialog open={!!docDialog} onOpenChange={(open) => { if (!open) setDocDialog(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {docDialog?.type === "requirement" ? "Talebe Doküman Ekle" : "Proje Dokümanı Ekle"}
            </DialogTitle>
          </DialogHeader>
          {docDialog?.type === "requirement" && (reqDocs[docDialog.reqId]?.length ?? 0) > 0 && (
            <div className="space-y-1.5 mb-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase">Mevcut Belgeler</h4>
              {reqDocs[docDialog.reqId]?.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                  <div className="flex items-center gap-2">
                    <span>{doc.filename}</span>
                    <Badge variant="outline" className="text-xs">{doc.docType}</Badge>
                  </div>
                  <button onClick={() => handleDeleteDocument(doc.id, docDialog.reqId)} className="text-xs text-destructive">Sil</button>
                </div>
              ))}
            </div>
          )}
          <div className="space-y-3">
            {/* Dosya / Metin seçimi */}
            <div className="flex gap-2">
              <button
                onClick={() => { setDocMode("file"); setDocFile(null); }}
                className={`px-3 py-1.5 text-sm rounded-md border ${docMode === "file" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}
              >
                Dosya Yükle
              </button>
              <button
                onClick={() => setDocMode("paste")}
                className={`px-3 py-1.5 text-sm rounded-md border ${docMode === "paste" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}
              >
                Metin Yapıştır
              </button>
            </div>
            <div>
              <label htmlFor="doc-type" className="text-sm font-medium mb-1 block">Tür</label>
              <select
                id="doc-type"
                value={docForm.docType}
                onChange={(e) => setDocForm((f) => ({ ...f, docType: e.target.value }))}
                className="w-full px-3 py-2 border rounded-md bg-background text-sm"
              >
                <option value="MEETING_NOTES">Toplantı Notu</option>
                <option value="EMAIL">E-posta</option>
                <option value="SPECIFICATION">Spesifikasyon</option>
                <option value="ARCHITECTURE">Mimari Doküman</option>
                <option value="OTHER">Diğer</option>
              </select>
            </div>
            {docMode === "file" ? (
              <div>
                <label className="text-sm font-medium mb-1 block">Dosya</label>
                <input
                  type="file"
                  accept=".txt,.md,.csv,.json,.xml,.html,.log,.yml,.yaml"
                  onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                  className="w-full text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-input file:bg-background file:text-sm file:font-medium hover:file:bg-muted"
                />
                {docFile && (
                  <p className="text-xs text-muted-foreground mt-1">{docFile.name} — {(docFile.size / 1024).toFixed(1)}KB</p>
                )}
              </div>
            ) : (
              <>
                <div>
                  <label htmlFor="doc-filename" className="text-sm font-medium mb-1 block">Dosya Adı *</label>
                  <input
                    id="doc-filename"
                    type="text"
                    value={docForm.filename}
                    onChange={(e) => setDocForm((f) => ({ ...f, filename: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                    placeholder="toplanti-notu-12-mart.md"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="doc-content" className="text-sm font-medium">İçerik *</label>
                    <span className={`text-xs ${docForm.content.length > 10240 ? "text-destructive" : "text-muted-foreground"}`}>
                      {docForm.content.length.toLocaleString()} / 10,240
                    </span>
                  </div>
                  <textarea
                    id="doc-content"
                    value={docForm.content}
                    onChange={(e) => setDocForm((f) => ({ ...f, content: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-md bg-background text-sm resize-none"
                    rows={6}
                    placeholder="Belge içeriğini yapıştırın..."
                  />
                </div>
              </>
            )}
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => { setDocDialog(null); setDocFile(null); }}>İptal</Button>
              <Button
                size="sm"
                onClick={handleAddDocument}
                disabled={
                  (docMode === "file" ? !docFile : (!docForm.filename.trim() || !docForm.content.trim() || docForm.content.length > 10240))
                  || actionLoading === "add-doc"
                }
              >
                {actionLoading === "add-doc" ? "Ekleniyor..." : "Ekle"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function formatOperationType(op: string): string {
  const labels: Record<string, string> = {
    REQUIREMENT_ANALYSIS: "Talep Analizi",
    TASK_BREAKDOWN: "Task Üretimi",
    TASK_REFINEMENT: "Task İyileştirme",
    STAKEHOLDER_SUMMARY: "Talep Açıklaması",
    SUMMARY_REFINEMENT: "Özet İyileştirme",
    PROJECT_CONTEXT: "Proje Context",
    PROJECT_CONTEXT_STRUCTURED: "Yapısal Context",
    CHANGE_IMPACT: "Değişiklik Etkisi",
    HEALTH_CHECK: "Sağlık Kontrolü",
  };
  return labels[op] || op;
}
