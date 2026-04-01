import { useEffect, useRef, useState } from "react";
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
  getScanStatus,
  getIntegrationConfig,
  updateIntegrationConfig,
  getProjectUsage,
  getDocuments,
  addDocument,
  deleteDocument,
  uploadDocument,
  addRequirementDocument,
  uploadRequirementDocument,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/useToast";
import { useAuth } from "@/hooks/useAuth";

import RequirementsTab from "@/components/project/RequirementsTab";
import DetailTab from "@/components/project/DetailTab";
import TasksTab from "@/components/project/TasksTab";
import ContextTab from "@/components/project/ContextTab";
import IntegrationsTab from "@/components/project/IntegrationsTab";
import UsageTab from "@/components/project/UsageTab";

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
  const [documents, setDocuments] = useState<Document[]>([]);
  const [docForm, setDocForm] = useState({ filename: "", content: "", docType: "OTHER" });
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docMode, setDocMode] = useState<"file" | "paste">("file");
  const [reqDialogOpen, setReqDialogOpen] = useState(false);
  const [docDialog, setDocDialog] = useState<{ type: "project" } | { type: "requirement"; reqId: number } | null>(null);
  const [reqDocs, setReqDocs] = useState<Record<number, Document[]>>({});
  const [featureSuggestions, setFeatureSuggestions] = useState<FeatureSuggestionResult | null>(null);

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
    loadProject();
  }, [projectId]);

  // Restore requirement selection from URL
  useEffect(() => {
    const reqId = searchParams.get("req");
    if (reqId && requirements.length > 0 && !selectedRequirementId) {
      handleSelectRequirement(Number(reqId));
    }
  }, [requirements]);

  async function loadProject() {
    const currentLoadId = ++loadIdRef.current;
    try {
      const [proj, reqs, config, usage, groups, docs] = await Promise.all([
        getProject(projectId),
        getRequirements(projectId),
        getIntegrationConfig(projectId).catch(() => ({})),
        getProjectUsage(projectId).catch(() => null),
        getTaskGroups(projectId).catch(() => []),
        getDocuments(projectId).catch(() => []),
      ]);
      // Stale response guard — discard if user navigated away
      if (currentLoadId !== loadIdRef.current) return;
      setProject(proj);
      setRequirements(reqs);
      setIntegrationConfig(config);
      setUsageSummary(usage);
      setTaskGroups(groups);
      setDocuments(docs);
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
    if (scanMode === "git") {
      if (!gitUrl.trim()) { showToast("Entegrasyonlar sekmesinden Git URL'i ayarlayın.", "info"); return; }
    } else {
      if (!scanPath.trim()) { showToast("Entegrasyonlar sekmesinden klasör yolunu ayarlayın.", "info"); return; }
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
      showToast("Proje context'i oluşturulmamış. Context sekmesinden tarama yaparak daha isabetli analiz alabilirsiniz.", "info");
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
      // Refresh task groups + usage after analysis
      getTaskGroups(projectId).then(setTaskGroups).catch(() => {});
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
      getProjectUsage(projectId).then(setUsageSummary).catch(() => {});
      getTaskGroups(projectId).then(setTaskGroups).catch(() => {});
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

  if (loading) return <Spinner label="Proje yükleniyor..." />;
  if (!project) return <div className="text-center text-destructive py-12">Proje bulunamadı</div>;

  const selectedRequirement = requirements.find((r) => r.id === selectedRequirementId);
  const isBug = selectedRequirement?.type === "BUG";

  const aiLoadingLabel = actionLoading ? LOADING_LABELS[actionLoading] : null;
  const isAnalyzing = actionLoading?.startsWith("analyze-");
  const showProgress = !!(aiLoadingLabel || isAnalyzing);

  return (
    <div className="space-y-6 relative">
      {/* AI Progress Bar */}
      {showProgress && (
        <div className="sticky top-0 z-30 -mx-6 -mt-6 mb-2 px-6 py-2.5 bg-primary/10 border-b flex items-center gap-3">
          <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm font-medium">{aiLoadingLabel || "AI analiz ediyor..."}</p>
        </div>
      )}

      {/* Project Header */}
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
                <span className="ml-1 w-1.5 h-1.5 rounded-full bg-warning inline-block" />
              )}
            </TabsTrigger>
            {isAdmin && <TabsTrigger value="integrations">Entegrasyonlar</TabsTrigger>}
            {isAdmin && <TabsTrigger value="usage">Kullanım</TabsTrigger>}
          </TabsList>
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
            setConfirmDialog={setConfirmDialog}
            taskGroups={taskGroups}
            handleSelectRequirement={handleSelectRequirement}
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
            scanMode={scanMode}
            gitUrl={gitUrl}
            handleScan={handleScan}
            documents={documents}
            setDocDialog={setDocDialog}
            handleDeleteDocument={handleDeleteDocument}
            featureSuggestions={featureSuggestions}
            setFeatureSuggestions={setFeatureSuggestions}
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
            scanPath={scanPath}
            setScanPath={setScanPath}
            scanMode={scanMode}
            setScanMode={setScanMode}
            gitUrl={gitUrl}
            setGitUrl={setGitUrl}
            gitToken={gitToken}
            setGitToken={setGitToken}
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
                  className="w-full px-3 py-2 border rounded-md bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                    className="w-full px-3 py-2 border rounded-md bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                    className="w-full px-3 py-2 border rounded-md bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                className="w-full px-3 py-2 border rounded-md bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                className="w-full px-3 py-2 border rounded-md bg-background text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                  className="w-full px-3 py-2 border rounded-md bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                  className="w-full px-3 py-2 border rounded-md bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                className={`px-3 py-1.5 text-sm rounded-md border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  newRequirementType === "FEATURE" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"
                }`}
              >
                Feature
              </button>
              <button
                onClick={() => setNewRequirementType("BUG")}
                className={`px-3 py-1.5 text-sm rounded-md border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
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
              <h4 className="text-sm font-semibold text-muted-foreground">Mevcut Belgeler</h4>
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
            <div className="flex gap-2">
              <button
                onClick={() => { setDocMode("file"); setDocFile(null); }}
                className={`px-3 py-1.5 text-sm rounded-md border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${docMode === "file" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}
              >
                Dosya Yükle
              </button>
              <button
                onClick={() => setDocMode("paste")}
                className={`px-3 py-1.5 text-sm rounded-md border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${docMode === "paste" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}
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
                className="w-full px-3 py-2 border rounded-md bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                    className="w-full px-3 py-2 border rounded-md bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                    className="w-full px-3 py-2 border rounded-md bg-background text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
