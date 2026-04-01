import { useEffect, useState } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
      alert(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            Projeyi Kalıcı Olarak Sil
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Warning banner */}
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive">
            Bu işlem <strong>geri alınamaz.</strong> Projeye ait tüm veriler kalıcı olarak silinecek.
          </div>

          {/* What gets deleted */}
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Silinecekler:</p>
            <ul className="text-sm text-muted-foreground space-y-1 pl-4">
              <li>• {summary ? `${summary.requirements} talep` : "Talepler"} ve tüm analizleri</li>
              <li>• Tüm task'lar ve SP kararları</li>
              <li>• {summary ? `${summary.documents} belge` : "Belgeler"}</li>
              <li>• {summary ? `${summary.aiCalls} AI işlem kaydı` : "Kullanım kayıtları"}</li>
              <li>• Entegrasyon ayarları</li>
            </ul>
          </div>

          {/* Jira/GitHub warning */}
          <div className="bg-muted/50 border rounded-lg p-3 text-xs text-muted-foreground">
            Jira ve GitHub'da oluşturulmuş issue'lar <strong>silinmez</strong>. Sadece ScopeSmith'teki bağlantı kaldırılır.
            Dış sistemlerdeki issue'ları manuel yönetmeniz gerekir.
          </div>

          {/* Name confirmation */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="delete-confirm">
              Onaylamak için proje adını yazın:{" "}
              <span className="font-mono text-foreground">{projectName}</span>
            </label>
            <input
              id="delete-confirm"
              type="text"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              className="w-full px-3 py-2 border rounded-md bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder={projectName}
              autoComplete="off"
              autoFocus
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={loading}>
              İptal
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={!confirmed || loading}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              {loading ? "Siliniyor..." : "Projeyi Kalıcı Olarak Sil"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
