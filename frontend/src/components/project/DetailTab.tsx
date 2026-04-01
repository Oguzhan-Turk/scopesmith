import { useState } from "react";
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
  const [analysisRefineInput, setAnalysisRefineInput] = useState("");

  if (!selectedRequirementId) {
    return (
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
    );
  }

  if (!selectedAnalysis) {
    return (
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
    );
  }

  return (
    <div className="space-y-6">
      {/* Analysis Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{isBug ? "Bug Analizi" : "Teknik Analiz"}</CardTitle>
            <div className="flex gap-2">
              <Badge variant={riskColor(selectedAnalysis.riskLevel)}>
                {selectedAnalysis.riskLevel === "HIGH" ? "Yüksek Karmaşıklık" : selectedAnalysis.riskLevel === "MEDIUM" ? "Orta Karmaşıklık" : "Düşük Karmaşıklık"}
              </Badge>
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
                      selectedAnalysis.modelTier === "LIGHT" ? "border-success text-success" :
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
    </div>
  );
}
