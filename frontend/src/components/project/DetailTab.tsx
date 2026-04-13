import { useState } from "react";
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
  // "Diger" secenegi: aktiflik (Set) + yazilan metin (Record)
  const [digerActive, setDigerActive] = useState<Set<number>>(new Set());
  const [digerInputs, setDigerInputs] = useState<Record<number, string>>({});
  const [analysisRefineInput, setAnalysisRefineInput] = useState("");
  const [analysisOpen, setAnalysisOpen] = useState(true);
  const [summaryOpen, setSummaryOpen] = useState(true);
  const [closedQuestionsOpen, setClosedQuestionsOpen] = useState(false);

  if (!selectedRequirementId) {
    return (
      <div className="flex items-center justify-between rounded-[12px] border border-dashed border-border/60 bg-secondary/30 px-6 py-6">
        <p className="text-[0.82rem] text-muted-foreground">Analiz ve task uretmek icin once bir talep secin.</p>
        <button
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[7px] border border-border bg-card text-[0.78rem] font-semibold text-foreground/70 hover:bg-secondary transition-colors"
          onClick={() => setActiveTab("requirements")}
        >
          <span className="material-icons-outlined" style={{ fontSize: 16 }}>arrow_back</span>
          Talepler'e Git
        </button>
      </div>
    );
  }

  if (!selectedAnalysis) {
    return (
      <div className="flex items-center justify-between rounded-[12px] border border-dashed border-border/60 bg-secondary/30 px-6 py-6">
        <p className="text-[0.82rem] text-muted-foreground">Bu talep henuz analiz edilmedi.</p>
        <button
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[7px] border border-border bg-card text-[0.78rem] font-semibold text-foreground/70 hover:bg-secondary transition-colors"
          onClick={() => setActiveTab("requirements")}
        >
          <span className="material-icons-outlined" style={{ fontSize: 16 }}>arrow_back</span>
          Talepler'e Don ve Analiz Et
        </button>
      </div>
    );
  }

  const riskBadgeClass = (level: string) => {
    const l = level?.toUpperCase();
    if (l?.includes("HIGH")) return "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400";
    if (l?.includes("MEDIUM")) return "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400";
    return "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400";
  };

  const riskLabel = (level: string) => {
    const l = level?.toUpperCase();
    if (l?.includes("HIGH")) return "Yuksek";
    if (l?.includes("MEDIUM")) return "Orta";
    return "Dusuk";
  };

  return (
    <div className="space-y-5">
      {/* Content header */}
      <div>
        <h2 className="text-[1.25rem] font-bold text-foreground tracking-tight">Talep Detay</h2>
        {selectedRequirement?.rawText && (
          <p className="text-[0.75rem] text-muted-foreground mt-0.5 line-clamp-1">
            {selectedRequirement.rawText}
          </p>
        )}
      </div>

      {/* ── 1. Acik Noktalar ── */}
      {selectedAnalysis.questions.length > 0 && actionLoading !== "re-analyze" && (() => {
        const openQuestions = selectedAnalysis.questions.filter((q) => q.status === "OPEN");
        const closedQuestions = selectedAnalysis.questions.filter((q) => q.status !== "OPEN");
        const total = selectedAnalysis.questions.length;
        const doneCount = closedQuestions.length;

        return (
          <div className="bg-card rounded-[14px] border border-black/4 shadow-[0_1px_3px_rgba(0,0,0,0.03)] overflow-hidden">
            {/* Section header */}
            <div className="flex items-center justify-between px-5 py-3.5 cursor-default">
              <div className="flex items-center gap-2.5">
                <span className="material-icons-outlined" style={{ fontSize: 18, color: "#00bcd4" }}>help_outline</span>
                <span className="text-[0.88rem] font-semibold text-foreground">Acik Noktalar</span>
              </div>
              <div className="flex gap-1.5">
                {selectedAnalysis.modelTier && (
                  <span className="px-2 py-0.5 rounded-[5px] text-[0.65rem] font-semibold bg-indigo-50 text-indigo-500 dark:bg-indigo-950 dark:text-indigo-400">
                    {selectedAnalysis.modelTier === "LIGHT" ? "Haiku" :
                     selectedAnalysis.modelTier === "PREMIUM" ? "Opus" : "Sonnet"}
                  </span>
                )}
              </div>
            </div>

            {/* Section body */}
            <div className="px-5 pb-5">
              {/* Progress bar */}
              <div className="flex items-center gap-3 mb-4">
                <span className="text-[0.72rem] font-semibold text-foreground/70 whitespace-nowrap">
                  {doneCount} / {total} tamamlandi
                </span>
                <div className="flex-1 h-1 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(doneCount / total) * 100}%`,
                      background: "linear-gradient(90deg, #00bcd4, #00d1ff)",
                    }}
                  />
                </div>
              </div>

              {/* Open questions */}
              {openQuestions.map((q, idx) => (
                <div key={q.id} className="py-4 border-b border-secondary/80 last:border-b-0">
                  <div className="flex items-start gap-2.5 mb-2.5">
                    <span className="flex-shrink-0 w-6 h-6 rounded-[6px] flex items-center justify-center text-[0.68rem] font-bold bg-blue-50 text-blue-500 dark:bg-blue-950 dark:text-blue-400">
                      {idx + 1 + doneCount}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[0.82rem] text-foreground/80 leading-relaxed">
                        {q.questionText}
                      </p>
                      {q.questionType === "MULTIPLE_CHOICE" && (
                        <p className="text-[0.7rem] text-muted-foreground italic mt-0.5">(birden fazla secilebilir)</p>
                      )}
                    </div>
                  </div>

                  {/* Suggested answer */}
                  {q.suggestedAnswer && (
                    <button
                      className="flex items-start gap-1.5 text-[0.72rem] text-[#00838f] hover:text-[#00bcd4] text-left ml-[2.1rem] mb-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
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
                      <span className="material-icons-outlined" style={{ fontSize: 14, marginTop: 1 }}>lightbulb</span>
                      <span className="italic">{q.suggestedAnswer}</span>
                    </button>
                  )}

                  {/* Options / free text */}
                  {q.options && q.options.length > 0 && (q.questionType === "MULTIPLE_CHOICE" || q.questionType === "SINGLE_CHOICE") ? (
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-1.5 ml-[2.1rem]">
                        {q.options.map((opt) => {
                          const isDiger = opt === "Diger";
                          const currentAnswer = answers[q.id] || "";
                          const selected = isDiger
                            ? digerActive.has(q.id)
                            : currentAnswer.split(", ").includes(opt);
                          return (
                            <button
                              key={opt}
                              className={`px-2.5 py-1 rounded-[7px] border text-[0.72rem] font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                                selected
                                  ? "text-white border-[#00bcd4] shadow-sm"
                                  : "bg-card border-border text-foreground/70 hover:border-[#00bcd4] hover:text-[#00838f] hover:bg-cyan-50/30 dark:hover:bg-cyan-950/20"
                              }`}
                              style={selected ? { background: "linear-gradient(135deg, #00bcd4, #00acc1)" } : undefined}
                              onClick={() => {
                                if (isDiger) {
                                  const nowActive = !digerActive.has(q.id);
                                  setDigerActive((prev) => {
                                    const next = new Set(prev);
                                    if (nowActive) next.add(q.id);
                                    else next.delete(q.id);
                                    return next;
                                  });
                                  if (!nowActive) {
                                    setDigerInputs((prev) => ({ ...prev, [q.id]: "" }));
                                    if (q.questionType === "SINGLE_CHOICE") {
                                      setAnswers((prev) => ({ ...prev, [q.id]: "" }));
                                    }
                                  }
                                } else {
                                  if (q.questionType === "SINGLE_CHOICE") {
                                    setAnswers((prev) => ({ ...prev, [q.id]: opt }));
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
                              {selected && <span className="mr-0.5">&#10003; </span>}
                              {opt}
                            </button>
                          );
                        })}
                      </div>

                      {/* "Diger" free text input */}
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
                          className="w-full ml-[2.1rem] max-w-[calc(100%-2.1rem)] px-3 py-1.5 text-[0.78rem] rounded-[8px] border border-border bg-secondary/50 text-foreground focus:border-[#00bcd4] focus:bg-card outline-none placeholder:text-muted-foreground/50 font-[inherit]"
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
                      className="w-full ml-[2.1rem] max-w-[calc(100%-2.1rem)] px-3 py-1.5 text-[0.78rem] rounded-[8px] border border-border bg-secondary/50 text-foreground focus:border-[#00bcd4] focus:bg-card outline-none placeholder:text-muted-foreground/50 font-[inherit]"
                    />
                  )}

                  {/* Question actions */}
                  <div className="flex gap-2 mt-2.5 ml-[2.1rem]">
                    <button
                      className="px-2.5 py-1 rounded-[6px] border-none text-white text-[0.7rem] font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{ background: "linear-gradient(135deg, #00bcd4, #00acc1)" }}
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
                      {actionLoading === `answer-${q.id}` ? (
                        <span className="material-icons-outlined animate-spin" style={{ fontSize: 14 }}>refresh</span>
                      ) : "Onayla"}
                    </button>
                    <button
                      onClick={() => handleDismiss(q.id)}
                      disabled={actionLoading === `dismiss-${q.id}`}
                      aria-label="Soruyu kapat"
                      className="px-2 py-1 border-none bg-transparent text-[0.7rem] text-muted-foreground hover:text-foreground/70 cursor-pointer transition-colors"
                    >
                      Atla
                    </button>
                  </div>
                </div>
              ))}

              {/* Closed questions toggle */}
              {doneCount > 0 && (
                <div className="pt-2">
                  <button
                    onClick={() => setClosedQuestionsOpen((v) => !v)}
                    className="flex items-center gap-1.5 py-2 text-[0.72rem] text-muted-foreground hover:text-foreground/70 cursor-pointer border-none bg-transparent transition-colors"
                  >
                    <span className="material-icons-outlined" style={{ fontSize: 16 }}>check_circle</span>
                    {doneCount} tamamlandi
                    <span className="material-icons-outlined" style={{ fontSize: 16, transition: "transform 0.2s", transform: closedQuestionsOpen ? "rotate(180deg)" : "rotate(0)" }}>expand_more</span>
                  </button>
                  {closedQuestionsOpen && (
                    <div className="mt-1.5 space-y-1.5 pl-1">
                      {closedQuestions.map((q) => (
                        <div key={q.id} className="flex items-start gap-2 rounded-[8px] px-3 py-2 bg-secondary/40 border border-transparent">
                          <span className="material-icons-outlined flex-shrink-0 text-muted-foreground/60" style={{ fontSize: 14, marginTop: 2 }}>check</span>
                          <div className="min-w-0">
                            <p className="text-[0.72rem] text-muted-foreground line-clamp-1">{q.questionText}</p>
                            {q.status === "ANSWERED" && q.answer && (
                              <p className="text-[0.72rem] text-muted-foreground/60 mt-0.5 line-clamp-1">{q.answer}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── 2. Teknik Analiz ── */}
      <div className="bg-card rounded-[14px] border border-black/4 shadow-[0_1px_3px_rgba(0,0,0,0.03)] overflow-hidden">
        {/* Section header */}
        <div
          className="flex items-center justify-between px-5 py-3.5 cursor-pointer select-none"
          onClick={() => setAnalysisOpen((v) => !v)}
        >
          <div className="flex items-center gap-2.5">
            <span className="material-icons-outlined" style={{ fontSize: 18, color: "#00bcd4" }}>analytics</span>
            <span className="text-[0.88rem] font-semibold text-foreground">
              {isBug ? "Bug Analizi" : "Teknik Analiz"}
            </span>
          </div>
          <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
            <span className={`px-2 py-0.5 rounded-[5px] text-[0.65rem] font-semibold ${riskBadgeClass(selectedAnalysis.riskLevel)}`}>
              {riskLabel(selectedAnalysis.riskLevel)} Risk
            </span>
            {selectedAnalysis.durationMs && (
              <Tooltip content="AI analiz suresi">
                <span className="px-2 py-0.5 rounded-[5px] text-[0.65rem] font-semibold bg-secondary text-muted-foreground cursor-help tabular-nums">
                  {(selectedAnalysis.durationMs / 1000).toFixed(1)}s
                </span>
              </Tooltip>
            )}
            {selectedAnalysis.contextVersion != null && (
              <Tooltip content={
                selectedAnalysis.contextVersion < (project.contextVersion ?? 0)
                  ? `Context v${selectedAnalysis.contextVersion} ile analiz edildi (guncel: v${project.contextVersion})`
                  : `Guncel context (v${selectedAnalysis.contextVersion})`
              }>
                <span className="px-2 py-0.5 rounded-[5px] text-[0.65rem] font-semibold bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 cursor-help">
                  Cv{selectedAnalysis.contextVersion}
                </span>
              </Tooltip>
            )}
            {selectedAnalysis.modelTier && (
              <Tooltip content={{
                LIGHT: "Hizli model (Haiku)",
                STANDARD: "Standart model (Sonnet)",
                PREMIUM: "Detayli model (Opus)",
              }[selectedAnalysis.modelTier] || selectedAnalysis.modelTier}>
                <span className="px-2 py-0.5 rounded-[5px] text-[0.65rem] font-semibold bg-indigo-50 text-indigo-500 dark:bg-indigo-950 dark:text-indigo-400 cursor-help">
                  {selectedAnalysis.modelTier === "LIGHT" ? "Haiku" :
                   selectedAnalysis.modelTier === "PREMIUM" ? "Opus" : "Sonnet"}
                </span>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Section body */}
        {analysisOpen && (
          <div className="px-5 pb-5">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-5">
              {/* Left column: analysis text + assumptions + modules */}
              <div>
                {/* Summary text */}
                {selectedAnalysis.structuredSummary && (
                  <div className="text-[0.82rem] text-foreground/70 leading-[1.7] [&_strong]:text-foreground">
                    <p className="whitespace-pre-wrap">{selectedAnalysis.structuredSummary}</p>
                  </div>
                )}

                {/* Raw text (if no structured summary) */}
                {!selectedAnalysis.structuredSummary && selectedRequirement?.rawText && (
                  <div className="text-[0.82rem] text-foreground/70 leading-[1.7]">
                    <MarkdownBody text={selectedRequirement.rawText} />
                  </div>
                )}

                {/* Assumptions */}
                {selectedAnalysis.assumptions && (
                  <div className="mt-3">
                    {selectedAnalysis.assumptions.split("\n").filter(Boolean).map((line, i) => (
                      <div key={i} className="flex items-start gap-1.5 py-1 text-[0.78rem] text-muted-foreground leading-relaxed">
                        <span className="w-[5px] h-[5px] rounded-full bg-[#00bcd4] flex-shrink-0 mt-[7px]" />
                        <span>{line.replace(/^[-\u2022]\s*/, "")}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Affected modules */}
                {selectedAnalysis.affectedModules && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {selectedAnalysis.affectedModules.split(",").map((m) => m.trim()).filter(Boolean).map((mod, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-[5px] bg-secondary text-secondary-foreground text-[0.68rem] font-medium">
                        {mod}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Right column: risk card */}
              {selectedAnalysis.riskReason && (
                <div className="bg-secondary rounded-[10px] p-4">
                  <div className="text-[0.62rem] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                    {isBug ? "Severity Seviyesi" : "Risk Seviyesi"}
                  </div>
                  <span className={`inline-flex px-2.5 py-0.5 rounded-[6px] text-[0.72rem] font-semibold mb-2.5 ${riskBadgeClass(selectedAnalysis.riskLevel)}`}>
                    {riskLabel(selectedAnalysis.riskLevel)}
                  </span>
                  <p className="text-[0.75rem] text-muted-foreground leading-relaxed">{selectedAnalysis.riskReason}</p>
                </div>
              )}
            </div>

            {/* Refine row */}
            <div className="flex gap-2 mt-4 pt-3 border-t border-secondary">
              <input
                type="text"
                placeholder="Analizi nasil iyilestireyim?"
                value={analysisRefineInput}
                onChange={(e) => setAnalysisRefineInput(e.target.value)}
                className="flex-1 px-3 py-[0.45rem] rounded-[8px] border border-border bg-secondary/50 text-[0.78rem] text-foreground outline-none focus:border-[#00bcd4] focus:bg-card placeholder:text-muted-foreground/40 font-[inherit]"
              />
              <button
                className="px-3.5 py-[0.4rem] rounded-[7px] border border-border bg-card text-[0.75rem] font-semibold text-foreground/70 whitespace-nowrap hover:bg-secondary hover:border-border/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
                  <span className="flex items-center gap-1.5">
                    <span className="material-icons-outlined animate-spin" style={{ fontSize: 14 }}>refresh</span>
                    Guncelleniyor
                  </span>
                ) : "Guncelle"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── 3. Talep Aciklamasi (Stakeholder Summary) ── */}
      {selectedAnalysis.stakeholderSummary ? (
        <div className="bg-card rounded-[14px] border border-black/4 shadow-[0_1px_3px_rgba(0,0,0,0.03)] overflow-hidden">
          {/* Section header */}
          <div
            className="flex items-center justify-between px-5 py-3.5 cursor-pointer select-none"
            onClick={() => setSummaryOpen((v) => !v)}
          >
            <div className="flex items-center gap-2.5">
              <span className="material-icons-outlined" style={{ fontSize: 18, color: "#00bcd4" }}>article</span>
              <span className="text-[0.88rem] font-semibold text-foreground">Talep Aciklamasi</span>
            </div>
            <span
              className="material-icons-outlined text-muted-foreground transition-transform"
              style={{ fontSize: 18, transform: summaryOpen ? "rotate(180deg)" : "rotate(0)" }}
            >
              expand_more
            </span>
          </div>

          {/* Section body */}
          {summaryOpen && (
            <div className="px-5 pb-5">
              <div className="text-[0.82rem] text-foreground/70 leading-[1.7] mb-4">
                <MarkdownBody text={selectedAnalysis.stakeholderSummary} />
              </div>

              {/* Refine row */}
              <div className="flex gap-2 mt-4 pt-3 border-t border-secondary" onClick={(e) => e.stopPropagation()}>
                <input
                  type="text"
                  placeholder="Ozeti nasil degistireyim?"
                  value={summaryInstruction}
                  onChange={(e) => setSummaryInstruction(e.target.value)}
                  className="flex-1 px-3 py-[0.45rem] rounded-[8px] border border-border bg-secondary/50 text-[0.78rem] text-foreground outline-none focus:border-[#00bcd4] focus:bg-card placeholder:text-muted-foreground/40 font-[inherit]"
                />
                <button
                  className="px-3.5 py-[0.4rem] rounded-[7px] border border-border bg-card text-[0.75rem] font-semibold text-foreground/70 whitespace-nowrap hover:bg-secondary hover:border-border/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  onClick={handleRefineSummary}
                  disabled={!!actionLoading || !summaryInstruction.trim()}
                >
                  {actionLoading === "refine-summary" ? (
                    <span className="flex items-center gap-1.5">
                      <span className="material-icons-outlined animate-spin" style={{ fontSize: 14 }}>refresh</span>
                      Iyilestiriliyor
                    </span>
                  ) : "Guncelle"}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between rounded-[12px] border border-dashed border-border/60 bg-secondary/30 px-6 py-6">
          <p className="text-[0.82rem] text-muted-foreground">Is ozeti henuz uretilmedi.</p>
          <button
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[7px] border-none text-white text-[0.78rem] font-semibold cursor-pointer shadow-[0_1px_3px_rgba(0,188,212,0.3)] disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: "linear-gradient(135deg, #00bcd4, #00acc1)" }}
            onClick={handleStakeholderSummary}
            disabled={!!actionLoading}
          >
            {actionLoading === "summary" ? (
              <>
                <span className="material-icons-outlined animate-spin" style={{ fontSize: 16 }}>refresh</span>
                Hazirlaniyor
              </>
            ) : (
              <>
                <span className="material-icons-outlined" style={{ fontSize: 16 }}>auto_awesome</span>
                Talep Aciklamasi Uret
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
