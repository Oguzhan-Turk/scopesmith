import { useState } from "react";
import { Plus, MoreHorizontal, Zap, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RequirementsTabProps } from "./types";
import { statusColor } from "./utils";

export default function RequirementsTab({
  requirements,
  selectedRequirementId,
  handleSelectRequirement,
  handleAnalyzeWithConfirm,
  handleDeleteRequirement,
  setActiveTab,
  setReqDialogOpen,
  actionLoading,
}: RequirementsTabProps) {
  const [reqMenuOpen, setReqMenuOpen] = useState<number | null>(null);

  return (
    <div className="space-y-4">
      {requirements.length === 0 ? (
        <div className="text-center py-12 border border-dashed rounded-lg">
          <p className="text-sm text-muted-foreground mb-4">Henuz talep eklenmedi</p>
          <Button variant="outline" size="sm" onClick={() => setReqDialogOpen(true)}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Ilk Talebi Ekle
          </Button>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3 w-10">#</th>
                <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3 w-20">Tip</th>
                <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">Aciklama</th>
                <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3 w-32">Durum</th>
                <th className="text-right text-sm font-medium text-muted-foreground px-4 py-3 w-24"></th>
              </tr>
            </thead>
            <tbody>
              {requirements.map((req) => {
                const isSelected = selectedRequirementId === req.id;
                const statusLabel: Record<string, string> = {
                  NEW: "Yeni", ANALYZED: "Analiz Edildi", CLARIFYING: "Soru Bekleniyor",
                  COMPLETED: "Tamamlandi", RE_ANALYZED: "Yeniden Analiz",
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
                        req.type === "BUG" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
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
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleAnalyzeWithConfirm(req.id)}
                          disabled={!!actionLoading}
                          className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded px-1.5 py-0.5 disabled:opacity-50"
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
