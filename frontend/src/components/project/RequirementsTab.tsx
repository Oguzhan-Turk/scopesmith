import { useState } from "react";
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{requirements.length} talep</p>
      </div>

      {requirements.length === 0 ? (
        <div className="text-center py-16 border border-dashed rounded-xl">
          <p className="text-sm text-muted-foreground mb-3">Henüz talep eklenmedi</p>
          <Button variant="outline" onClick={() => setReqDialogOpen(true)}>+ İlk Talebi Ekle</Button>
        </div>
      ) : (
        <div className="border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5 w-10">#</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5 w-16">Tip</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Açıklama</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5 w-28">Durum</th>
                <th className="text-right text-xs font-medium text-muted-foreground px-4 py-2.5 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {requirements.map((req) => {
                const isSelected = selectedRequirementId === req.id;
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
                        handleSelectRequirement(-1); // signal deselect
                      } else {
                        handleSelectRequirement(req.id);
                        setActiveTab("detail");
                      }
                    }}
                  >
                    <td className="px-4 py-2.5 text-sm text-muted-foreground">
                      {req.sequenceNumber || req.id}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                        req.type === "BUG" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
                      }`}>
                        {req.type === "BUG" ? "Bug" : "Feature"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-sm line-clamp-1">{req.rawText}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${statusColor(req.status)}`} />
                        <span className="text-xs text-muted-foreground">{statusLabel[req.status] || req.status}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleAnalyzeWithConfirm(req.id)}
                          disabled={!!actionLoading}
                          className="text-xs text-primary hover:underline"
                        >
                          {actionLoading === `analyze-${req.id}` ? "..." : "Analiz"}
                        </button>
                        <button
                          onClick={() => { setReqMenuOpen(reqMenuOpen === req.id ? null : req.id); }}
                          className="px-1 text-muted-foreground hover:text-foreground text-sm"
                        >
                          ···
                        </button>
                        {reqMenuOpen === req.id && (
                          <div className="absolute right-4 mt-16 z-50 bg-background border rounded-md shadow-lg p-0.5 min-w-[80px]" onMouseLeave={() => setReqMenuOpen(null)}>
                            <button className="w-full text-left px-2.5 py-1.5 text-xs text-destructive hover:bg-muted rounded-sm" onClick={() => { setReqMenuOpen(null); handleDeleteRequirement(req.id); }}>Sil</button>
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

      {/* Talep ekleme butonu — sağ alt */}
      <div className="flex justify-end">
        <Button onClick={() => setReqDialogOpen(true)}>+ Yeni Talep</Button>
      </div>
    </div>
  );
}
