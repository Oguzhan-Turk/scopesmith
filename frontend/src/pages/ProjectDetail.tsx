import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import {
  getProject,
  getRequirements,
  createRequirement,
  analyzeRequirement,
  answerQuestion,
  dismissQuestion,
  generateTasks,
  generateStakeholderSummary,
  refineStakeholderSummary,
  refineTasks,
  setSpDecision,
  exportJiraCsv,
  syncToJira,
  syncToGitHub,
  getAnalysesByRequirement,
  getTasksByAnalysis,
  scanProject,
  getIntegrationConfig,
  updateIntegrationConfig,
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
import { Tooltip } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/useToast";

type BadgeVariant = "default" | "secondary" | "destructive";

function riskColor(level: string): BadgeVariant {
  const l = level?.toUpperCase();
  if (l?.includes("HIGH")) return "destructive";
  if (l?.includes("MEDIUM")) return "secondary";
  return "default";
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

  const [project, setProject] = useState<Project | null>(null);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [selectedRequirementId, setSelectedRequirementId] = useState<number | null>(null);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [selectedAnalysis, setSelectedAnalysis] = useState<Analysis | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);

  const [newRequirement, setNewRequirement] = useState("");
  const [newRequirementType, setNewRequirementType] = useState<"FEATURE" | "BUG">("FEATURE");
  const [scanPath, setScanPath] = useState("");
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [summaryInstruction, setSummaryInstruction] = useState("");
  const [taskInstruction, setTaskInstruction] = useState("");
  const [integrationConfig, setIntegrationConfig] = useState<IntegrationConfig>({});

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

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
      const [proj, reqs, config] = await Promise.all([
        getProject(projectId),
        getRequirements(projectId),
        getIntegrationConfig(projectId).catch(() => ({})),
      ]);
      setProject(proj);
      setRequirements(reqs);
      setIntegrationConfig(config);
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

  async function handleScan() {
    if (!scanPath.trim()) return;
    setActionLoading("scan");
    try {
      const updated = await scanProject(projectId, scanPath);
      setProject(updated);
      setScanPath("");
      showToast("Proje başarıyla tarandı.", "success");
    } catch (e) {
      showToast("Tarama başarısız oldu. Klasör yolunu kontrol edin.");
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

  async function handleSpDecision(taskId: number, spFinal: number) {
    try {
      const updated = await setSpDecision(taskId, spFinal);
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } catch (e) {
      showToast("SP kararı kaydedilemedi.");
      console.error("SP decision failed:", e);
    }
  }

  async function handleRefineTasks() {
    if (!selectedAnalysis || !taskInstruction.trim()) return;
    setActionLoading("refine-tasks");
    try {
      const refined = await refineTasks(selectedAnalysis.id, taskInstruction);
      setTasks(refined);
      setTaskInstruction("");
      showToast("Task'lar iyileştirildi.", "success");
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
          <TabsTrigger value="integrations">Entegrasyonlar</TabsTrigger>
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
                    {req.type === "BUG" ? "Bug" : "Talep"} #{req.id}
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
                    onClick={() => handleSelectRequirement(req.id)}
                  >
                    {selectedRequirementId === req.id ? "Seçili" : "Görüntüle"}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleAnalyze(req.id)}
                    disabled={!!actionLoading}
                  >
                    {actionLoading === `analyze-${req.id}` ? "Analiz ediliyor..." : "Analiz Et"}
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
            <CardContent className="space-y-3">
              <input
                type="text"
                placeholder="Proje klasör yolu (örn: /Users/dev/my-project)"
                value={scanPath}
                onChange={(e) => setScanPath(e.target.value)}
                className="w-full px-3 py-2 border rounded-md bg-background"
              />
              <Button
                onClick={handleScan}
                disabled={!!actionLoading || !scanPath.trim()}
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
              <div className="flex gap-3">
                {tasks.length === 0 ? (
                  <Button onClick={handleGenerateTasks} disabled={!!actionLoading}>
                    {actionLoading === "tasks" ? "Üretiliyor..." : "Task'lara Böl"}
                  </Button>
                ) : (
                  <Badge variant="outline">{tasks.length} task üretildi</Badge>
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
                <div className="flex gap-2">
                  {integrationConfig.jira?.projectKey && (
                    <>
                      <Button size="sm" onClick={handleSyncJira} disabled={!!actionLoading}>
                        {actionLoading === "jira-sync" ? "Gönderiliyor..." : `Jira (${integrationConfig.jira.projectKey})`}
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleExportCsv} disabled={!!actionLoading}>
                        {actionLoading === "export" ? "İndiriliyor..." : "CSV"}
                      </Button>
                    </>
                  )}
                  {integrationConfig.github?.repo && (
                    <Button size="sm" variant="outline" onClick={handleSyncGitHub} disabled={!!actionLoading}>
                      {actionLoading === "github-sync" ? "Gönderiliyor..." : "GitHub"}
                    </Button>
                  )}
                  {!integrationConfig.jira?.projectKey && !integrationConfig.github?.repo && (
                    <Button size="sm" variant="outline" onClick={() => setActiveTab("integrations")}>
                      Entegrasyon Ayarla
                    </Button>
                  )}
                </div>
              </div>
              {tasks.map((task) => (
                <Card key={task.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{task.title}</CardTitle>
                      <div className="flex gap-2">
                        <Badge variant="outline">
                          AI: {task.spSuggestion} SP
                        </Badge>
                        {task.spFinal && (
                          <Badge variant="default">Final: {task.spFinal} SP</Badge>
                        )}
                        <Badge variant="secondary">{task.priority}</Badge>
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
      </Tabs>
    </div>
  );
}
