import { useEffect, useRef, useState } from "react";
import type { RequirementsTabProps } from "./types";

export default function RequirementsTab({
  project,
  requirements,
  loading,
  selectedRequirementId,
  handleSelectRequirement,
  handleAnalyzeWithConfirm,
  handleDeleteRequirement,
  handleUpdateRequirement,
  setActiveTab,
  setReqDialogOpen,
  actionLoading,
  traceability,
}: RequirementsTabProps) {
  const hasContext = project.hasContext;
  const [reqMenuOpen, setReqMenuOpen] = useState<number | null>(null);
  const [editDialog, setEditDialog] = useState<{ id: number; rawText: string; type: string } | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const editTextRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editDialog) editTextRef.current?.focus();
  }, [editDialog]);

  const traceMap = new Map(
    (traceability?.items ?? []).map((item) => [item.requirementId, item])
  );

  const statusLabel: Record<string, string> = {
    NEW: "Yeni", ANALYZED: "Analiz Edildi", CLARIFYING: "Soru Bekleniyor",
    COMPLETED: "Tamamlandı", RE_ANALYZED: "Yeniden Analiz",
  };
  const statusDotColor: Record<string, string> = {
    NEW: "#cbd5e1", ANALYZED: "#3b82f6", CLARIFYING: "#f59e0b",
    COMPLETED: "#10b981", RE_ANALYZED: "#6366f1",
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-xl bg-card animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Content header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-[1.25rem] font-bold text-foreground tracking-tight">Talepler</h2>
          <p className="text-[0.75rem] text-muted-foreground mt-0.5">Feature ve bug taleplerini ekleyin, AI ile analiz edin</p>
        </div>
        <button
          onClick={() => setReqDialogOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[0.78rem] font-semibold text-white transition-all hover:-translate-y-px"
          style={{ background: "linear-gradient(135deg, #00bcd4, #00acc1)", boxShadow: "0 1px 3px rgba(0,188,212,0.3)" }}
        >
          <span className="material-icons-outlined text-[15px]">add</span>
          Yeni Talep
        </button>
      </div>

      {/* Warning — no context */}
      {!hasContext && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-[10px] mb-5" style={{ background: "#fffbeb", border: "1px solid #fef3c7" }}>
          <span className="material-icons-outlined text-[18px] flex-shrink-0" style={{ color: "#f59e0b" }}>warning_amber</span>
          <div className="flex-1 text-[0.75rem]" style={{ color: "#92400e" }}>
            <strong className="font-semibold">Proje bağlamı henüz eklenmedi.</strong> AI analizlerini projenize özel hale getirin.
          </div>
          <button
            onClick={() => setActiveTab("context")}
            className="px-3 py-1.5 rounded-md border text-[0.7rem] font-medium bg-white whitespace-nowrap"
            style={{ borderColor: "#e2e8f0", color: "#475569" }}
          >
            Bağlam Ekle
          </button>
        </div>
      )}

      {requirements.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-2xl border border-dashed border-border">
          <div className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #00bcd422, #00d1ff11)" }}
          >
            <span className="material-icons-outlined text-[24px]" style={{ color: "#00838f" }}>description</span>
          </div>
          <p className="text-[0.82rem] text-muted-foreground mb-4">Henüz talep eklenmedi</p>
          <button
            onClick={() => setReqDialogOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[0.78rem] font-semibold text-white"
            style={{ background: "linear-gradient(135deg, #00bcd4, #00acc1)", boxShadow: "0 1px 3px rgba(0,188,212,0.3)" }}
          >
            <span className="material-icons-outlined text-[15px]">add</span>
            İlk Talebi Ekle
          </button>
        </div>
      ) : (
        <>
          {/* Requirement cards */}
          <div className="flex flex-col gap-2">
            {requirements.map((req) => {
              const trace = traceMap.get(req.id);
              const isBug = req.type === "BUG";
              const isCompleted = req.status === "COMPLETED";
              const isAnalyzing = actionLoading === `analyze-${req.id}`;
              const accentColor = isBug ? "#ef4444" : "#3b82f6";
              const taskCount = trace?.taskCount ?? 0;
              const syncedCount = trace?.syncedTaskCount ?? 0;
              // progress: 0=new, 1=has analysis, 2=has tasks, 3=has synced tasks
              const progressStep = trace?.analysisId ? (taskCount > 0 ? (syncedCount > 0 ? 3 : 2) : 1) : 0;
              return (
                <div
                  key={req.id}
                  className={`group bg-card rounded-xl border flex cursor-pointer transition-all hover:shadow-[0_4px_16px_rgba(0,0,0,0.07)] ${
                    selectedRequirementId === req.id
                      ? "border-primary/25 shadow-[0_2px_8px_rgba(0,188,212,0.10)]"
                      : "border-border/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
                  }`}
                  onClick={() => { handleSelectRequirement(req.id); setActiveTab("detail"); }}
                >
                  {/* Left accent */}
                  <div className="w-1 flex-shrink-0 rounded-l-xl" style={{ background: accentColor }} />

                  {/* Type badge */}
                  <div className="flex items-center justify-center px-3 flex-shrink-0 border-r border-border/40">
                    <div className="flex flex-col items-center gap-1">
                      <span
                        className="text-[0.6rem] font-bold tracking-wide px-2 py-0.5 rounded"
                        style={{
                          background: isBug ? "#fee2e2" : "#dbeafe",
                          color: isBug ? "#dc2626" : "#2563eb",
                        }}
                      >
                        {isBug ? "HATA" : "ÖZELLİK"}
                      </span>
                      <span className="text-[0.62rem] text-muted-foreground/50 tabular-nums font-medium">
                        #{req.sequenceNumber || req.id}
                      </span>
                    </div>
                  </div>

                  {/* Main content */}
                  <div className="flex-1 min-w-0 px-4 py-4">
                    <div className="text-[0.88rem] font-semibold text-foreground leading-snug line-clamp-2 mb-2">
                      {req.rawText}
                    </div>
                    <div className="flex items-center gap-4 text-[0.72rem] text-muted-foreground">
                      <span className="whitespace-nowrap">
                        {new Date(req.createdAt).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                      {taskCount > 0 && (
                        <span className="flex items-center gap-1.5">
                          <span className="material-icons-outlined text-[13px]">checklist</span>
                          {taskCount} task
                        </span>
                      )}
                      {syncedCount > 0 && (
                        <span className="flex items-center gap-1.5" style={{ color: "#10b981" }}>
                          <span className="material-icons-outlined text-[13px]">sync</span>
                          {syncedCount} sync
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Analiz progress */}
                  <div className="flex flex-col items-center justify-center px-4 flex-shrink-0 border-l border-border/40 min-w-[72px]" onClick={(e) => e.stopPropagation()}>
                    <span className="text-[0.6rem] font-semibold tracking-wide text-muted-foreground/60 uppercase mb-1.5">Analiz</span>
                    <div className="flex gap-0.5 relative group/progress">
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          className="w-4 h-1 rounded-full transition-colors"
                          style={{ background: progressStep > i ? "#00bcd4" : "var(--border)" }}
                        />
                      ))}
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/progress:block z-[200] pointer-events-none">
                        <div className="bg-popover border border-border rounded-lg shadow-lg px-3 py-2 text-[0.7rem] whitespace-nowrap">
                          {[
                            { label: "Analiz", done: progressStep > 0 },
                            { label: "Task", done: progressStep > 1 },
                            { label: "Sync", done: progressStep > 2 },
                          ].map(({ label, done }) => (
                            <div key={label} className="flex items-center gap-2 py-0.5">
                              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: done ? "#00bcd4" : "var(--border)" }} />
                              <span className={done ? "text-foreground font-medium" : "text-muted-foreground"}>{label}</span>
                            </div>
                          ))}
                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent" style={{ borderTopColor: "var(--border)" }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Status chip */}
                  <div className="flex items-center justify-center px-3 flex-shrink-0 border-l border-border/40 min-w-[120px]">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[0.68rem] font-semibold whitespace-nowrap ${
                      req.status === "ANALYZED" || req.status === "RE_ANALYZED"
                        ? "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400"
                        : req.status === "CLARIFYING"
                        ? "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400"
                        : req.status === "COMPLETED"
                        ? "bg-slate-100 text-slate-500 dark:bg-slate-800/50 dark:text-slate-400"
                        : "bg-secondary text-muted-foreground"
                    }`}>
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: statusDotColor[req.status] || "#cbd5e1" }} />
                      {statusLabel[req.status] || req.status}
                    </span>
                  </div>

                  {/* Action + menu */}
                  <div className="flex items-center gap-1 px-3 flex-shrink-0 border-l border-border/40" onClick={(e) => e.stopPropagation()}>
                    {isCompleted ? (
                      <button disabled className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[0.72rem] font-semibold text-muted-foreground bg-secondary opacity-60 cursor-default">
                        <span className="material-icons-outlined text-[14px]">check_circle</span>
                        Analiz Bitti
                      </button>
                    ) : (
                      <button
                        onClick={() => handleAnalyzeWithConfirm(req.id)}
                        disabled={!!actionLoading}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[0.72rem] font-semibold text-white disabled:opacity-50 transition-all hover:-translate-y-px"
                        style={{ background: "linear-gradient(135deg, #00bcd4, #00acc1)", boxShadow: "0 1px 4px rgba(0,188,212,0.3)" }}
                      >
                        {isAnalyzing
                          ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          : <span className="material-icons-outlined text-[14px]">bolt</span>
                        }
                        Analiz Et
                      </button>
                    )}
                    <div className="relative">
                      <button
                        onClick={() => setReqMenuOpen(reqMenuOpen === req.id ? null : req.id)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary transition-colors"
                      >
                        <span className="material-icons-outlined text-[16px]">more_vert</span>
                      </button>
                        {reqMenuOpen === req.id && (
                          <div className="absolute right-0 bottom-full mb-1 z-[100] bg-card border border-border rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.12)] p-1 min-w-[140px]" onMouseLeave={() => setReqMenuOpen(null)}>
                            <button
                              className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[0.75rem] text-foreground hover:bg-secondary rounded-lg transition-colors"
                              onClick={() => { setReqMenuOpen(null); setEditDialog({ id: req.id, rawText: req.rawText, type: req.type || "FEATURE" }); }}
                            >
                              <span className="material-icons-outlined text-[15px] text-muted-foreground">edit</span>
                              Düzenle
                            </button>
                            <div className="h-px bg-border/60 my-0.5" />
                            <button
                              className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[0.75rem] text-destructive hover:bg-destructive/8 rounded-lg transition-colors"
                              onClick={() => { setReqMenuOpen(null); handleDeleteRequirement(req.id); }}
                            >
                              <span className="material-icons-outlined text-[15px]">delete_outline</span>
                              Sil
                            </button>
                          </div>
                        )}
                      </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer count */}
          <div className="mt-4 pt-3">
            <span className="text-[0.72rem] text-muted-foreground">{requirements.length} talep</span>
          </div>
        </>
      )}

      {/* Edit requirement dialog */}
      {editDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setEditDialog(null); }}
        >
          <div className="bg-card rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.18)] w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[1rem] font-bold text-foreground">Talebi Düzenle</h3>
              <button onClick={() => setEditDialog(null)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground">
                <span className="material-icons-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Type toggle */}
            <div className="flex gap-2 mb-4">
              {["FEATURE", "BUG"].map((t) => (
                <button
                  key={t}
                  onClick={() => setEditDialog(d => d ? { ...d, type: t } : d)}
                  className={`px-3 py-1.5 rounded-lg text-[0.72rem] font-semibold border transition-all ${
                    editDialog.type === t
                      ? t === "BUG"
                        ? "bg-red-50 text-red-600 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900"
                        : "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900"
                      : "text-muted-foreground border-border hover:bg-secondary"
                  }`}
                >
                  {t === "BUG" ? "Bug" : "Feature"}
                </button>
              ))}
            </div>

            <textarea
              ref={editTextRef}
              value={editDialog.rawText}
              onChange={(e) => setEditDialog(d => d ? { ...d, rawText: e.target.value } : d)}
              rows={5}
              className="w-full px-3.5 py-3 rounded-xl border border-border bg-background text-[0.85rem] leading-relaxed resize-none focus:outline-none focus:border-[#00bcd4] focus:ring-[3px] focus:ring-[#00bcd4]/10 transition-all"
              placeholder="Talep açıklaması..."
            />

            <div className="flex items-center justify-end gap-2 mt-4">
              <button
                onClick={() => setEditDialog(null)}
                className="px-4 py-2 rounded-lg text-[0.78rem] font-medium text-muted-foreground hover:bg-secondary transition-colors"
              >
                İptal
              </button>
              <button
                disabled={editSaving || !editDialog.rawText.trim()}
                onClick={async () => {
                  setEditSaving(true);
                  await handleUpdateRequirement(editDialog.id, editDialog.rawText.trim(), editDialog.type);
                  setEditSaving(false);
                  setEditDialog(null);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[0.78rem] font-semibold text-white disabled:opacity-50 transition-all"
                style={{ background: "linear-gradient(135deg, #00bcd4, #00acc1)", boxShadow: "0 1px 3px rgba(0,188,212,0.3)" }}
              >
                {editSaving
                  ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <><span className="material-icons-outlined text-[14px]">check</span>Kaydet</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
