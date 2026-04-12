import { useState } from "react";
import { Plus, MoreHorizontal, Zap, RefreshCw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { timeAgo } from "@/lib/utils";
import type { RequirementsTabProps } from "./types";
import { statusColor } from "./utils";

export default function RequirementsTab({
  project,
  requirements,
  loading,
  selectedRequirementId,
  handleSelectRequirement,
  handleAnalyzeWithConfirm,
  handleDeleteRequirement,
  setActiveTab,
  setReqDialogOpen,
  actionLoading,
  traceability,
}: RequirementsTabProps) {
  const hasContext = project.hasContext;
  const [reqMenuOpen, setReqMenuOpen] = useState<number | null>(null);

  // traceability item'larını req id'ye göre map'le
  const traceMap = new Map(
    (traceability?.items ?? []).map((item) => [item.requirementId, item])
  );

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 rounded-lg bg-muted/50 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!hasContext && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-300/40 bg-amber-50/50 dark:bg-amber-950/20 px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Proje bağlamı henüz eklenmedi</p>
            <p className="text-xs text-amber-700/80 dark:text-amber-400/70">
              Talep ekleyebilirsiniz ancak AI analizi projenizi tanımadan çalışacağından sonuçlar genel kalır. Daha isabetli analiz için önce kaynak kodu taratın.
            </p>
            <Button variant="outline" size="sm" className="mt-1.5 h-7 text-xs" onClick={() => setActiveTab("context")}>
              Bağlam Ekle
            </Button>
          </div>
        </div>
      )}

      {requirements.length === 0 ? (
        <div className="text-center py-12 border border-dashed rounded-lg">
          <p className="text-sm text-muted-foreground mb-4">Henüz talep eklenmedi</p>
          <Button variant="outline" size="sm" onClick={() => setReqDialogOpen(true)}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            İlk Talebi Ekle
          </Button>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3 w-10">#</th>
                <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3 w-20">Tip</th>
                <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">Açıklama</th>
                <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3 w-32">Durum</th>
                <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3 hidden md:table-cell">İlerleme</th>
                <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3 w-28 hidden sm:table-cell">Tarih</th>
                <th className="text-right text-sm font-medium text-muted-foreground px-4 py-3 w-24"></th>
              </tr>
            </thead>
            <tbody>
              {requirements.map((req) => {
                const isSelected = selectedRequirementId === req.id;
                const trace = traceMap.get(req.id);
                const statusLabel: Record<string, string> = {
                  NEW: "Yeni", ANALYZED: "Analiz Edildi", CLARIFYING: "Soru Bekleniyor",
                  COMPLETED: "Tamamlandı", RE_ANALYZED: "Yeniden Analiz",
                };
                return (
                  <tr
                    key={req.id}
                    className={`border-b last:border-0 cursor-pointer transition-colors group ${
                      isSelected ? "bg-primary/5" : "hover:bg-muted/30"
                    }`}
                    onClick={() => {
                      if (isSelected) {
                        handleSelectRequirement(-1);
                      } else {
                        handleSelectRequirement(req.id);
                        setActiveTab("detail");
                      }
                    }}
                  >
                    <td className="px-4 py-3 text-sm text-muted-foreground tabular-nums">
                      {req.sequenceNumber || req.id}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                        req.type === "BUG" ? "bg-destructive/10 text-destructive border border-destructive/20" : "bg-primary/8 text-primary border border-primary/20"
                      }`}>
                        {req.type === "BUG" ? "Bug" : "Feature"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm line-clamp-1">{req.rawText}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${statusColor(req.status)}`} />
                        <span className="text-sm text-muted-foreground">{statusLabel[req.status] || req.status}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {trace ? (
                        <div className="flex items-center gap-1.5">
                          {/* Analiz */}
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            trace.analysisId ? "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400" : "text-muted-foreground/40"
                          }`}>
                            Analiz
                          </span>
                          {/* Task */}
                          {trace.taskCount > 0 && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                              {trace.taskCount} task
                            </span>
                          )}
                          {/* Sync */}
                          {trace.syncedTaskCount > 0 && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                              {trace.syncedTaskCount} sync
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground/40">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-xs text-muted-foreground tabular-nums">{timeAgo(req.createdAt)}</span>
                    </td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleAnalyzeWithConfirm(req.id)}
                          disabled={!!actionLoading}
                          className="inline-flex items-center gap-1 text-xs text-primary/70 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded px-1.5 py-0.5 disabled:opacity-50"
                          aria-label="Analiz et"
                        >
                          <Zap className="w-3 h-3" />
                          {actionLoading === `analyze-${req.id}` ? <RefreshCw className="w-3 h-3 animate-spin" /> : "Analiz"}
                        </button>
                        <button
                          onClick={() => { setReqMenuOpen(reqMenuOpen === req.id ? null : req.id); }}
                          className="p-1 text-muted-foreground hover:text-foreground rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          aria-label="Daha fazla"
                        >
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </button>
                        {reqMenuOpen === req.id && (
                          <div className="absolute right-4 mt-16 z-50 bg-popover border rounded-md shadow-md p-1 min-w-[100px]" onMouseLeave={() => setReqMenuOpen(null)}>
                            <button
                              className="w-full text-left px-3 py-1.5 text-sm text-destructive hover:bg-muted rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              onClick={() => { setReqMenuOpen(null); handleDeleteRequirement(req.id); }}
                              aria-label={`#${req.sequenceNumber} talebini sil`}
                            >
                              Sil
                            </button>
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

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{requirements.length} talep</p>
        <Button size="sm" onClick={() => setReqDialogOpen(true)}>
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Yeni Talep
        </Button>
      </div>
    </div>
  );
}
