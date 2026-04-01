import { useState } from "react";
import { ArrowLeft, Check, Lightbulb, FileText, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tooltip } from "@/components/ui/tooltip";
import { refineAnalysis } from "@/api/client";
import { riskColor } from "./utils";
import type { DetailTabProps } from "./types";

export default function DetailTab({
  project,
  selectedRequirementId,
  selectedAnalysis,
  setSelectedAnalysis,
  isBug,
  answers,
  setAnswers,
  handleAnswer,
  handleDismiss,
  handleStakeholderSummary,
  summaryInstruction,
  setSummaryInstruction,
  handleRefineSummary,
  setActiveTab,
  actionLoading,
  setActionLoading,
  showToast,
}: DetailTabProps) {
  // "Diğer" seçeneği için serbest metin girişi — key: question id
  const [digerInputs, setDigerInputs] = useState<Record<number, string>>({});
  const [analysisRefineInput, setAnalysisRefineInput] = useState("");

  if (!selectedRequirementId) {
    return (
      <div className="text-center py-12 border border-dashed rounded-lg">
        <p className="text-sm text-muted-foreground mb-4">Analiz ve task uretmek icin once bir talep secin.</p>
        <Button variant="outline" size="sm" onClick={() => setActiveTab("requirements")}>
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          Talepler'e Git
        </Button>
      </div>
    );
  }

  if (!selectedAnalysis) {
    return (
      <div className="text-center py-12 border border-dashed rounded-lg">
        <p className="text-sm text-muted-foreground mb-4">Bu talep henuz analiz edilmedi.</p>
        <Button variant="outline" size="sm" onClick={() => setActiveTab("requirements")}>
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          Talepler'e Don ve Analiz Et
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Analysis Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{isBug ? "Bug Analizi" : "Teknik Analiz"}</CardTitle>
            <div className="flex gap-1.5">
              <Badge variant={riskColor(selectedAnalysis.riskLevel)}>
                {selectedAnalysis.riskLevel === "HIGH" ? "Yuksek" : selectedAnalysis.riskLevel === "MEDIUM" ? "Orta" : "Dusuk"}
              </Badge>
              {selectedAnalysis.durationMs && (
                <Tooltip content="AI analiz suresi">
                  <Badge variant="outline" className="cursor-help tabular-nums">
                    {(selectedAnalysis.durationMs / 1000).toFixed(1)}s
                  </Badge>
                </Tooltip>
              )}
              {selectedAnalysis.contextVersion != null && (
                <Tooltip content={
                  selectedAnalysis.contextVersion < (project.contextVersion ?? 0)
                    ? `Context v${selectedAnalysis.contextVersion} ile analiz edildi (guncel: v${project.contextVersion})`
                    : `Guncel context (v${selectedAnalysis.contextVersion})`
                }>
                  <Badge variant="outline" className="cursor-help">Cv{selectedAnalysis.contextVersion}</Badge>
                </Tooltip>
              )}
              {selectedAnalysis.modelTier && (
                <Tooltip content={{
                  LIGHT: "Hizli model (Haiku)",
                  STANDARD: "Standart model (Sonnet)",
                  PREMIUM: "Detayli model (Opus)",
                }[selectedAnalysis.modelTier] || selectedAnalysis.modelTier}>
                  <Badge
                    variant={selectedAnalysis.modelTier === "PREMIUM" ? "default" : "outline"}
                    className={`cursor-help ${
                      selectedAnalysis.modelTier === "LIGHT" ? "border-success text-success" :
                      selectedAnalysis.modelTier === "PREMIUM" ? "bg-primary" : ""
                    }`}
                  >
                    {selectedAnalysis.modelTier === "LIGHT" ? "Haiku" :
                     selectedAnalysis.modelTier === "PREMIUM" ? "Opus" : "Sonnet"}
                  </Badge>
                </Tooltip>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-0">
          <div className="border-l-2 border-primary/30 pl-4 py-3">
            <h4 className="text-sm font-semibold text-primary mb-1.5">Ozet</h4>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{selectedAnalysis.structuredSummary}</p>
          </div>
          <Separator />
          <div className="border-l-2 border-muted-foreground/20 pl-4 py-3">
            <h4 className="text-sm font-semibold text-muted-foreground mb-1.5">Varsayimlar</h4>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{selectedAnalysis.assumptions}</p>
          </div>
          <Separator />
          <div className="border-l-2 border-destructive/30 pl-4 py-3">
            <h4 className="text-sm font-semibold text-destructive mb-1.5">{isBug ? "Severity Nedeni" : "Karmasiklik Nedeni"}</h4>
            <p className="text-sm leading-relaxed">{selectedAnalysis.riskReason}</p>
          </div>
          <Separator />
          <div className="border-l-2 border-muted-foreground/20 pl-4 py-3">
            <h4 className="text-sm font-semibold text-muted-foreground mb-1.5">Etkilenen Moduller</h4>
            <p className="text-sm leading-relaxed">{selectedAnalysis.affectedModules}</p>
          </div>
          <Separator />
          <div className="flex gap-2 pt-3">
            <input
              type="text"
              placeholder="Analizi nasil iyilestireyim?"
              value={analysisRefineInput}
              onChange={(e) => setAnalysisRefineInput(e.target.value)}
              className="flex-1 px-3 py-1.5 text-sm border rounded-md bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                  showToast("Analiz guncellendi.", "success");
                } catch { showToast("Analiz guncellenemedi."); }
                finally { setActionLoading(null); }
              }}
              disabled={!!actionLoading || !analysisRefineInput.trim()}
            >
              {actionLoading === "refine-analysis" ? (
                <><RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />Guncelleniyor</>
              ) : "Guncelle"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Questions */}
      {selectedAnalysis.questions.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Acik Noktalar</CardTitle>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground tabular-nums">
                  {selectedAnalysis.questions.filter((q) => q.status === "OPEN").length}/{selectedAnalysis.questions.length}
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
              <div key={q.id} className={`rounded-lg border p-4 ${q.status === "OPEN" ? "bg-background" : "bg-muted/20"}`}>
                <div className="flex items-start gap-3">
                  <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                    q.status === "OPEN" ? "bg-primary/10 text-primary" : "bg-success/10 text-success"
                  }`}>
                    {q.status === "OPEN" ? idx + 1 : <Check className="w-3 h-3" />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium mb-2">{q.questionText}</p>

                    {q.status === "OPEN" ? (
                      <div className="space-y-2">
                        {q.suggestedAnswer && (
                          <button
                            className="flex items-start gap-1.5 text-xs text-primary/80 hover:text-primary text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                            onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: q.suggestedAnswer! }))}
                          >
                            <Lightbulb className="w-3 h-3 mt-0.5 flex-shrink-0" />
                            <span className="italic">{q.suggestedAnswer}</span>
                          </button>
                        )}

                        {q.options && q.options.length > 0 && (q.questionType === "MULTIPLE_CHOICE" || q.questionType === "SINGLE_CHOICE") ? (
                          <div className="space-y-2">
                            <div className="flex flex-wrap gap-2">
                              {q.options.map((opt) => {
                                const currentAnswer = answers[q.id] || "";
                                const isDiger = opt === "Diğer";
                                const digerSelected = isDiger && currentAnswer.split(", ").includes("Diğer");
                                const selected = currentAnswer.split(", ").includes(opt);
                                return (
                                  <button
                                    key={opt}
                                    className={`px-3 py-1.5 text-xs rounded-md border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                                      selected || digerSelected ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted"
                                    }`}
                                    onClick={() => {
                                      if (q.questionType === "SINGLE_CHOICE") {
                                        setAnswers((prev) => ({ ...prev, [q.id]: opt }));
                                        if (!isDiger) setDigerInputs((prev) => ({ ...prev, [q.id]: "" }));
                                      } else {
                                        const parts = currentAnswer ? currentAnswer.split(", ").filter(Boolean) : [];
                                        const next = selected ? parts.filter((p) => p !== opt) : [...parts, opt];
                                        setAnswers((prev) => ({ ...prev, [q.id]: next.join(", ") }));
                                        if (isDiger && selected) setDigerInputs((prev) => ({ ...prev, [q.id]: "" }));
                                      }
                                    }}
                                  >
                                    {opt}
                                  </button>
                                );
                              })}
                            </div>

                            {/* "Diğer" seçiliyse serbest metin alanı */}
                            {(answers[q.id] || "").split(", ").includes("Diğer") && (
                              <input
                                type="text"
                                autoFocus
                                placeholder="Belirtin..."
                                value={digerInputs[q.id] || ""}
                                onChange={(e) => {
                                  const text = e.target.value;
                                  setDigerInputs((prev) => ({ ...prev, [q.id]: text }));
                                  // Cevaba "Diğer" yerine yazılan metni yansıt
                                  const parts = (answers[q.id] || "").split(", ").filter((p) => p !== "Diğer" && p !== (digerInputs[q.id] || ""));
                                  const next = text.trim() ? [...parts, text] : [...parts, "Diğer"];
                                  setAnswers((prev) => ({ ...prev, [q.id]: next.join(", ") }));
                                }}
                                className="w-full px-3 py-1.5 text-sm border rounded-md bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              />
                            )}

                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => handleAnswer(q.id)} disabled={actionLoading === `answer-${q.id}` || !(answers[q.id] || "").replace("Diğer", "").trim()}>
                                {actionLoading === `answer-${q.id}` ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : "Onayla"}
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleDismiss(q.id)} disabled={actionLoading === `dismiss-${q.id}`}>
                                Atla
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Cevap girin..."
                              value={answers[q.id] || ""}
                              onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                              className="flex-1 px-3 py-1.5 text-sm border rounded-md bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            />
                            <Button size="sm" onClick={() => handleAnswer(q.id)} disabled={actionLoading === `answer-${q.id}` || !(answers[q.id] || "").trim()}>
                              {actionLoading === `answer-${q.id}` ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : "Onayla"}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDismiss(q.id)} disabled={actionLoading === `dismiss-${q.id}`}>
                              Atla
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground mt-1">
                        {q.status === "ANSWERED" ? q.answer : "Atlandi"}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Stakeholder Summary */}
      {selectedAnalysis.stakeholderSummary ? (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-base">Talep Aciklamasi</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm leading-relaxed whitespace-pre-wrap">{selectedAnalysis.stakeholderSummary}</div>
            <Separator />
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ozeti nasil degistireyim?"
                value={summaryInstruction}
                onChange={(e) => setSummaryInstruction(e.target.value)}
                className="flex-1 px-3 py-1.5 text-sm border rounded-md bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <Button
                size="sm"
                onClick={handleRefineSummary}
                disabled={!!actionLoading || !summaryInstruction.trim()}
              >
                {actionLoading === "refine-summary" ? (
                  <><RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />Iyilestiriliyor</>
                ) : "Guncelle"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="flex items-center justify-between rounded-lg border border-dashed px-4 py-4">
          <p className="text-sm text-muted-foreground">Is ozeti henuz uretilmedi.</p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleStakeholderSummary}
            disabled={!!actionLoading}
          >
            {actionLoading === "summary" ? (
              <><RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />Hazirlaniyor</>
            ) : "Talep Aciklamasi Uret"}
          </Button>
        </div>
      )}
    </div>
  );
}
