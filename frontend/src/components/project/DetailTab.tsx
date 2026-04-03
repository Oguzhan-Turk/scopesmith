import { useState } from "react";
import { ArrowLeft, Check, Lightbulb, RefreshCw, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tooltip } from "@/components/ui/tooltip";
import { refineAnalysis } from "@/api/client";
import { riskColor } from "./utils";
import MarkdownBody from "./MarkdownBody";
import type { DetailTabProps } from "./types";

export default function DetailTab({
  project,
  selectedRequirementId,
  selectedRequirement,
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
  // "Diğer" seçeneği: aktiflik (Set) + yazılan metin (Record)
  const [digerActive, setDigerActive] = useState<Set<number>>(new Set());
  const [digerInputs, setDigerInputs] = useState<Record<number, string>>({});
  const [analysisRefineInput, setAnalysisRefineInput] = useState("");
  const [analysisOpen, setAnalysisOpen] = useState(true);
  const [summaryOpen, setSummaryOpen] = useState(true);
  const [closedQuestionsOpen, setClosedQuestionsOpen] = useState(false);

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
      {/* Questions */}
      {selectedAnalysis.questions.length > 0 && actionLoading !== "re-analyze" && (() => {
        const openQuestions = selectedAnalysis.questions.filter((q) => q.status === "OPEN");
        const closedQuestions = selectedAnalysis.questions.filter((q) => q.status !== "OPEN");
        const total = selectedAnalysis.questions.length;
        const doneCount = closedQuestions.length;

        return (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Açık Noktalar</CardTitle>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground tabular-nums">
                  {openQuestions.length}/{total}
                </span>
                <div className="h-1.5 w-20 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${(doneCount / total) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {openQuestions.map((q, idx) => (
              <div key={q.id} className="rounded-lg border p-4 bg-background">
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium bg-primary/10 text-primary">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-sm font-medium">
                        {q.questionText}
                        {q.questionType === "MULTIPLE_CHOICE" && (
                          <span className="text-xs text-muted-foreground/60 font-normal ml-1.5">(birden fazla seçilebilir)</span>
                        )}
                      </p>
                      {q.status === "OPEN" && (
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Button
                            size="sm"
                            className="h-6 px-2 text-xs"
                            disabled={
                              actionLoading === `answer-${q.id}` ||
                              (!(answers[q.id] || "").trim() && !(digerActive.has(q.id) && (digerInputs[q.id] || "").trim()))
                            }
                            onClick={() => {
                              let finalAnswer = answers[q.id] || "";
                              if (digerActive.has(q.id) && digerInputs[q.id]?.trim()) {
                                if (q.questionType === "SINGLE_CHOICE") {
                                  finalAnswer = digerInputs[q.id].trim();
                                } else {
                                  const parts = finalAnswer ? finalAnswer.split(", ").filter(Boolean) : [];
                                  finalAnswer = [...parts, digerInputs[q.id].trim()].join(", ");
                                }
                              }
                              handleAnswer(q.id, finalAnswer || undefined);
                            }}
                          >
                            {actionLoading === `answer-${q.id}` ? <RefreshCw className="w-3 h-3 animate-spin" /> : "Onayla"}
                          </Button>
                          <button
                            onClick={() => handleDismiss(q.id)}
                            disabled={actionLoading === `dismiss-${q.id}`}
                            aria-label="Soruyu kapat"
                            className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors focus-visible:outline-none"
                          >
                            Atla
                          </button>
                        </div>
                      )}
                    </div>

                    {q.status === "OPEN" ? (
                      <div className="space-y-2">
                        {q.suggestedAnswer && (
                          <button
                            className="flex items-start gap-1.5 text-xs text-primary hover:text-primary/80 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                            onClick={() => {
                              if (q.options && q.options.length > 0) {
                                const suggested = q.suggestedAnswer!.toLowerCase();
                                const sugWords = suggested.split(/\s+/).filter(w => w.length > 3);
                                const stemMatch = (a: string, b: string) => {
                                  const len = Math.min(5, a.length, b.length);
                                  return a.slice(0, len) === b.slice(0, len);
                                };
                                const score = (opt: string) => {
                                  const optWords = opt.toLowerCase().split(/\s+/).filter(w => w.length > 3);
                                  if (optWords.length === 0) return 0;
                                  const hits = optWords.filter(ow => sugWords.some(sw => stemMatch(ow, sw))).length;
                                  return hits / optWords.length;
                                };
                                if (q.questionType === "SINGLE_CHOICE") {
                                  const best = q.options.reduce<{ opt: string; score: number } | null>((acc, opt) => {
                                    const s = score(opt);
                                    return s > (acc?.score ?? 0) ? { opt, score: s } : acc;
                                  }, null);
                                  if (best && best.score >= 0.5) {
                                    setAnswers((prev) => ({ ...prev, [q.id]: best.opt }));
                                    setDigerActive((prev) => { const next = new Set(prev); next.delete(q.id); return next; });
                                    return;
                                  }
                                } else {
                                  const matches = q.options.filter(opt => score(opt) >= 0.5);
                                  if (matches.length > 0) {
                                    setAnswers((prev) => ({ ...prev, [q.id]: matches.join(", ") }));
                                    return;
                                  }
                                }
                              }
                              setAnswers((prev) => ({ ...prev, [q.id]: q.suggestedAnswer! }));
                            }}
                          >
                            <Lightbulb className="w-3 h-3 mt-0.5 flex-shrink-0" />
                            <span className="italic">{q.suggestedAnswer}</span>
                          </button>
                        )}

                        {q.options && q.options.length > 0 && (q.questionType === "MULTIPLE_CHOICE" || q.questionType === "SINGLE_CHOICE") ? (
                          <div className="space-y-2">
                            <div className="flex flex-wrap gap-2">
                              {q.options.map((opt) => {
                                const isDiger = opt === "Diğer";
                                const currentAnswer = answers[q.id] || "";
                                // "Diğer" chip: aktiflik ayrı Set'te takip edilir
                                const selected = isDiger
                                  ? digerActive.has(q.id)
                                  : currentAnswer.split(", ").includes(opt);
                                return (
                                  <button
                                    key={opt}
                                    className={`px-3 py-1.5 text-xs rounded-md border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                                      selected ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted"
                                    }`}
                                    onClick={() => {
                                      if (isDiger) {
                                        // "Diğer" toggle
                                        const nowActive = !digerActive.has(q.id);
                                        setDigerActive((prev) => {
                                          const next = new Set(prev);
                                          nowActive ? next.add(q.id) : next.delete(q.id);
                                          return next;
                                        });
                                        if (!nowActive) {
                                          // Deselect: temizle
                                          setDigerInputs((prev) => ({ ...prev, [q.id]: "" }));
                                          if (q.questionType === "SINGLE_CHOICE") {
                                            setAnswers((prev) => ({ ...prev, [q.id]: "" }));
                                          }
                                          // MULTIPLE: diğer seçimler kalır
                                        }
                                      } else {
                                        // Normal seçenek
                                        if (q.questionType === "SINGLE_CHOICE") {
                                          setAnswers((prev) => ({ ...prev, [q.id]: opt }));
                                          // Diğer'i kapat
                                          setDigerActive((prev) => { const next = new Set(prev); next.delete(q.id); return next; });
                                          setDigerInputs((prev) => ({ ...prev, [q.id]: "" }));
                                        } else {
                                          const parts = currentAnswer ? currentAnswer.split(", ").filter(Boolean) : [];
                                          const isSelected = parts.includes(opt);
                                          const next = isSelected ? parts.filter((p) => p !== opt) : [...parts, opt];
                                          setAnswers((prev) => ({ ...prev, [q.id]: next.join(", ") }));
                                        }
                                      }
                                    }}
                                  >
                                    {opt}
                                  </button>
                                );
                              })}
                            </div>

                            {/* "Diğer" aktifse serbest metin */}
                            {digerActive.has(q.id) && (
                              <input
                                type="text"
                                autoFocus
                                placeholder="Belirtin..."
                                value={digerInputs[q.id] || ""}
                                onChange={(e) => {
                                  const text = e.target.value;
                                  setDigerInputs((prev) => ({ ...prev, [q.id]: text }));
                                }}
                                className="w-full px-3 py-1.5 text-sm border rounded-md bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              />
                            )}

                          </div>
                        ) : (
                          <input
                            type="text"
                            placeholder="Cevap girin..."
                            value={answers[q.id] || ""}
                            onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === "Enter" && (answers[q.id] || "").trim()) handleAnswer(q.id); }}
                            className="w-full px-3 py-1.5 text-sm border rounded-md bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          />
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground mt-1">
                        {q.status === "ANSWERED" ? q.answer : "Atlandı"}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Closed questions toggle */}
            {doneCount > 0 && (
              <div>
                <button
                  onClick={() => setClosedQuestionsOpen((v) => !v)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded py-1"
                >
                  <ChevronRight className={`w-3.5 h-3.5 transition-transform ${closedQuestionsOpen ? "rotate-90" : ""}`} />
                  {doneCount} tamamlandı
                </button>
                {closedQuestionsOpen && (
                  <div className="mt-2 space-y-1.5 pl-1">
                    {closedQuestions.map((q) => (
                      <div key={q.id} className="flex items-start gap-2 rounded-md px-3 py-2 bg-muted/30 border border-transparent">
                        <Check className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-muted-foreground/60" />
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground line-clamp-1">{q.questionText}</p>
                          {q.status === "ANSWERED" && q.answer && (
                            <p className="text-xs text-muted-foreground/60 mt-0.5 line-clamp-1">{q.answer}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
        );
      })()}

      {/* Analysis Summary */}
      <Card>
        <CardHeader
          className="cursor-pointer select-none"
          onClick={() => setAnalysisOpen((v) => !v)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {analysisOpen
                ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
                : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
              <CardTitle className="text-base">{isBug ? "Bug Analizi" : "Teknik Analiz"}</CardTitle>
            </div>
            <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
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
                    variant="outline"
                    className="cursor-help text-muted-foreground border-border"
                  >
                    {selectedAnalysis.modelTier === "LIGHT" ? "Haiku" :
                     selectedAnalysis.modelTier === "PREMIUM" ? "Opus" : "Sonnet"}
                  </Badge>
                </Tooltip>
              )}
            </div>
          </div>
        </CardHeader>
        {analysisOpen && (
          <CardContent className="space-y-0">
            {selectedRequirement?.rawText && (
              <>
                <div className="border-l-2 border-muted-foreground/20 pl-4 py-3">
                  <h4 className="text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Talep</h4>
                  <MarkdownBody text={selectedRequirement.rawText} />
                </div>
                <Separator />
              </>
            )}
            {selectedAnalysis.structuredSummary && (
              <div className="border-l-2 border-primary/40 pl-4 py-3">
                <h4 className="text-sm font-semibold text-primary/80 mb-1.5">Ozet</h4>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{selectedAnalysis.structuredSummary}</p>
              </div>
            )}
            {selectedAnalysis.assumptions && (
              <>
                <Separator />
                <div className="border-l-2 border-primary/20 pl-4 py-3">
                  <h4 className="text-sm font-semibold text-primary/60 mb-2">Varsayimlar</h4>
                  <ul className="space-y-1.5">
                    {selectedAnalysis.assumptions.split("\n").filter(Boolean).map((line, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary/30 flex-shrink-0" />
                        <span className="leading-relaxed">{line.replace(/^[-•]\s*/, "")}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
            {selectedAnalysis.riskReason && (
              <>
                <Separator />
                <div className="border-l-2 border-primary/20 pl-4 py-3">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="text-sm font-semibold text-primary/60">{isBug ? "Severity Analizi" : "Risk Analizi"}</h4>
                    <Badge variant={riskColor(selectedAnalysis.riskLevel)} className="text-xs">
                      {selectedAnalysis.riskLevel === "HIGH" ? "Yuksek" : selectedAnalysis.riskLevel === "MEDIUM" ? "Orta" : "Dusuk"}
                    </Badge>
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">{selectedAnalysis.riskReason}</p>
                </div>
              </>
            )}
            {selectedAnalysis.affectedModules && (
              <>
                <Separator />
                <div className="border-l-2 border-primary/20 pl-4 py-3">
                  <h4 className="text-sm font-semibold text-primary/60 mb-2">Etkilenen Moduller</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedAnalysis.affectedModules.split(",").map((m) => m.trim()).filter(Boolean).map((mod, i) => (
                      <code key={i} className="px-2 py-0.5 text-xs rounded bg-muted border border-border font-mono text-foreground/80">
                        {mod}
                      </code>
                    ))}
                  </div>
                </div>
              </>
            )}
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
        )}
      </Card>

      {/* Stakeholder Summary */}
      {selectedAnalysis.stakeholderSummary ? (
        <Card>
          <CardHeader
            className="cursor-pointer select-none"
            onClick={() => setSummaryOpen((v) => !v)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {summaryOpen
                  ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                <CardTitle className="text-base">Talep Aciklamasi</CardTitle>
              </div>
            </div>
          </CardHeader>
          {summaryOpen && (
            <CardContent className="space-y-0">
              <MarkdownBody text={selectedAnalysis.stakeholderSummary} />
              <Separator />
              <div className="flex gap-2 pt-3 px-4" onClick={(e) => e.stopPropagation()}>
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
          )}
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
