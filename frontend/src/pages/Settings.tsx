import { useEffect, useState } from "react";
import { getPrompts, updatePrompt, resetPrompt, type PromptItem } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";

const PROMPT_LABELS: Record<string, string> = {
  "requirement-analysis": "Talep Analizi",
  "bug-analysis": "Bug Analizi",
  "task-breakdown": "Task Üretimi",
  "task-breakdown-refine": "Task İyileştirme",
  "stakeholder-summary": "İş Özeti",
  "stakeholder-summary-refine": "Özet İyileştirme",
  "change-impact": "Değişiklik Etkisi",
  "project-context": "Proje Context",
  "project-context-structured": "Yapısal Context",
};

export default function Settings() {
  const [prompts, setPrompts] = useState<PromptItem[]>([]);
  const [selected, setSelected] = useState<PromptItem | null>(null);
  const [editContent, setEditContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    loadPrompts();
  }, []);

  async function loadPrompts() {
    try {
      const data = await getPrompts();
      setPrompts(data);
      if (data.length > 0 && !selected) {
        selectPrompt(data[0]);
      }
    } catch (e) {
      console.error("Failed to load prompts:", e);
    } finally {
      setLoading(false);
    }
  }

  function selectPrompt(p: PromptItem) {
    setSelected(p);
    setEditContent(p.content);
    setMessage(null);
  }

  async function handleSave() {
    if (!selected) return;
    setSaving(true);
    try {
      const updated = await updatePrompt(selected.name, editContent);
      setSelected(updated);
      setPrompts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setMessage({ text: "Prompt kaydedildi.", type: "success" });
    } catch (e) {
      setMessage({ text: "Kaydetme başarısız.", type: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    if (!selected || !confirm("Bu prompt'u varsayılan haline döndürmek istediğinizden emin misiniz?")) return;
    setSaving(true);
    try {
      const updated = await resetPrompt(selected.name);
      setSelected(updated);
      setEditContent(updated.content);
      setPrompts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setMessage({ text: "Prompt varsayılana döndürüldü.", type: "success" });
    } catch (e) {
      setMessage({ text: "Sıfırlama başarısız.", type: "error" });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Spinner label="Prompt'lar yükleniyor..." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Prompt Yönetimi</h1>
        <p className="text-muted-foreground mt-1">
          AI'ın davranışını belirleyen prompt'ları görüntüleyin ve düzenleyin.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Prompt List */}
        <div className="space-y-2">
          {prompts.map((p) => (
            <button
              key={p.id}
              onClick={() => selectPrompt(p)}
              className={`w-full text-left px-3 py-2 rounded-md text-sm ${
                selected?.id === p.id
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              }`}
            >
              <div>{PROMPT_LABELS[p.name] || p.name}</div>
              <div className="text-xs opacity-60">v{p.version}</div>
            </button>
          ))}
        </div>

        {/* Editor */}
        <div className="md:col-span-3">
          {selected ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{PROMPT_LABELS[selected.name] || selected.name}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">{selected.name}.txt — v{selected.version}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={handleReset} disabled={saving}>
                      Varsayılana Dön
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={saving || editContent === selected.content}>
                      {saving ? "Kaydediliyor..." : "Kaydet"}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={20}
                  className="font-mono text-sm"
                />
                {message && (
                  <p className={`text-sm mt-2 ${message.type === "success" ? "text-primary" : "text-destructive"}`}>
                    {message.text}
                  </p>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="text-center py-12">
              <CardContent>
                <p className="text-muted-foreground">Bir prompt seçin.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
