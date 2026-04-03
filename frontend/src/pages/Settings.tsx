import { useEffect, useState } from "react";
import {
  getPrompts, updatePrompt, resetPrompt, type PromptItem,
  getCredentials, updateCredentials,
} from "@/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Separator as _Separator } from "@/components/ui/separator";
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

const CREDENTIAL_LABELS: Record<string, { label: string; placeholder: string }> = {
  JIRA_URL: { label: "Jira URL", placeholder: "https://yoursite.atlassian.net" },
  JIRA_EMAIL: { label: "Jira Email", placeholder: "email@example.com" },
  JIRA_API_TOKEN: { label: "Jira API Token", placeholder: "Token" },
  GITHUB_TOKEN: { label: "GitHub Token", placeholder: "ghp_..." },
  GITHUB_REPO: { label: "GitHub Repository", placeholder: "owner/repo" },
};


export default function Settings() {
  const [prompts, setPrompts] = useState<PromptItem[]>([]);
  const [selected, setSelected] = useState<PromptItem | null>(null);
  const [editContent, setEditContent] = useState("");
  const [_credentials, setCredentials] = useState<Record<string, string>>({});
  const [credentialEdits, setCredentialEdits] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    try {
      const [promptData, credData] = await Promise.all([
        getPrompts(),
        getCredentials().catch(() => ({})),
      ]);
      setPrompts(promptData);
      setCredentials(credData);
      setCredentialEdits(credData);
      if (promptData.length > 0) selectPrompt(promptData[0]);
    } catch (e) {
      console.error("Failed to load settings:", e);
    } finally {
      setLoading(false);
    }
  }

  function selectPrompt(p: PromptItem) {
    setSelected(p);
    setEditContent(p.content);
    setMessage(null);
  }

  async function handleSavePrompt() {
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

  async function handleResetPrompt() {
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

  async function handleSaveCredentials() {
    setSaving(true);
    try {
      const updated = await updateCredentials(credentialEdits);
      setCredentials(updated);
      setCredentialEdits(updated);
      setMessage({ text: "Bağlantı bilgileri kaydedildi.", type: "success" });
    } catch (e) {
      setMessage({ text: "Kaydetme başarısız.", type: "error" });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Spinner label="Ayarlar yükleniyor..." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Ayarlar</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Bu ayarlar tüm projelerde geçerlidir. Proje bazlı entegrasyon ayarları için ilgili projenin <strong>Entegrasyonlar</strong> sekmesini kullanın.
        </p>
      </div>

      <Tabs defaultValue="credentials">
        <TabsList>
          <TabsTrigger value="credentials">Bağlantılar</TabsTrigger>
          <TabsTrigger value="prompts">Prompt Yönetimi</TabsTrigger>
        </TabsList>

        {/* CREDENTIALS TAB */}
        <TabsContent value="credentials" className="space-y-6">
          <p className="text-sm text-muted-foreground">
            Jira ve GitHub bağlantı bilgilerini buradan yönetin. Bu bilgiler DB'de saklanır, .env dosyasına gerek kalmaz.
          </p>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Jira</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {["JIRA_URL", "JIRA_EMAIL", "JIRA_API_TOKEN"].map((key) => (
                <div key={key}>
                  <label className="text-sm font-medium mb-1 block">{CREDENTIAL_LABELS[key].label}</label>
                  <input
                    type={key.includes("TOKEN") ? "password" : "text"}
                    placeholder={CREDENTIAL_LABELS[key].placeholder}
                    value={credentialEdits[key] || ""}
                    onChange={(e) => setCredentialEdits({ ...credentialEdits, [key]: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">GitHub</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {["GITHUB_TOKEN", "GITHUB_REPO"].map((key) => (
                <div key={key}>
                  <label className="text-sm font-medium mb-1 block">{CREDENTIAL_LABELS[key].label}</label>
                  <input
                    type={key.includes("TOKEN") ? "password" : "text"}
                    placeholder={CREDENTIAL_LABELS[key].placeholder}
                    value={credentialEdits[key] || ""}
                    onChange={(e) => setCredentialEdits({ ...credentialEdits, [key]: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <Button onClick={handleSaveCredentials} disabled={saving}>
            {saving ? "Kaydediliyor..." : "Kaydet"}
          </Button>
          {message && (
            <p className={`text-sm ${message.type === "success" ? "text-foreground" : "text-destructive"}`}>
              {message.text}
            </p>
          )}
        </TabsContent>

        {/* PROMPTS TAB */}
        <TabsContent value="prompts" className="space-y-6">
          <p className="text-sm text-muted-foreground">
            AI'ın davranışını belirleyen prompt'ları görüntüleyin ve düzenleyin.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="space-y-2">
              {prompts.map((p) => (
                <button
                  key={p.id}
                  onClick={() => selectPrompt(p)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    selected?.id === p.id
                      ? "bg-primary/8 text-foreground border-l-2 border-primary font-medium"
                      : "hover:bg-muted"
                  }`}
                >
                  <div>{PROMPT_LABELS[p.name] || p.name}</div>
                  <div className="text-xs opacity-60">v{p.version}</div>
                </button>
              ))}
            </div>

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
                        <Button size="sm" variant="outline" onClick={handleResetPrompt} disabled={saving}>
                          Varsayılana Dön
                        </Button>
                        <Button size="sm" onClick={handleSavePrompt} disabled={saving || editContent === selected.content}>
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
                      <p className={`text-sm mt-2 ${message.type === "success" ? "text-foreground" : "text-destructive"}`}>
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
