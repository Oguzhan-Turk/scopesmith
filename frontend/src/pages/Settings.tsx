import { useEffect, useState } from "react";
import {
  getPrompts, updatePrompt, resetPrompt, type PromptItem,
  getCredentials, updateCredentials,
  getModelConfigs, updateModelConfig, type AiModelConfig, type ModelTier,
} from "@/api/client";
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
  JIRA_URL:        { label: "Base URL",            placeholder: "https://yoursite.atlassian.net" },
  JIRA_EMAIL:      { label: "E-Posta",             placeholder: "email@example.com" },
  JIRA_API_TOKEN:  { label: "API Token",           placeholder: "Token" },
  GITHUB_TOKEN:    { label: "Kişisel Erişim Tokeni (PAT)", placeholder: "ghp_..." },
  GITHUB_REPO:     { label: "Varsayılan Organizasyon/Kullanıcı", placeholder: "owner/repo" },
};

// ── Model tier labels ─────────────────────────────────────────────────────────
const MODEL_TIER_LABELS: Record<ModelTier, { name: string; description: string; badge: string; badgeClass: string }> = {
  LIGHT:    { name: "Light Tier",    description: "Doküman özetleme ve kod tarama gibi hızlı, düşük maliyetli işlemler için optimize edilmiştir.", badge: "TIER 01", badgeClass: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400" },
  STANDARD: { name: "Standard Tier", description: "Gereksinim analizi ve görev oluşturma işlemleri için dengeli performans sunar.", badge: "TIER 02", badgeClass: "bg-blue-50 text-blue-500 dark:bg-blue-950 dark:text-blue-400" },
  PREMIUM:  { name: "Premium Tier",  description: "Karmaşık analizler ve ileri düzey iyileştirmeler için en güçlü katman.", badge: "TIER 03", badgeClass: "bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400" },
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

// ── Sidebar nav items ────────────────────────────────────────────────────────
type SettingsTab = "credentials" | "models" | "prompts";

const SIDEBAR_ITEMS: { value: SettingsTab; label: string; icon: string }[] = [
  { value: "credentials", label: "API Kimlik Bilgileri", icon: "vpn_key" },
  { value: "models",      label: "AI Modelleri",         icon: "smart_toy" },
  { value: "prompts",     label: "Prompt Yönetimi",      icon: "edit_note" },
];

// ─────────────────────────────────────────────────────────────────────────────

export default function Settings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("credentials");
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

  function handleCancelCredentials() {
    setCredentialEdits({ ...credentials });
    setMessage(null);
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
    <div className="flex flex-1">
      {/* ── Settings Sidebar ── */}
      <aside className="w-[220px] bg-card border-r border-border/50 shrink-0 sticky top-[52px] h-[calc(100vh-52px)] py-6">
        <div className="text-[0.62rem] font-semibold text-muted-foreground uppercase tracking-[0.1em] px-5 mb-3">
          Global Ayarlar
        </div>
        {SIDEBAR_ITEMS.map((item) => (
          <button
            key={item.value}
            onClick={() => { setActiveTab(item.value); setMessage(null); }}
            className={`w-full flex items-center gap-2.5 px-5 py-2.5 text-[0.8rem] font-medium border-l-2 transition-all text-left ${
              activeTab === item.value
                ? "border-l-primary bg-gradient-to-r from-primary/4 to-transparent text-foreground font-semibold"
                : "border-l-transparent text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
            }`}
          >
            <span className={`material-icons-outlined text-[17px] ${activeTab === item.value ? "text-primary" : "text-muted-foreground"}`}>
              {item.icon}
            </span>
            {item.label}
          </button>
        ))}
      </aside>

      {/* ── Content Area ── */}
      <main className="flex-1 px-10 py-8 max-w-[900px]">

        {/* ════════ TAB: API Credentials ════════ */}
        {activeTab === "credentials" && (
          <div>
            {/* Header */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-foreground tracking-tight">API Kimlik Bilgileri</h2>
              <p className="text-[0.78rem] text-muted-foreground mt-1 leading-relaxed">
                ScopeSmith'in dis servislerle iletisim kurabilmesi icin gerekli olan yetkilendirme anahtarlarini ve baglanti ayarlarini buradan yonetebilirsiniz.
              </p>
            </div>

            {/* Info banner */}
            <div className="flex items-start gap-2.5 px-4 py-3 rounded-[10px] bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40 mb-6">
              <span className="material-icons-outlined text-[17px] text-blue-500 shrink-0 mt-0.5">info</span>
              <p className="text-[0.75rem] text-blue-800 dark:text-blue-300 leading-relaxed">
                Buradaki kimlik bilgileri organizasyon geneli icin gecerlidir. Proje bazli konfigurasyonlar (Jira projesi, GitHub reposu vb.) her projenin kendi ayarlarindan yonetilir.
              </p>
            </div>

            {/* Jira Section */}
            <div className="flex items-center gap-2 text-[0.72rem] font-semibold text-foreground/80 mb-3">
              <span className="material-icons-outlined text-[17px] text-muted-foreground">cloud</span>
              Jira Entegrasyonu
            </div>
            <p className="text-[0.72rem] text-muted-foreground mb-4">
              Is takibi ve gereksinim senkronizasyonu icin Jira API erisimi gereklidir.
            </p>

            <div className="space-y-4 mb-8">
              <div>
                <label className="text-[0.72rem] font-medium text-muted-foreground mb-1.5 block">{CREDENTIAL_LABELS.JIRA_URL.label}</label>
                <input
                  type="text"
                  placeholder={CREDENTIAL_LABELS.JIRA_URL.placeholder}
                  value={credentialEdits.JIRA_URL || credentials.JIRA_URL || ""}
                  onChange={(e) => setCredentialEdits({ ...credentialEdits, JIRA_URL: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-[10px] border border-border bg-card text-[0.85rem] text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/8 transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[0.72rem] font-medium text-muted-foreground mb-1.5 block">{CREDENTIAL_LABELS.JIRA_EMAIL.label}</label>
                  <input
                    type="text"
                    placeholder={CREDENTIAL_LABELS.JIRA_EMAIL.placeholder}
                    value={credentialEdits.JIRA_EMAIL || credentials.JIRA_EMAIL || ""}
                    onChange={(e) => setCredentialEdits({ ...credentialEdits, JIRA_EMAIL: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-[10px] border border-border bg-card text-[0.85rem] text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/8 transition-all"
                  />
                </div>
                <div>
                  <label className="text-[0.72rem] font-medium text-muted-foreground mb-1.5 block">{CREDENTIAL_LABELS.JIRA_API_TOKEN.label}</label>
                  <input
                    type="password"
                    placeholder={CREDENTIAL_LABELS.JIRA_API_TOKEN.placeholder}
                    value={credentialEdits.JIRA_API_TOKEN || credentials.JIRA_API_TOKEN || ""}
                    onChange={(e) => setCredentialEdits({ ...credentialEdits, JIRA_API_TOKEN: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-[10px] border border-border bg-card text-[0.85rem] text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/8 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* GitHub Section */}
            <div className="flex items-center gap-2 text-[0.72rem] font-semibold text-foreground/80 mb-3 mt-8">
              <span className="material-icons-outlined text-[17px] text-muted-foreground">code</span>
              GitHub Entegrasyonu
            </div>
            <p className="text-[0.72rem] text-muted-foreground mb-4">
              Kod analizi ve PR sureclerini ScopeSmith'le otomasyona baglamak icin kullanilir.
            </p>

            <div className="space-y-4 mb-8">
              <div>
                <label className="text-[0.72rem] font-medium text-muted-foreground mb-1.5 block">{CREDENTIAL_LABELS.GITHUB_TOKEN.label}</label>
                <input
                  type="password"
                  placeholder={CREDENTIAL_LABELS.GITHUB_TOKEN.placeholder}
                  value={credentialEdits.GITHUB_TOKEN || credentials.GITHUB_TOKEN || ""}
                  onChange={(e) => setCredentialEdits({ ...credentialEdits, GITHUB_TOKEN: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-[10px] border border-border bg-card text-[0.85rem] text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/8 transition-all"
                />
              </div>
              <div>
                <label className="text-[0.72rem] font-medium text-muted-foreground mb-1.5 block">
                  {CREDENTIAL_LABELS.GITHUB_REPO.label}
                </label>
                <input
                  type="text"
                  placeholder={CREDENTIAL_LABELS.GITHUB_REPO.placeholder}
                  value={credentialEdits.GITHUB_REPO || credentials.GITHUB_REPO || ""}
                  onChange={(e) => setCredentialEdits({ ...credentialEdits, GITHUB_REPO: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-[10px] border border-border bg-card text-[0.85rem] text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/8 transition-all"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3">
              {message && (
                <p className={`text-[0.78rem] mr-auto ${message.type === "success" ? "text-foreground" : "text-destructive"}`}>
                  {message.text}
                </p>
              )}
              <button
                onClick={handleCancelCredentials}
                className="px-4 py-2 rounded-[9px] border border-border bg-card text-[0.75rem] font-medium text-muted-foreground hover:bg-secondary transition-all"
              >
                Iptal
              </button>
              <button
                onClick={handleSaveCredentials}
                disabled={saving}
                className="px-5 py-2 rounded-[9px] border-none text-white text-[0.78rem] font-semibold shadow-sm disabled:opacity-50 transition-all"
                style={{ background: "linear-gradient(135deg, #00bcd4, #00acc1)", boxShadow: "0 1px 3px rgba(0,188,212,0.3)" }}
              >
                {saving ? "Kaydediliyor..." : "Degisiklikleri Kaydet"}
              </button>
            </div>
          </div>
        )}

        {/* ════════ TAB: AI Models ════════ */}
        {activeTab === "models" && (
          <div>
            {/* Header */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-foreground tracking-tight">AI Modelleri</h2>
              <p className="text-[0.78rem] text-muted-foreground mt-1">
                Operasyonel maliyetleri ve analiz derinligini yonetmek icin sistem geneli model katmanlarini yapilandirin.
              </p>
            </div>

            {/* Model Card */}
            <div className="bg-card rounded-[14px] border border-black/4 dark:border-white/6 shadow-[0_1px_3px_rgba(0,0,0,0.03)] overflow-hidden">
              {/* Card header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-secondary">
                <div className="flex items-center gap-2 text-[0.88rem] font-semibold text-foreground">
                  <span className="material-icons-outlined text-[18px] text-primary">tune</span>
                  AI Model Yapilandirmasi
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[0.65rem] font-semibold bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                  Sistem Aktif
                </span>
              </div>

              {/* Table header */}
              <div className="grid grid-cols-[1fr_200px_90px_90px] px-6 py-2.5 text-[0.65rem] font-semibold uppercase tracking-[0.06em] text-muted-foreground bg-secondary/50 border-b border-secondary">
                <div>Tier</div>
                <div>Model Secimi</div>
                <div className="text-right">Girdi ($/1M)</div>
                <div className="text-right">Cikti ($/1M)</div>
              </div>

              {/* Model rows */}
              {modelConfigs.map((model) => {
                const edit = modelEdits[model.tier] ?? model;
                const isCustom = !KNOWN_MODELS.find((m) => m.value === edit.modelName);
                const tierInfo = MODEL_TIER_LABELS[model.tier];
                return (
                  <div key={model.tier} className="grid grid-cols-[1fr_200px_90px_90px] items-center px-6 py-5 border-b border-secondary/50 last:border-b-0">
                    {/* Tier info */}
                    <div>
                      <span className={`inline-flex px-2.5 py-0.5 rounded-md text-[0.65rem] font-bold mb-1 ${tierInfo.badgeClass}`}>
                        {tierInfo.badge}
                      </span>
                      <div className="text-[0.88rem] font-semibold text-foreground">{tierInfo.name}</div>
                      <div className="text-[0.7rem] text-muted-foreground mt-0.5 leading-snug pr-4">{tierInfo.description}</div>
                    </div>

                    {/* Model select */}
                    <div className="space-y-2">
                      <select
                        value={isCustom ? "custom" : edit.modelName}
                        onChange={(e) => applyModelPreset(model.tier, e.target.value)}
                        className="w-full px-3 py-2 rounded-[9px] border border-border bg-card text-[0.82rem] text-foreground outline-none focus:border-primary cursor-pointer"
                      >
                        {KNOWN_MODELS.map((m) => (
                          <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                      </select>

                      {/* Custom model inputs */}
                      {isCustom && (
                        <div className="grid gap-1.5">
                          <input
                            type="text"
                            placeholder="Provider (anthropic)"
                            value={edit.provider || ""}
                            onChange={(e) => updateModelField(model.tier, "provider", e.target.value)}
                            className="px-2.5 py-1.5 rounded-[8px] border border-border bg-card text-[0.75rem] text-foreground outline-none focus:border-primary"
                          />
                          <input
                            type="text"
                            placeholder="Model adi"
                            value={edit.modelName || ""}
                            onChange={(e) => updateModelField(model.tier, "modelName", e.target.value)}
                            className="px-2.5 py-1.5 rounded-[8px] border border-border bg-card text-[0.75rem] text-foreground outline-none focus:border-primary"
                          />
                        </div>
                      )}
                    </div>

                    {/* Input price */}
                    <div className="text-right">
                      <input
                        type="number" step="0.01" min="0"
                        value={edit.inputPerMillion ?? ""}
                        onChange={(e) => updateModelField(model.tier, "inputPerMillion", e.target.value === "" ? null : Number(e.target.value))}
                        className="w-[72px] px-2 py-1.5 rounded-[8px] border border-border bg-card text-[0.82rem] font-semibold text-secondary-foreground text-right tabular-nums outline-none focus:border-primary ml-auto block"
                      />
                    </div>

                    {/* Output price */}
                    <div className="text-right">
                      <input
                        type="number" step="0.01" min="0"
                        value={edit.outputPerMillion ?? ""}
                        onChange={(e) => updateModelField(model.tier, "outputPerMillion", e.target.value === "" ? null : Number(e.target.value))}
                        className="w-[72px] px-2 py-1.5 rounded-[8px] border border-border bg-card text-[0.82rem] font-semibold text-secondary-foreground text-right tabular-nums outline-none focus:border-primary ml-auto block"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* AI insight banner */}
            <div className="flex items-start gap-3 px-5 py-4 rounded-xl mt-5" style={{ background: "linear-gradient(135deg, var(--color-emerald-50, #f0fdfa), var(--color-cyan-50, #ecfeff))", border: "1px solid var(--color-teal-100, #ccfbf1)" }}>
              <div className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0" style={{ background: "#00bcd4" }}>
                <span className="material-icons-outlined text-[18px] text-white">auto_awesome</span>
              </div>
              <div>
                <div className="text-[0.78rem] font-semibold" style={{ color: "#0d9488" }}>Akilli Maliyet Tahmini</div>
                <div className="text-[0.72rem] leading-relaxed mt-0.5" style={{ color: "#047857" }}>
                  Sectiginiz model konfigurasyonu, mevcut trafik projeksiyonunuza gore optimize edilmis maliyet-performans dengesi sunmaktadir.
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 mt-6">
              {message && (
                <p className={`text-[0.78rem] mr-auto ${message.type === "success" ? "text-foreground" : "text-destructive"}`}>
                  {message.text}
                </p>
              )}
              <button
                className="px-4 py-2 rounded-[9px] border border-border bg-card text-[0.75rem] font-medium text-muted-foreground hover:bg-secondary transition-all"
              >
                Iptal
              </button>
              <button
                onClick={handleSaveModels}
                disabled={saving || modelConfigs.length === 0}
                className="px-5 py-2 rounded-[9px] border-none text-white text-[0.78rem] font-semibold shadow-sm disabled:opacity-50 transition-all"
                style={{ background: "linear-gradient(135deg, #00bcd4, #00acc1)", boxShadow: "0 1px 3px rgba(0,188,212,0.3)" }}
              >
                {saving ? "Kaydediliyor..." : "Degisiklikleri Kaydet"}
              </button>
            </div>
          </div>
        )}

        {/* ════════ TAB: Prompt Management ════════ */}
        {activeTab === "prompts" && (
          <div>
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground tracking-tight">Prompt Yonetimi</h2>
                <p className="text-[0.78rem] text-muted-foreground mt-1">
                  AI'nin davranisini belirleyen prompt sablonlarini goruntuleyip duzenleyin
                </p>
              </div>
              <span className="px-2.5 py-0.5 rounded-md text-[0.68rem] font-semibold bg-blue-50 text-blue-500 dark:bg-blue-950 dark:text-blue-400">
                Toplam {prompts.length} Sablon
              </span>
            </div>

            {/* Two-panel layout */}
            <div className="grid grid-cols-[200px_1fr] gap-5">
              {/* Prompt list */}
              <div className="bg-card rounded-[14px] border border-black/4 dark:border-white/6 p-3 h-fit">
                <div className="text-[0.62rem] font-semibold text-muted-foreground uppercase tracking-[0.08em] px-2 py-1 mb-1">
                  Sablonlar
                </div>
                {prompts.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => selectPrompt(p)}
                    className={`w-full text-left px-2.5 py-2 rounded-lg text-[0.75rem] font-medium border-l-2 transition-all mb-0.5 ${
                      selected?.id === p.id
                        ? "border-l-primary bg-gradient-to-r from-primary/4 to-transparent text-foreground font-semibold"
                        : "border-l-transparent text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                    }`}
                  >
                    <div>{PROMPT_LABELS[p.name] ?? p.name}</div>
                    <div className="text-[0.58rem] text-muted-foreground/60 mt-0.5">v{p.version}</div>
                  </button>
                ))}
              </div>

              {/* Editor */}
              {selected ? (
                <div className="bg-card rounded-[14px] border border-black/4 dark:border-white/6 shadow-[0_1px_3px_rgba(0,0,0,0.03)] overflow-hidden">
                  {/* Editor header */}
                  <div className="flex items-center justify-between px-6 py-4 border-b border-secondary">
                    <div>
                      <div className="text-[1rem] font-semibold text-foreground">{PROMPT_LABELS[selected.name] ?? selected.name}</div>
                      <div className="text-[0.68rem] text-muted-foreground font-mono mt-0.5">{selected.name}.txt — v{selected.version}</div>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={handleResetPrompt}
                        disabled={saving}
                        className="px-3 py-1.5 rounded-[7px] border border-border bg-card text-[0.72rem] font-medium text-muted-foreground hover:bg-secondary transition-all disabled:opacity-50"
                      >
                        Varsayilana Don
                      </button>
                      <button
                        onClick={handleSavePrompt}
                        disabled={saving || editContent === selected.content}
                        className="px-3 py-1.5 rounded-[7px] border-none text-white text-[0.72rem] font-semibold disabled:opacity-50 transition-all"
                        style={{ background: "linear-gradient(135deg, #00bcd4, #00acc1)" }}
                      >
                        {saving ? "Kaydediliyor..." : "Kaydet"}
                      </button>
                    </div>
                  </div>

                  {/* Textarea */}
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    spellCheck={false}
                    className="w-full min-h-[480px] px-6 py-5 border-none outline-none resize-y font-mono text-[0.78rem] text-foreground leading-[1.8] bg-secondary/30"
                  />

                  {message && (
                    <div className="px-6 pb-3">
                      <p className={`text-[0.78rem] ${message.type === "success" ? "text-foreground" : "text-destructive"}`}>
                        {message.text}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-card rounded-[14px] border border-black/4 dark:border-white/6 flex items-center justify-center py-16">
                  <p className="text-muted-foreground text-sm">Bir prompt secin.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
