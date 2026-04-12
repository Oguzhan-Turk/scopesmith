import { useEffect, useState } from "react";
import {
  getPrompts, updatePrompt, resetPrompt, type PromptItem,
  getCredentials, updateCredentials,
  getModelConfigs, updateModelConfig, type AiModelConfig, type ModelTier,
} from "@/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";

// ── Prompt labels ────────────────────────────────────────────────────────────
const PROMPT_LABELS: Record<string, string> = {
  "requirement-analysis":       "Talep Analizi",
  "bug-analysis":               "Bug Analizi",
  "analysis-refine":            "Analiz Düzenleme",
  "task-breakdown":             "Task Üretimi",
  "task-breakdown-refine":      "Task Düzenleme",
  "stakeholder-summary":        "İş Özeti",
  "stakeholder-summary-refine": "İş Özeti Düzenleme",
  "change-impact":              "Değişiklik Etkisi",
  "project-context":            "Kod Tarama",
  "project-context-structured": "Yapısal Analiz",
  "document-summary":           "Belge Özeti",
  "feature-suggestion":         "Özellik Önerisi",
  "sp-suggestion":              "SP Tahmini",
};

// ── Credential labels ─────────────────────────────────────────────────────────
const CREDENTIAL_LABELS: Record<string, { label: string; placeholder: string }> = {
  JIRA_URL:        { label: "Jira URL",        placeholder: "https://yoursite.atlassian.net" },
  JIRA_EMAIL:      { label: "Jira Email",      placeholder: "email@example.com" },
  JIRA_API_TOKEN:  { label: "Jira API Token",  placeholder: "Token" },
  GITHUB_TOKEN:    { label: "GitHub Token",    placeholder: "ghp_..." },
  GITHUB_REPO:     { label: "Varsayılan Repository", placeholder: "owner/repo" },
};

// ── Model tier labels ─────────────────────────────────────────────────────────
const MODEL_TIER_LABELS: Record<ModelTier, { name: string; description: string }> = {
  LIGHT:    { name: "Light",    description: "Hızlı, düşük maliyetli işlemler (belge özeti, context tarama)" },
  STANDARD: { name: "Standard", description: "Talep analizi ve task üretimi" },
  PREMIUM:  { name: "Premium",  description: "Karmaşık analizler ve iyileştirmeler" },
};

// ── Known Claude models ───────────────────────────────────────────────────────
interface ModelPreset {
  value: string;
  label: string;
  provider: string;
  input: number | null;
  output: number | null;
}

const KNOWN_MODELS: ModelPreset[] = [
  { value: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5",  provider: "anthropic", input: 1.00, output: 5.00  },
  { value: "claude-sonnet-4-20250514",  label: "Claude Sonnet 4",   provider: "anthropic", input: 3.00, output: 15.00 },
  { value: "claude-opus-4-6",           label: "Claude Opus 4.6",   provider: "anthropic", input: 5.00, output: 25.00 },
  { value: "custom",                    label: "Özel model...",      provider: "",          input: null, output: null  },
];

function getPreset(modelName: string): ModelPreset {
  return KNOWN_MODELS.find((m) => m.value === modelName) ?? KNOWN_MODELS[KNOWN_MODELS.length - 1];
}

// ─────────────────────────────────────────────────────────────────────────────

export default function Settings() {
  const [prompts, setPrompts] = useState<PromptItem[]>([]);
  const [selected, setSelected] = useState<PromptItem | null>(null);
  const [editContent, setEditContent] = useState("");
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [credentialEdits, setCredentialEdits] = useState<Record<string, string>>({});
  const [modelConfigs, setModelConfigs] = useState<AiModelConfig[]>([]);
  const [modelEdits, setModelEdits] = useState<Record<ModelTier, AiModelConfig>>({} as Record<ModelTier, AiModelConfig>);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    async function loadAll() {
      try {
        const [promptData, credData, modelsData] = await Promise.all([
          getPrompts(),
          getCredentials().catch(() => ({})),
          getModelConfigs().catch(() => []),
        ]);
        setPrompts(promptData);
        setCredentials(credData);
        setCredentialEdits(credData);
        setModelConfigs(modelsData);
        setModelEdits(
          modelsData.reduce((acc, item) => {
            acc[item.tier] = { ...item };
            return acc;
          }, {} as Record<ModelTier, AiModelConfig>),
        );
        if (promptData.length > 0) {
          setSelected(promptData[0]);
          setEditContent(promptData[0].content);
        }
      } catch (e) {
        console.error("Failed to load settings:", e);
      } finally {
        setLoading(false);
      }
    }
    void loadAll();
  }, []);

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
    } catch {
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
    } catch {
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
      setMessage({ text: "Kimlik bilgileri kaydedildi.", type: "success" });
    } catch {
      setMessage({ text: "Kaydetme başarısız.", type: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveModels() {
    setSaving(true);
    try {
      const tiers = Object.keys(modelEdits) as ModelTier[];
      const updated = await Promise.all(
        tiers.map((tier) => {
          const model = modelEdits[tier];
          return updateModelConfig(tier, {
            provider: model.provider,
            modelName: model.modelName,
            active: true,
            inputPerMillion: model.inputPerMillion,
            outputPerMillion: model.outputPerMillion,
            latencyClass: model.latencyClass,
            qualityClass: model.qualityClass,
          });
        }),
      );
      setModelConfigs(updated);
      setModelEdits(
        updated.reduce((acc, item) => {
          acc[item.tier] = { ...item };
          return acc;
        }, {} as Record<ModelTier, AiModelConfig>),
      );
      setMessage({ text: "Model ayarları kaydedildi.", type: "success" });
    } catch {
      setMessage({ text: "Model ayarları kaydedilemedi.", type: "error" });
    } finally {
      setSaving(false);
    }
  }

  function updateModelField<K extends keyof AiModelConfig>(tier: ModelTier, key: K, value: AiModelConfig[K]) {
    setModelEdits((prev) => ({ ...prev, [tier]: { ...prev[tier], [key]: value } }));
  }

  function applyModelPreset(tier: ModelTier, presetValue: string) {
    const preset = getPreset(presetValue);
    if (preset.value === "custom") {
      updateModelField(tier, "modelName", "");
      updateModelField(tier, "provider", "");
    } else {
      updateModelField(tier, "modelName", preset.value);
      updateModelField(tier, "provider", preset.provider);
      if (preset.input !== null)  updateModelField(tier, "inputPerMillion",  preset.input);
      if (preset.output !== null) updateModelField(tier, "outputPerMillion", preset.output);
    }
  }

  if (loading) return <Spinner label="Ayarlar yükleniyor..." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Ayarlar</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Bu ayarlar tüm projelerde geçerlidir. Proje bazlı entegrasyon ayarları için ilgili projenin <strong>Proje Ayarları</strong> sekmesini kullanın.
        </p>
      </div>

      <Tabs defaultValue="credentials">
        <TabsList>
          <TabsTrigger value="credentials">API Kimlik Bilgileri</TabsTrigger>
          <TabsTrigger value="models">AI Modelleri</TabsTrigger>
          <TabsTrigger value="prompts">Prompt Yönetimi</TabsTrigger>
        </TabsList>

        {/* ── API KİMLİK BİLGİLERİ ── */}
        <TabsContent value="credentials" className="space-y-6">
          <p className="text-sm text-muted-foreground">
            Jira ve GitHub servislerine bağlanmak için gereken kimlik bilgileri. Hangi projenin hangi Jira/GitHub reposunu kullandığı her projenin <strong>Proje Ayarları</strong> bölümünden ayrıca yapılandırılır.
          </p>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Jira</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {["JIRA_URL", "JIRA_EMAIL", "JIRA_API_TOKEN"].map((key) => (
                <div key={key}>
                  <label className="text-xs text-muted-foreground mb-1 block">{CREDENTIAL_LABELS[key].label}</label>
                  <input
                    type={key.includes("TOKEN") ? "password" : "text"}
                    placeholder={CREDENTIAL_LABELS[key].placeholder}
                    value={credentialEdits[key] || credentials[key] || ""}
                    onChange={(e) => setCredentialEdits({ ...credentialEdits, [key]: e.target.value })}
                    className="w-full px-3 py-1.5 border rounded-md bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">GitHub</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">{CREDENTIAL_LABELS["GITHUB_TOKEN"].label}</label>
                <input
                  type="password"
                  placeholder={CREDENTIAL_LABELS["GITHUB_TOKEN"].placeholder}
                  value={credentialEdits["GITHUB_TOKEN"] || credentials["GITHUB_TOKEN"] || ""}
                  onChange={(e) => setCredentialEdits({ ...credentialEdits, GITHUB_TOKEN: e.target.value })}
                  className="w-full px-3 py-1.5 border rounded-md bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  {CREDENTIAL_LABELS["GITHUB_REPO"].label}
                  <span className="ml-1 text-muted-foreground/60 font-normal">— proje bazlı override edilebilir</span>
                </label>
                <input
                  type="text"
                  placeholder={CREDENTIAL_LABELS["GITHUB_REPO"].placeholder}
                  value={credentialEdits["GITHUB_REPO"] || credentials["GITHUB_REPO"] || ""}
                  onChange={(e) => setCredentialEdits({ ...credentialEdits, GITHUB_REPO: e.target.value })}
                  className="w-full px-3 py-1.5 border rounded-md bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center gap-4">
            <Button onClick={handleSaveCredentials} disabled={saving}>
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </Button>
            {message && (
              <p className={`text-sm ${message.type === "success" ? "text-foreground" : "text-destructive"}`}>
                {message.text}
              </p>
            )}
          </div>
        </TabsContent>

        {/* ── AI MODELLERİ ── */}
        <TabsContent value="models" className="space-y-6">
          <p className="text-sm text-muted-foreground">
            Her tier için hangi modelin kullanılacağını seçin. Fiyatlar maliyet takibinde kullanılır.
          </p>

          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {modelConfigs.map((model) => {
                  const edit = modelEdits[model.tier] ?? model;
                  const isCustom = !KNOWN_MODELS.find((m) => m.value === edit.modelName);
                  const tierInfo = MODEL_TIER_LABELS[model.tier];
                  return (
                    <div key={model.tier} className="px-5 py-4 space-y-3">
                      {/* Tier başlığı + model seçici */}
                      <div className="flex items-start gap-4">
                        <div className="w-28 shrink-0 pt-1">
                          <p className="text-sm font-medium">{tierInfo.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{tierInfo.description}</p>
                        </div>
                        <div className="flex-1 space-y-2">
                          <select
                            value={isCustom ? "custom" : edit.modelName}
                            onChange={(e) => applyModelPreset(model.tier, e.target.value)}
                            className="w-full px-3 py-1.5 border rounded-md bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            {KNOWN_MODELS.map((m) => (
                              <option key={m.value} value={m.value}>{m.label}</option>
                            ))}
                          </select>

                          {/* Özel model girişi */}
                          {isCustom && (
                            <div className="grid gap-2 md:grid-cols-2">
                              <input
                                type="text"
                                placeholder="Provider (anthropic)"
                                value={edit.provider || ""}
                                onChange={(e) => updateModelField(model.tier, "provider", e.target.value)}
                                className="px-3 py-1.5 border rounded-md bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              />
                              <input
                                type="text"
                                placeholder="Model adı"
                                value={edit.modelName || ""}
                                onChange={(e) => updateModelField(model.tier, "modelName", e.target.value)}
                                className="px-3 py-1.5 border rounded-md bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              />
                            </div>
                          )}

                          {/* Fiyatlar — satır içi, kompakt */}
                          <div className="flex items-center gap-4">
                            <span className="text-xs text-muted-foreground shrink-0">Fiyat ($/1M token)</span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-muted-foreground">Girdi</span>
                              <input
                                type="number" step="0.01" min="0"
                                value={edit.inputPerMillion ?? ""}
                                onChange={(e) => updateModelField(model.tier, "inputPerMillion", e.target.value === "" ? null : Number(e.target.value))}
                                className="w-20 px-2 py-1 border rounded-md bg-background text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring tabular-nums"
                              />
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-muted-foreground">Çıktı</span>
                              <input
                                type="number" step="0.01" min="0"
                                value={edit.outputPerMillion ?? ""}
                                onChange={(e) => updateModelField(model.tier, "outputPerMillion", e.target.value === "" ? null : Number(e.target.value))}
                                className="w-20 px-2 py-1 border rounded-md bg-background text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring tabular-nums"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center gap-4">
            <Button onClick={handleSaveModels} disabled={saving || modelConfigs.length === 0}>
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </Button>
            {message && (
              <p className={`text-sm ${message.type === "success" ? "text-foreground" : "text-destructive"}`}>
                {message.text}
              </p>
            )}
          </div>
        </TabsContent>

        {/* ── PROMPT YÖNETİMİ ── */}
        <TabsContent value="prompts" className="space-y-6">
          <p className="text-sm text-muted-foreground">
            AI'ın davranışını belirleyen prompt'ları görüntüleyin ve düzenleyin. Değişiklikler anında geçerli olur.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Sol: prompt listesi */}
            <div className="space-y-1">
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
                  <div>{PROMPT_LABELS[p.name] ?? p.name}</div>
                  <div className="text-xs opacity-50">v{p.version}</div>
                </button>
              ))}
            </div>

            {/* Sağ: editör */}
            <div className="md:col-span-3">
              {selected ? (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">{PROMPT_LABELS[selected.name] ?? selected.name}</CardTitle>
                        <p className="text-xs text-muted-foreground mt-1 font-mono">{selected.name}.txt — v{selected.version}</p>
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
