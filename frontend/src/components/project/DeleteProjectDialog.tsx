import { useEffect, useState } from "react";
import { AlertTriangle, Trash2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/useToast";
import { getDeleteSummary, deleteProject } from "@/api/client";

interface DeleteProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
  projectName: string;
  onDeleted: () => void;
}

export default function DeleteProjectDialog({
  open,
  onOpenChange,
  projectId,
  projectName,
  onDeleted,
}: DeleteProjectDialogProps) {
  const { showToast } = useToast();
  const [confirmInput, setConfirmInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<{ requirements: number; documents: number; aiCalls: number } | null>(null);

  useEffect(() => {
    if (open) {
      setConfirmInput("");
      setSummary(null);
      getDeleteSummary(projectId).then(setSummary).catch(() => {});
    }
  }, [open, projectId]);

  const confirmed = confirmInput === projectName;

  async function handleDelete() {
    if (!confirmed) return;
    setLoading(true);
    try {
      await deleteProject(projectId, confirmInput);
      onDeleted();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Silme başarısız oldu.";
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  }

  const rows = [
    { label: "Talep", value: summary?.requirements },
    { label: "Belge", value: summary?.documents },
    { label: "AI işlem kaydı", value: summary?.aiCalls },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-4 h-4" />
            Projeyi Kalıcı Olarak Sil
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Silinecekler */}
          <div className="border rounded-lg divide-y text-sm">
            <div className="px-3 py-2 bg-muted/40 text-xs font-medium text-muted-foreground">
              Silinecekler
            </div>
            {rows.map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between px-3 py-2">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium tabular-nums">
                  {value !== undefined ? value : "—"}
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-muted-foreground">Task'lar, analizler, entegrasyon ayarları</span>
              <span className="font-medium">Tümü</span>
            </div>
          </div>

          {/* Jira/GitHub notu */}
          <p className="text-xs text-muted-foreground">
            Jira ve GitHub'da oluşturulan issue'lar silinmez. Sadece ScopeSmith'teki bağlantı kaldırılır.
          </p>

          <Separator />

          {/* İsim onayı */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium block" htmlFor="delete-confirm">
              Onaylamak için proje adını yazın
            </label>
            <p className="text-xs text-muted-foreground font-mono select-none">{projectName}</p>
            <input
              id="delete-confirm"
              type="text"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              className="w-full px-3 py-2 border rounded-md bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Proje adını buraya yazın..."
              autoComplete="off"
              autoFocus
            />
          </div>

          {/* Eylemler */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={loading}>
              İptal
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={!confirmed || loading}
            >
              {loading
                ? <><RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />Siliniyor</>
                : <><Trash2 className="w-3.5 h-3.5 mr-1.5" />Kalıcı Olarak Sil</>
              }
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
