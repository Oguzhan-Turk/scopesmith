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
  type UsageSummary,
  type Project,
  type IntegrationConfig,
  type Requirement,
  type Analysis,
  type Task,
} from "@/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
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
      const [proj, reqs, config, usage, groups] = await Promise.all([
        getProject(projectId),
        getRequirements(projectId),
        getIntegrationConfig(projectId).catch(() => ({})),
        getProjectUsage(projectId).catch(() => null),
        getTaskGroups(projectId).catch(() => []),
      ]);
      setProject(proj);
      setRequirements(reqs);
      setIntegrationConfig(config);
      setUsageSummary(usage);
      setTaskGroups(groups);
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

  async function handleAnalyze(reqId: number) {
    setActionLoading(`analyze-${reqId}`);
    try {
      const analysis = await analyzeRequirement(reqId);
      setSelectedRequirementId(reqId);
      setSelectedAnalysis(analysis);
      setTasks([]);
      const updatedAnalyses = await getAnalysesByRequirement(reqId);
      setAnalyses(updatedAnalyses);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set("req", String(reqId));
        next.set("tab", "analysis");
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
        category: editingTask.category || undefined,
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

  if (loading) return <Spinner label="Proje yükleniyor..." />;
  if (!project) return <div className="text-center text-destructive py-12">Proje bulunamadı</div>;

  const selectedRequirement = requirements.find((r) => r.id === selectedRequirementId);
  const isBug = selectedRequirement?.type === "BUG";

  // Check if current action is a long-running AI call
  const aiLoadingLabel = actionLoading ? LOADING_LABELS[actionLoading] : null;
  const isAnalyzing = actionLoading?.startsWith("analyze-");
  const showProgress = !!(aiLoadingLabel || isAnalyzing);

  return (
    <div className="space-y-8 relative">
      {/* AI Progress Bar — non-blocking, user can still browse */}
      {showProgress && (
        <div className="sticky top-0 z-30 -mx-6 -mt-8 mb-4 px-6 py-3 bg-primary/10 border-b flex items-center gap-3">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm font-medium">{aiLoadingLabel || "AI analiz ediyor..."}</p>
        </div>
      )}

      {/* Project Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
        {project.description && (
          <p className="text-muted-foreground mt-1">{project.description}</p>
        )}
        <div className="flex gap-3 mt-3">
          {project.hasContext ? (
            project.contextStale ? (
              <Tooltip side="right" content={project.stalenessWarning || "Context güncel değil"}>
                <Badge variant="destructive" className="cursor-help">
                  Context v{project.contextVersion} — güncel değil
                </Badge>
              </Tooltip>
            ) : (
              <Badge variant="default">Context v{project.contextVersion}</Badge>
            )
          ) : (
            <Badge variant="secondary">Context Yok</Badge>
          )}
          <Badge variant="outline">{project.requirementCount} talep</Badge>
          <Badge variant="outline">{project.documentCount} belge</Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="requirements">Talepler</TabsTrigger>
          <TabsTrigger value="context">Proje Context</TabsTrigger>
          <TabsTrigger value="analysis">
            Analiz
            {selectedAnalysis && <span className="ml-1.5 text-xs opacity-60">#{selectedAnalysis.id}</span>}
          </TabsTrigger>
          <TabsTrigger value="tasks">
            Task'lar
            {tasks.length > 0 && <span className="ml-1.5 text-xs opacity-60">({tasks.length})</span>}
          </TabsTrigger>
          {isAdmin && <TabsTrigger value="integrations">Entegrasyonlar</TabsTrigger>}
          {isAdmin && <TabsTrigger value="usage">Kullanım & ROI</TabsTrigger>}
        </TabsList>

        {/* REQUIREMENTS TAB */}
        <TabsContent value="requirements" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Yeni Talep Ekle</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <button
                  onClick={() => setNewRequirementType("FEATURE")}
                  className={`px-3 py-1.5 text-sm rounded-md border ${
                    newRequirementType === "FEATURE"
                      ? "bg-primary text-primary-foreground"
                      : "bg-background hover:bg-muted"
                  }`}
                >
                  Feature
                </button>
                <button
                  onClick={() => setNewRequirementType("BUG")}
                  className={`px-3 py-1.5 text-sm rounded-md border ${
                    newRequirementType === "BUG"
                      ? "bg-destructive text-destructive-foreground"
                      : "bg-background hover:bg-muted"
                  }`}
                >
                  Bug
                </button>
              </div>
              <Textarea
                placeholder={newRequirementType === "BUG"
                  ? "Bug raporunu buraya yapıştırın... (hata açıklaması, ekran görüntüsü notu, kullanıcı şikayeti)"
                  : "Ham talebi buraya yapıştırın... (e-posta, toplantı notu, Slack mesajı)"}
                value={newRequirement}
                onChange={(e) => setNewRequirement(e.target.value)}
                rows={5}
              />
              <Button
                onClick={handleCreateRequirement}
                disabled={actionLoading === "create-req" || !newRequirement.trim()}
              >
                {actionLoading === "create-req" ? "Ekleniyor..." : newRequirementType === "BUG" ? "Bug Ekle" : "Talep Ekle"}
              </Button>
            </CardContent>
          </Card>

          {requirements.length === 0 && (
            <Card className="text-center py-12">
              <CardContent>
                <p className="text-muted-foreground">
                  Henüz talep eklenmedi. Yukarıdan ilk talebinizi ekleyin.
                </p>
              </CardContent>
            </Card>
          )}

          {requirements.map((req) => (
            <Card
              key={req.id}
              className={selectedRequirementId === req.id ? "ring-2 ring-primary" : ""}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {req.type === "BUG" ? "Bug" : "Talep"} #{req.sequenceNumber || req.id}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Badge variant={req.type === "BUG" ? "destructive" : "default"}>
                      {req.type === "BUG" ? "Bug" : "Feature"}
                    </Badge>
                    <Badge variant="outline">v{req.version}</Badge>
                    <Badge variant="secondary">{req.status}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap mb-4">{req.rawText}</p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={selectedRequirementId === req.id ? "default" : "outline"}
                    onClick={() => {
                      if (selectedRequirementId === req.id) {
                        setSelectedRequirementId(null);
                        setSelectedAnalysis(null);
                        setTasks([]);
                        setAnalyses([]);
                      } else {
                        handleSelectRequirement(req.id);
                      }
                    }}
                  >
                    {selectedRequirementId === req.id ? "Seçili ✕" : "Görüntüle"}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleAnalyze(req.id)}
                    disabled={!!actionLoading}
                  >
                    {actionLoading === `analyze-${req.id}` ? "Analiz ediliyor..." : "Analiz Et"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteRequirement(req.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    Sil
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* CONTEXT TAB */}
        <TabsContent value="context" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Proje Context Tara</CardTitle>
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
                  placeholder="Proje klasör yolu (örn: /Users/dev/my-project)"
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

          {project.techContext && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Context Özeti</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-sm whitespace-pre-wrap font-sans">{project.techContext}</pre>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ANALYSIS TAB */}
        <TabsContent value="analysis" className="space-y-6">
          {!selectedAnalysis ? (
            <Card className="text-center py-12">
              <CardContent>
                <p className="text-muted-foreground">
                  {selectedRequirementId
                    ? "Bu talep henüz analiz edilmedi. Talepler sekmesinden \"Analiz Et\" butonuna tıklayın."
                    : "Bir talebi görüntülemek veya analiz etmek için \"Talepler\" sekmesinden başlayın."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Analysis Summary */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{isBug ? "Bug Analizi" : "Analiz Sonucu"}</CardTitle>
                    <div className="flex gap-2">
                      {/* Madde 7: Risk tooltip */}
                      <Tooltip content={selectedAnalysis.riskReason || "Risk bilgisi yok"}>
                        <Badge variant={riskColor(selectedAnalysis.riskLevel)} className="cursor-help">
                          {isBug ? "Severity" : "Risk"}: {selectedAnalysis.riskLevel}
                        </Badge>
                      </Tooltip>
                      {selectedAnalysis.durationMs && (
                        <Badge variant="outline">
                          {(selectedAnalysis.durationMs / 1000).toFixed(1)}s
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-1">Özet</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedAnalysis.structuredSummary}</p>
                  </div>
                  <Separator />
                  <div>
                    <h4 className="font-medium mb-1">Varsayımlar</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedAnalysis.assumptions}</p>
                  </div>
                  <Separator />
                  <div>
                    <h4 className="font-medium mb-1">{isBug ? "Severity Nedeni" : "Risk Nedeni"}</h4>
                    <p className="text-sm text-muted-foreground">{selectedAnalysis.riskReason}</p>
                  </div>
                  <Separator />
                  <div>
                    <h4 className="font-medium mb-1">Etkilenen Modüller</h4>
                    <p className="text-sm text-muted-foreground">{selectedAnalysis.affectedModules}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Questions */}
              {selectedAnalysis.questions.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      Sorular ({selectedAnalysis.questions.filter((q) => q.status === "OPEN").length} açık)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {selectedAnalysis.questions.map((q) => (
                      <div key={q.id} className="border rounded-lg p-4">
                        <p className="text-sm font-medium mb-2">{q.questionText}</p>
                        {q.status === "OPEN" ? (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Cevabınızı yazın..."
                              value={answers[q.id] || ""}
                              onChange={(e) =>
                                setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                              }
                              className="flex-1 px-3 py-1.5 text-sm border rounded-md bg-background"
                            />
                            <Button
                              size="sm"
                              onClick={() => handleAnswer(q.id)}
                              disabled={actionLoading === `answer-${q.id}`}
                            >
                              Cevapla
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDismiss(q.id)}
                              disabled={actionLoading === `dismiss-${q.id}`}
                            >
                              Geçersiz
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Badge variant={q.status === "ANSWERED" ? "default" : "secondary"}>
                              {q.status === "ANSWERED" ? "Cevaplandı" : "Geçersiz"}
                            </Badge>
                            {q.answer && (
                              <span className="text-sm text-muted-foreground">{q.answer}</span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Actions */}
              <div className="flex gap-3 flex-wrap">
                {tasks.length === 0 ? (
                  <Button onClick={handleGenerateTasks} disabled={!!actionLoading}>
                    {actionLoading === "tasks" ? "Üretiliyor..." : "Task'lara Böl"}
                  </Button>
                ) : (
                  <Badge variant="outline">{tasks.length} task üretildi</Badge>
                )}
                {selectedAnalysis && (
                  <Button variant="outline" onClick={() => setManualTaskDialog(true)} disabled={!!actionLoading}>
                    + Manuel Task
                  </Button>
                )}
                {!selectedAnalysis.stakeholderSummary && (
                  <Button
                    variant="outline"
                    onClick={handleStakeholderSummary}
                    disabled={!!actionLoading}
                  >
                    {actionLoading === "summary" ? "Hazırlanıyor..." : "İş Özeti Üret"}
                  </Button>
                )}
              </div>

              {/* İş Özeti */}
              {selectedAnalysis.stakeholderSummary && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">İş Özeti</CardTitle>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleStakeholderSummary}
                        disabled={!!actionLoading}
                      >
                        {actionLoading === "summary" ? "Üretiliyor..." : "Yeniden Üret"}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <pre className="text-sm whitespace-pre-wrap font-sans">{selectedAnalysis.stakeholderSummary}</pre>
                    <Separator />
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="İyileştirme talimatı (örn: daha kısa olsun, riskleri vurgula)"
                        value={summaryInstruction}
                        onChange={(e) => setSummaryInstruction(e.target.value)}
                        className="flex-1 px-3 py-1.5 text-sm border rounded-md bg-background"
                      />
                      <Button
                        size="sm"
                        onClick={handleRefineSummary}
                        disabled={!!actionLoading || !summaryInstruction.trim()}
                      >
                        {actionLoading === "refine-summary" ? "İyileştiriliyor..." : "İyileştir"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* TASKS TAB */}
        <TabsContent value="tasks" className="space-y-4">
          {tasks.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <p className="text-muted-foreground">
                  {selectedAnalysis
                    ? "Task'lar henüz üretilmedi. Analiz sekmesinden \"Task'lara Böl\" butonunu kullanın."
                    : "Önce bir talep seçip analiz edin, ardından task üretin."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">
                  {tasks.length} Task — Toplam{" "}
                  {tasks.reduce((sum, t) => sum + (t.spFinal || t.spSuggestion || 0), 0)} SP
                </h2>
                {isAdmin && (() => {
                  const syncedCount = tasks.filter((t) => t.jiraKey).length;
                  const unsyncedCount = tasks.length - syncedCount;
                  const allSynced = unsyncedCount === 0;

                  const askConfirm = (message: string, onConfirm: () => void) => {
                    setConfirmDialog({ message, onConfirm });
                  };

                  return (
                    <div className="flex items-center gap-2">
                      {syncedCount > 0 && (
                        <>
                          <span className="text-xs text-muted-foreground">{syncedCount}/{tasks.length} gönderildi</span>
                          <Button size="sm" variant="ghost" onClick={handleVerifySync} disabled={!!actionLoading} className="text-xs h-6 px-2">
                            {actionLoading === "verify-sync" ? "Kontrol..." : "Durumu Kontrol Et"}
                          </Button>
                        </>
                      )}
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
                    </div>
                  );
                })()}
              </div>
              {tasks.map((task) => (
                <Card key={task.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        {task.title}
                        <button onClick={() => setEditingTask({...task})} className="text-xs text-muted-foreground hover:text-foreground">
                          Düzenle
                        </button>
                      </CardTitle>
                      <div className="flex gap-2">
                        <Badge variant="outline">
                          AI: {task.spSuggestion} SP
                        </Badge>
                        {task.spFinal && (
                          <Badge variant="default">Final: {task.spFinal} SP</Badge>
                        )}
                        <Badge variant="secondary">{task.priority}</Badge>
                        {task.category && <Badge variant="outline" className={categoryColor(task.category)}>{task.category}</Badge>}
                        {task.jiraKey && (
                          <Badge variant="default">{task.jiraKey}</Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">{task.description}</p>
                    {task.acceptanceCriteria && (
                      <div>
                        <h5 className="text-xs font-medium mb-1">Kabul Kriterleri</h5>
                        <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                          {task.acceptanceCriteria}
                        </p>
                      </div>
                    )}
                    {task.spRationale && (
                      <div>
                        <h5 className="text-xs font-medium mb-1">SP Gerekçesi</h5>
                        <p className="text-xs text-muted-foreground">{task.spRationale}</p>
                      </div>
                    )}
                    {task.dependencyTitle && (
                      <p className="text-xs text-muted-foreground">
                        Bağımlılık: {task.dependencyTitle}
                      </p>
                    )}
                    <Separator />
                    <div>
                      <h5 className="text-xs font-medium mb-2">SP Kararı</h5>
                      <div className="flex gap-1.5">
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
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Task Refinement */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Task iyileştirme talimatı (örn: bu task'ı böl, frontend task'larını ayır)"
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
                </CardContent>
              </Card>

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
                          {group.tasks.map((task) => (
                            <div key={task.id} className="flex items-center justify-between py-1.5 border-b last:border-0">
                              <span className="text-sm">{task.title}</span>
                              <div className="flex gap-2">
                                <Badge variant="outline">{task.spFinal || task.spSuggestion} SP</Badge>
                                <Badge variant="secondary">{task.priority}</Badge>
                        {task.category && <Badge variant="outline" className={categoryColor(task.category)}>{task.category}</Badge>}
                                {task.jiraKey && <Badge variant="default">{task.jiraKey}</Badge>}
                              </div>
                            </div>
                          ))}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              handleSelectRequirement(group.requirementId);
                              setActiveTab("analysis");
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

        {/* INTEGRATIONS TAB */}
        <TabsContent value="integrations" className="space-y-6">
          <p className="text-sm text-muted-foreground">
            Task'ların aktarılacağı hedefleri ayarlayın.
          </p>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">Jira</CardTitle>
                {integrationConfig.jira?.projectKey && <Badge variant="default">Aktif</Badge>}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Tooltip side="right" content="Jira'daki issue numaralarının öneki. Örn: SS yazarsanız issue'lar SS-1, SS-2 olarak oluşur.">
                  <label className="text-sm font-medium cursor-help border-b border-dotted border-muted-foreground">Proje Key</label>
                </Tooltip>
              </div>
              <input
                type="text"
                placeholder="SS"
                value={integrationConfig.jira?.projectKey || ""}
                onChange={(e) => setIntegrationConfig({
                  ...integrationConfig,
                  jira: { ...integrationConfig.jira, projectKey: e.target.value.toUpperCase() },
                })}
                className="w-full px-3 py-2 border rounded-md bg-background text-sm"
              />
              <div className="flex items-center gap-2">
                <Tooltip side="right" content="Feature task'ları için varsayılan tip. Bug raporlarından üretilen task'lar otomatik 'Bug' olarak gönderilir.">
                  <label className="text-sm font-medium cursor-help border-b border-dotted border-muted-foreground">Issue Type</label>
                </Tooltip>
              </div>
              <input
                type="text"
                placeholder="Task"
                value={integrationConfig.jira?.defaultIssueType || ""}
                onChange={(e) => setIntegrationConfig({
                  ...integrationConfig,
                  jira: { ...integrationConfig.jira, defaultIssueType: e.target.value },
                })}
                className="w-full px-3 py-2 border rounded-md bg-background text-sm"
              />
              <div className="flex items-center gap-2 mt-3">
                <Tooltip side="right" content="LABELS_ONLY: sadece label ekler. COMPONENTS: Jira Component eşleştirmeye çalışır. BOTH: ikisini de yapar.">
                  <label className="text-sm font-medium cursor-help border-b border-dotted border-muted-foreground">Kategori Modu</label>
                </Tooltip>
              </div>
              <select
                value={integrationConfig.jira?.categoryMode || "BOTH"}
                onChange={(e) => setIntegrationConfig({
                  ...integrationConfig,
                  jira: { ...integrationConfig.jira, categoryMode: e.target.value as "LABELS_ONLY" | "COMPONENTS" | "BOTH" },
                })}
                className="w-full px-3 py-2 border rounded-md bg-background text-sm"
              >
                <option value="BOTH">Label + Component (önerilen)</option>
                <option value="LABELS_ONLY">Sadece Label</option>
                <option value="COMPONENTS">Sadece Component</option>
              </select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">GitHub Issues</CardTitle>
                {integrationConfig.github?.repo && <Badge variant="default">Aktif</Badge>}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Tooltip side="right" content="Task'ların GitHub Issue olarak oluşturulacağı repo. Kod repo'sundan farklı olabilir.">
                  <label className="text-sm font-medium cursor-help border-b border-dotted border-muted-foreground">Repository</label>
                </Tooltip>
              </div>
              <input
                type="text"
                placeholder="owner/repo"
                value={integrationConfig.github?.repo || ""}
                onChange={(e) => setIntegrationConfig({
                  ...integrationConfig,
                  github: { repo: e.target.value },
                })}
                className="w-full px-3 py-2 border rounded-md bg-background text-sm"
              />
            </CardContent>
          </Card>

          <Button
            onClick={handleSaveIntegrationConfig}
            disabled={actionLoading === "save-config"}
          >
            {actionLoading === "save-config" ? "Kaydediliyor..." : "Kaydet"}
          </Button>
        </TabsContent>

        {/* USAGE & ROI TAB */}
        <TabsContent value="usage" className="space-y-6">
          {!usageSummary || usageSummary.totalAiCalls === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <p className="text-muted-foreground">
                  Henüz AI kullanımı yok. Bir talep analiz ettiğinizde burada maliyet ve ROI bilgileri görünecek.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Summary Cards */}
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

              {/* ROI Card */}
              {usageSummary.roi && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">ROI Analizi</CardTitle>
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

              {/* Operation Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">İşlem Bazlı Dağılım</CardTitle>
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
            <DialogTitle>Manuel Task Ekle</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div>
              <label className="text-sm font-medium mb-1 block">Başlık *</label>
              <input
                type="text"
                value={manualTaskForm.title}
                onChange={(e) => setManualTaskForm((f) => ({ ...f, title: e.target.value }))}
                className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                placeholder="Task başlığı"
                autoFocus
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Açıklama</label>
              <textarea
                value={manualTaskForm.description}
                onChange={(e) => setManualTaskForm((f) => ({ ...f, description: e.target.value }))}
                className="w-full px-3 py-2 border rounded-md bg-background text-sm resize-none"
                rows={3}
                placeholder="Opsiyonel"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Öncelik</label>
                <select
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
                <label className="text-sm font-medium mb-1 block">Kategori</label>
                <input
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
          <p className="text-sm text-muted-foreground">{confirmDialog?.message}</p>
          <div className="flex justify-end gap-2 mt-4">
            <Button size="sm" variant="outline" onClick={() => setConfirmDialog(null)}>İptal</Button>
            <Button size="sm" onClick={() => { confirmDialog?.onConfirm(); setConfirmDialog(null); }}>Gönder</Button>
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
    STAKEHOLDER_SUMMARY: "İş Özeti",
    SUMMARY_REFINEMENT: "Özet İyileştirme",
    PROJECT_CONTEXT: "Proje Context",
    PROJECT_CONTEXT_STRUCTURED: "Yapısal Context",
    CHANGE_IMPACT: "Değişiklik Etkisi",
    HEALTH_CHECK: "Sağlık Kontrolü",
  };
  return labels[op] || op;
}
