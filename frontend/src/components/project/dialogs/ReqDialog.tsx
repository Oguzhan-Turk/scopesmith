import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { type FeatureSuggestionResult } from "@/api/client";

interface ReqDialogProps {
  open: boolean;
  onClose: () => void;
  value: string;
  onChange: (v: string) => void;
  type: "FEATURE" | "BUG";
  onTypeChange: (t: "FEATURE" | "BUG") => void;
  onSubmit: () => void;
  loading: boolean;
  hasContext: boolean;
  suggestions: FeatureSuggestionResult | null;
  onSuggest: () => void;
  onPickSuggestion: (text: string) => void;
  suggestLoading: boolean;
}

export default function ReqDialog({
  open,
  onClose,
  value,
  onChange,
  type,
  onTypeChange,
  onSubmit,
  loading,
  hasContext,
  suggestions,
  onSuggest,
  onPickSuggestion,
  suggestLoading,
}: ReqDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Yeni Talep</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="flex gap-2">
            <button
              onClick={() => onTypeChange("FEATURE")}
              className={`px-3 py-1.5 text-sm rounded-md border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                type === "FEATURE" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"
              }`}
            >
              Feature
            </button>
            <button
              onClick={() => onTypeChange("BUG")}
              className={`px-3 py-1.5 text-sm rounded-md border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                type === "BUG" ? "bg-destructive text-destructive-foreground" : "bg-background hover:bg-muted"
              }`}
            >
              Bug
            </button>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="req-text" className="text-sm font-medium">Açıklama</label>
              {hasContext && (
                <button
                  onClick={onSuggest}
                  disabled={suggestLoading}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 focus-visible:outline-none"
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/></svg>
                  {suggestLoading ? "Üretiliyor..." : "AI'a Sor"}
                </button>
              )}
            </div>
            {suggestions && (
              <div className="mb-2 rounded-md border bg-muted/30 divide-y max-h-40 overflow-y-auto">
                {suggestions.suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => onPickSuggestion(`${s.title}\n\n${s.description}`)}
                    className="w-full text-left px-3 py-2 hover:bg-muted/60 transition-colors"
                  >
                    <p className="text-xs font-medium">{s.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{s.description}</p>
                  </button>
                ))}
              </div>
            )}
            <Textarea
              id="req-text"
              placeholder="Talep açıklaması"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              rows={6}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={onClose}>İptal</Button>
            <Button
              size="sm"
              onClick={async () => {
                await onSubmit();
                onClose();
              }}
              disabled={loading || !value.trim()}
            >
              {loading ? "Ekleniyor..." : "Ekle"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
