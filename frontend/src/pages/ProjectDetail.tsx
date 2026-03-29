import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
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
  getAnalysesByRequirement,
  getTasksByAnalysis,
  scanProject,
  type Project,
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

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);

  const [project, setProject] = useState<Project | null>(null);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [selectedRequirementId, setSelectedRequirementId] = useState<number | null>(null);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [selectedAnalysis, setSelectedAnalysis] = useState<Analysis | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);

  const [newRequirement, setNewRequirement] = useState("");
  const [scanPath, setScanPath] = useState("");
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [summaryInstruction, setSummaryInstruction] = useState("");
  const [taskInstruction, setTaskInstruction] = useState("");

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadProject();
  }, [projectId]);

  async function loadProject() {
    try {
      const [proj, reqs] = await Promise.all([
        getProject(projectId),
        getRequirements(projectId),
      ]);
      setProject(proj);
      setRequirements(reqs);
    } catch (e) {
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
        const latest = result[0]; // sorted by createdAt DESC
        setSelectedAnalysis(latest);
        loadTasks(latest.id);
      } else {
        setSelectedAnalysis(null);
        setTasks([]);
      }
    } catch (e) {
      console.error("Failed to load analyses:", e);
    }
  }

  async function loadTasks(analysisId: number) {
    try {
      const result = await getTasksByAnalysis(analysisId);
      setTasks(result);
    } catch (e) {
      console.error("Failed to load tasks:", e);
    }
  }

  function handleSelectRequirement(reqId: number) {
    setSelectedRequirementId(reqId);
    loadAnalyses(reqId);
  }

  async function handleScan() {
    if (!scanPath.trim()) return;
    setActionLoading("scan");
    try {
      const updated = await scanProject(projectId, scanPath);
      setProject(updated);
      setScanPath("");
    } catch (e) {
      console.error("Scan failed:", e);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleCreateRequirement() {
    if (!newRequirement.trim()) return;
    setActionLoading("create-req");
    try {
      await createRequirement(projectId, newRequirement);
      setNewRequirement("");
      const reqs = await getRequirements(projectId);
      setRequirements(reqs);
    } catch (e) {
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
      // Reload analyses list so it includes the new one
      const updatedAnalyses = await getAnalysesByRequirement(reqId);
      setAnalyses(updatedAnalyses);
    } catch (e) {
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
    } catch (e) {
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
      // Update the selected analysis with the new summary
      setSelectedAnalysis({ ...selectedAnalysis, stakeholderSummary: result.summary });
      // Also update in analyses list
      setAnalyses((prev) =>
        prev.map((a) =>
          a.id === selectedAnalysis.id ? { ...a, stakeholderSummary: result.summary } : a
        )
      );
    } catch (e) {
      console.error("Summary failed:", e);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRefineTasks() {
    if (!selectedAnalysis || !taskInstruction.trim()) return;
    setActionLoading("refine-tasks");
    try {
      const refined = await refineTasks(selectedAnalysis.id, taskInstruction);
      setTasks(refined);
      setTaskInstruction("");
    } catch (e) {
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
    } catch (e) {
      console.error("Summary refinement failed:", e);
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) return <div className="text-center text-muted-foreground py-12">Yükleniyor...</div>;
  if (!project) return <div className="text-center text-destructive py-12">Proje bulunamadı</div>;

  const riskColor = (level: string) => {
    const l = level?.toUpperCase();
    if (l?.includes("HIGH")) return "destructive";
    if (l?.includes("MEDIUM")) return "secondary";
    return "default";
  };

  return (
    <div className="space-y-8">
      {/* Project Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
        {project.description && (
          <p className="text-muted-foreground mt-1">{project.description}</p>
        )}
        <div className="flex gap-3 mt-3">
          {project.hasContext ? (
            <Badge variant="default">Context v{project.contextVersion}</Badge>
          ) : (
            <Badge variant="secondary">Context Yok</Badge>
          )}
          <Badge variant="outline">{project.requirementCount} talep</Badge>
          <Badge variant="outline">{project.documentCount} belge</Badge>
        </div>
      </div>

      <Tabs defaultValue="requirements">
        <TabsList>
          <TabsTrigger value="requirements">Talepler</TabsTrigger>
          <TabsTrigger value="context">Proje Context</TabsTrigger>
          <TabsTrigger value="analysis">Analiz</TabsTrigger>
          <TabsTrigger value="tasks">Task'lar</TabsTrigger>
        </TabsList>

        {/* REQUIREMENTS TAB */}
        <TabsContent value="requirements" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Yeni Talep Ekle</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                placeholder="Ham talebi buraya yapıştırın... (e-posta, toplantı notu, Slack mesajı)"
                value={newRequirement}
                onChange={(e) => setNewRequirement(e.target.value)}
                rows={5}
              />
              <Button
                onClick={handleCreateRequirement}
                disabled={actionLoading === "create-req" || !newRequirement.trim()}
              >
                {actionLoading === "create-req" ? "Ekleniyor..." : "Talep Ekle"}
              </Button>
            </CardContent>
          </Card>

          {requirements.map((req) => (
            <Card key={req.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Talep #{req.id}</CardTitle>
                  <div className="flex gap-2">
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
                    variant="outline"
                    onClick={() => handleSelectRequirement(req.id)}
                  >
                    {selectedRequirementId === req.id ? "Seçili" : "Görüntüle"}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleAnalyze(req.id)}
                    disabled={actionLoading === `analyze-${req.id}`}
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
                disabled={actionLoading === "scan" || !scanPath.trim()}
              >
                {actionLoading === "scan" ? "Taranıyor... (bu biraz sürebilir)" : "Tara"}
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
                  Bir talebi analiz etmek için "Talepler" sekmesinden "Analiz Et" butonuna tıklayın.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Analysis Summary */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Analiz Sonucu</CardTitle>
                    <div className="flex gap-2">
                      <Badge variant={riskColor(selectedAnalysis.riskLevel) as "default" | "secondary" | "destructive"}>
                        Risk: {selectedAnalysis.riskLevel}
                      </Badge>
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
                    <p className="text-sm text-muted-foreground">{selectedAnalysis.structuredSummary}</p>
                  </div>
                  <Separator />
                  <div>
                    <h4 className="font-medium mb-1">Varsayımlar</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedAnalysis.assumptions}</p>
                  </div>
                  <Separator />
                  <div>
                    <h4 className="font-medium mb-1">Risk Nedeni</h4>
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
              <div className="flex gap-3">
                {tasks.length === 0 ? (
                  <Button onClick={handleGenerateTasks} disabled={actionLoading === "tasks"}>
                    {actionLoading === "tasks" ? "Üretiliyor..." : "Task'lara Böl"}
                  </Button>
                ) : (
                  <Badge variant="outline">{tasks.length} task üretildi</Badge>
                )}
                {!selectedAnalysis.stakeholderSummary && (
                  <Button
                    variant="outline"
                    onClick={handleStakeholderSummary}
                    disabled={actionLoading === "summary"}
                  >
                    {actionLoading === "summary" ? "Hazırlanıyor..." : "Stakeholder Özeti Üret"}
                  </Button>
                )}
              </div>

              {/* Stakeholder Summary */}
              {selectedAnalysis.stakeholderSummary && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Stakeholder Özeti</CardTitle>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleStakeholderSummary}
                        disabled={actionLoading === "summary"}
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
                        disabled={actionLoading === "refine-summary" || !summaryInstruction.trim()}
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
                  Task'lar henüz üretilmedi. Analiz sekmesinden "Task'lara Böl" butonunu kullanın.
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
                      disabled={actionLoading === "refine-tasks" || !taskInstruction.trim()}
                    >
                      {actionLoading === "refine-tasks" ? "İyileştiriliyor..." : "İyileştir"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
