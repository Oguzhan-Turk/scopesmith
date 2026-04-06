import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { type Document } from "@/api/client";

interface DocForm {
  filename: string;
  content: string;
  docType: string;
}

interface DocDialogProps {
  dialog: { type: "project" } | { type: "requirement"; reqId: number } | null;
  onClose: () => void;
  mode: "file" | "paste";
  onModeChange: (m: "file" | "paste") => void;
  file: File | null;
  onFileChange: (f: File | null) => void;
  form: DocForm;
  onFormChange: (f: DocForm) => void;
  reqDocs: Record<number, Document[]>;
  onDeleteDoc: (id: number, reqId?: number) => void;
  onSubmit: () => void;
  loading: boolean;
}

export default function DocDialog({
  dialog,
  onClose,
  mode,
  onModeChange,
  file,
  onFileChange,
  form,
  onFormChange,
  reqDocs,
  onDeleteDoc,
  onSubmit,
  loading,
}: DocDialogProps) {
  return (
    <Dialog open={!!dialog} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {dialog?.type === "requirement" ? "Talebe Doküman Ekle" : "Proje Dokümanı Ekle"}
          </DialogTitle>
        </DialogHeader>
        {dialog?.type === "requirement" && (reqDocs[dialog.reqId]?.length ?? 0) > 0 && (
          <div className="space-y-1.5 mb-3">
            <h4 className="text-sm font-semibold text-muted-foreground">Mevcut Belgeler</h4>
            {reqDocs[dialog.reqId]?.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                <div className="flex items-center gap-2">
                  <span>{doc.filename}</span>
                  <Badge variant="outline" className="text-xs">{doc.docType}</Badge>
                </div>
                <button onClick={() => onDeleteDoc(doc.id, dialog.reqId)} className="text-xs text-destructive">Sil</button>
              </div>
            ))}
          </div>
        )}
        <div className="space-y-3">
          <div className="flex gap-2">
            <button
              onClick={() => { onModeChange("file"); onFileChange(null); }}
              className={`px-3 py-1.5 text-sm rounded-md border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${mode === "file" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}
            >
              Dosya Yükle
            </button>
            <button
              onClick={() => onModeChange("paste")}
              className={`px-3 py-1.5 text-sm rounded-md border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${mode === "paste" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}
            >
              Metin Yapıştır
            </button>
          </div>
          <div>
            <label htmlFor="doc-type" className="text-sm font-medium mb-1 block">Tür</label>
            <select
              id="doc-type"
              value={form.docType}
              onChange={(e) => onFormChange({ ...form, docType: e.target.value })}
              className="w-full px-3 py-2 border rounded-md bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="MEETING_NOTES">Toplantı Notu</option>
              <option value="EMAIL">E-posta</option>
              <option value="SPECIFICATION">Spesifikasyon</option>
              <option value="ARCHITECTURE">Mimari Doküman</option>
              <option value="OTHER">Diğer</option>
            </select>
          </div>
          {mode === "file" ? (
            <div>
              <label className="text-sm font-medium mb-1 block">Dosya</label>
              <input
                type="file"
                accept=".txt,.md,.csv,.json,.xml,.html,.log,.yml,.yaml"
                onChange={(e) => onFileChange(e.target.files?.[0] || null)}
                className="w-full text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-input file:bg-background file:text-sm file:font-medium hover:file:bg-muted"
              />
              {file && (
                <p className="text-xs text-muted-foreground mt-1">{file.name} — {(file.size / 1024).toFixed(1)}KB</p>
              )}
            </div>
          ) : (
            <>
              <div>
                <label htmlFor="doc-filename" className="text-sm font-medium mb-1 block">Dosya Adı *</label>
                <input
                  id="doc-filename"
                  type="text"
                  value={form.filename}
                  onChange={(e) => onFormChange({ ...form, filename: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="toplanti-notu-12-mart.md"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="doc-content" className="text-sm font-medium">İçerik *</label>
                  <span className={`text-xs ${form.content.length > 10240 ? "text-destructive" : "text-muted-foreground"}`}>
                    {form.content.length.toLocaleString()} / 10,240
                  </span>
                </div>
                <textarea
                  id="doc-content"
                  value={form.content}
                  onChange={(e) => onFormChange({ ...form, content: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md bg-background text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  rows={6}
                  placeholder="Belge içeriğini yapıştırın..."
                />
              </div>
            </>
          )}
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => { onClose(); onFileChange(null); }}>İptal</Button>
            <Button
              size="sm"
              onClick={onSubmit}
              disabled={
                (mode === "file" ? !file : (!form.filename.trim() || !form.content.trim() || form.content.length > 10240))
                || loading
              }
            >
              {loading ? "Ekleniyor..." : "Ekle"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
