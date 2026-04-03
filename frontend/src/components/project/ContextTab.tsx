import { useState } from "react";
import { Code, RefreshCw, Plus, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { timeAgo } from "@/lib/utils";
import MarkdownBody from "./MarkdownBody";
import type { ContextTabProps } from "./types";

interface StatItem { key: string; label: string; value: number; items: string[]; }

const PREVIEW_COUNT = 4;

function ObservationList({ label, items }: { label: string; items: string[] }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? items : items.slice(0, PREVIEW_COUNT);
  const hidden = items.length - PREVIEW_COUNT;

  return (
    <div className="space-y-2">
      <h5 className="text-xs font-semibold text-muted-foreground">{label}</h5>
      <ul className="space-y-1.5">
        {visible.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            <span className="mt-1.5 w-1 h-1 rounded-full bg-muted-foreground/40 flex-shrink-0" />
            <span className="leading-relaxed">{item}</span>
          </li>
        ))}
      </ul>
      {items.length > PREVIEW_COUNT && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
        >
          {expanded ? "Daha az göster" : `+ ${hidden} daha`}
        </button>
      )}
    </div>
  );
}

function StatGrid({ stats }: { stats: StatItem[] }) {
  const [active, setActive] = useState<string | null>(null);
  const activestat = stats.find((s) => s.key === active);

  return (
    <div className="space-y-2">
      <div className={`grid gap-2 grid-cols-2 ${stats.length <= 4 ? "md:grid-cols-4" : "md:grid-cols-5"}`}>
        {stats.map((s) => {
          const isActive = active === s.key;
          return (
            <button
              key={s.key}
              onClick={() => setActive(isActive ? null : s.key)}
              className={`text-center py-2.5 px-3 rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                isActive
                  ? "bg-primary/8 border-primary/30 text-primary"
                  : "bg-muted/30 border-transparent hover:bg-muted/60"
              }`}
            >
              <p className="text-lg font-bold leading-none">{s.value}</p>
              <div className="flex items-center justify-center gap-1 mt-1">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                {s.items.length > 0 && (
                  <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${isActive ? "rotate-180" : ""}`} />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Seçili stat'ın listesi */}
      {activestat && activestat.items.length > 0 && (
        <div className="rounded-lg border bg-muted/20 px-3 py-2.5">
          <p className="text-xs font-semibold text-muted-foreground mb-2">{activestat.label}</p>
          <div className="flex flex-wrap gap-1.5">
            {activestat.items.map((item, i) => (
              <span key={i} className="px-2 py-0.5 text-xs rounded-md bg-background border">
                {item}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ContextTab({
  project,
  projectId,
  scanPath,
  setScanPath,
  scanMode,
  setScanMode,
  gitUrl,
  setGitUrl,
  gitToken,
  setGitToken,
  handleScan,
  documents,
  setDocDialog,
  handleDeleteDocument,
  integrationConfig: _integrationConfig,
  actionLoading,
  setActionLoading,
  showToast,
  setActiveTab,
}: ContextTabProps) {
  const [reportOpen, setReportOpen] = useState(true);
  const [scanOpen, setScanOpen] = useState(false);
  return (
    <div className="space-y-4">
      {/* Kaynak Kod */}
      <Card className={!project.hasContext ? "border-[var(--color-warning)]/40" : project.contextStale ? "border-[var(--color-warning)]/40" : ""}>
        <CardHeader className="pb-3 cursor-pointer select-none" onClick={() => setScanOpen(v => !v)}>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Code className="w-4 h-4 text-muted-foreground" />
              Kaynak Kod
            </CardTitle>
            <div className="flex items-center gap-3">
              {!project.hasContext ? (
                <span className="text-xs text-[var(--color-warning)]">Henüz taranmadı</span>
              ) : project.lastScannedAt && (
                <span className={`text-xs ${project.contextStale ? "text-[var(--color-warning)]" : "text-muted-foreground"}`}>
                  Son tarama: {timeAgo(project.lastScannedAt)}
                  {project.contextStale && project.commitsBehind != null && project.commitsBehind > 0 && ` · ${project.commitsBehind} commit geride`}
                </span>
              )}
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${scanOpen ? "rotate-180" : ""}`} />
            </div>
          </div>
        </CardHeader>
        {scanOpen && <CardContent className="space-y-3">
          <div className="inline-flex rounded bg-muted/40 p-0.5 gap-0.5">
            <button
              onClick={() => setScanMode("local")}
              className={`px-2.5 py-0.5 text-xs rounded transition-colors ${scanMode === "local" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground"}`}
            >
              Yerel Klasör
            </button>
            <button
              onClick={() => setScanMode("git")}
              className={`px-2.5 py-0.5 text-xs rounded transition-colors ${scanMode === "git" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground"}`}
            >
              Git URL
            </button>
          </div>
          {scanMode === "local" ? (
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="/Users/username/projects/my-app"
                value={scanPath}
                onChange={(e) => setScanPath(e.target.value)}
                className="flex-1 px-3 py-1.5 border rounded-md bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <Button
                size="sm"
                onClick={handleScan}
                disabled={!!actionLoading || !scanPath.trim()}
              >
                {actionLoading === "scan" ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : project.lastScannedAt ? "Yeniden Tara" : "Tara"}
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <input
                type="text"
                placeholder="https://github.com/owner/repo.git"
                value={gitUrl}
                onChange={(e) => setGitUrl(e.target.value)}
                className="w-full px-3 py-1.5 border rounded-md bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <div className="flex gap-2">
                <input
                  type="password"
                  placeholder="ghp_... (private repo için)"
                  value={gitToken}
                  onChange={(e) => setGitToken(e.target.value)}
                  className="flex-1 px-3 py-1.5 border rounded-md bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <Button
                  size="sm"
                  onClick={handleScan}
                  disabled={!!actionLoading || !gitUrl.trim()}
                >
                  {actionLoading === "scan" ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : project.lastScannedAt ? "Yeniden Tara" : "Tara"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>}
      </Card>

      {/* Proje Dokümanları */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Proje Dokümanları</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setDocDialog({ type: "project" })}>
              <Plus className="w-3.5 h-3.5 mr-1" />Dokuman Ekle
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">Henüz proje dokümanı eklenmedi. Toplantı notları, mimari dokümanlar veya e-posta içerikleri ekleyerek AI analizlerini zenginleştirin.</p>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-start justify-between py-2 border-b last:border-0">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{doc.filename}</span>
                      <Badge variant="outline" className="text-xs">{doc.docType}</Badge>
                      <span className="text-xs text-muted-foreground">{(doc.contentLength / 1024).toFixed(1)}KB</span>
                    </div>
                    {doc.summary && (
                      <p className="text-xs text-muted-foreground mt-1 truncate max-w-lg">{doc.summary}</p>
                    )}
                  </div>
                  <button onClick={() => { if (window.confirm(`"${doc.filename}" belgesini silmek istediğinizden emin misiniz?`)) handleDeleteDocument(doc.id); }} aria-label={`${doc.filename} belgesini sil`} className="text-xs text-destructive hover:underline flex-shrink-0 ml-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded">Sil</button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Structured Context */}
      {project.structuredContext && (() => {
        try {
          const sc = JSON.parse(project.structuredContext) as Record<string, unknown>;
          const fieldLabels: Record<string, string> = {
            techStack: "Teknoloji Stack", architecture: "Mimari", mainModules: "Ana Modüller",
            buildTool: "Build Aracı", testFramework: "Test Framework", codeStyle: "Kod Stili",
            dependencies: "Bağımlılıklar", summary: "Özet", language: "Dil", framework: "Framework",
            architecturePattern: "Mimari Desen", architectureDescription: "Mimari Açıklama",
            modules: "Modüller", entities: "Entity'ler", apiEndpoints: "API Endpoint'leri",
            externalIntegrations: "Dış Entegrasyonlar", keyObservations: "Önemli Gözlemler",
          };
          const priorityKeys = ["techStack", "architecturePattern", "modules", "entities", "externalIntegrations"];
          const otherKeys = Object.keys(sc).filter((k) => !priorityKeys.includes(k));
          const renderValue = (val: unknown): string => {
            if (Array.isArray(val)) {
              if (val.length === 0) return "—";
              if (typeof val[0] === "object" && val[0] !== null) {
                return (val as Record<string, unknown>[])
                  .map((item) => String(item.name || item.title || JSON.stringify(item)))
                  .join(", ");
              }
              return val.join(", ");
            }
            if (typeof val === "object" && val !== null) {
              return Object.entries(val as Record<string, unknown>)
                .map(([k, v]) => `${k}: ${Array.isArray(v) ? (v as unknown[]).join(", ") : String(v)}`)
                .join(" · ");
            }
            return String(val);
          };
          const modules = sc.modules as unknown[] | undefined;
          const entities = sc.entities as unknown[] | undefined;
          const endpoints = sc.apiEndpoints as unknown[] | undefined;
          const techStack = sc.techStack as Record<string, unknown> | undefined;
          const frameworks = techStack?.frameworks as string[] | undefined;
          const externalIntegrations = sc.externalIntegrations as string[] | undefined;

          const toNames = (arr: unknown[] | undefined): string[] => {
            if (!arr || arr.length === 0) return [];
            if (typeof arr[0] === "object" && arr[0] !== null)
              return (arr as Record<string, unknown>[]).map((item) =>
                String(item.name || item.title || item.path || JSON.stringify(item)));
            return arr as string[];
          };

          const stats = [
            { key: "modules",      label: "Modüller",        value: modules?.length            || 0, items: toNames(modules) },
            { key: "entities",     label: "Entity'ler",      value: entities?.length           || 0, items: toNames(entities) },
            { key: "endpoints",    label: "Endpoint'ler",    value: endpoints?.length          || 0, items: toNames(endpoints) },
            { key: "frameworks",   label: "Framework",       value: frameworks?.length         || 0, items: frameworks || [] },
            { key: "integrations", label: "Dış Entegrasyon", value: externalIntegrations?.length || 0, items: externalIntegrations || [] },
          ].filter((s) => s.value > 0);

          // stat grid + architecturePattern + architectureDescription hariç alanlar
          // Stat kartlarında gösterilen veya UI'da gösterilmeyecek alanlar
          // Not: architecturePattern, keyObservations, architectureDescription
          // AI promptlarına giriyor ama UI'da gösterilmiyor — AI tahmini olduğu için
          // yanlış güven yaratabilir.
          const hiddenKeys = new Set([
            "modules", "entities", "apiEndpoints", "techStack",
            "externalIntegrations", "architecturePattern",
            "architectureDescription", "keyObservations",
          ]);
          const remainingKeys = [...priorityKeys, ...otherKeys].filter(
            (k) => sc[k] && !hiddenKeys.has(k)
          );

          return (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Proje Yapısı</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Stat kartları */}
                {stats.length > 0 && (
                  <StatGrid stats={stats} />
                )}

                {/* Önemli gözlemler ve diğer alanlar */}
                {remainingKeys.length > 0 && (
                  <div className="space-y-4 pt-1">
                    {remainingKeys.map((key) => {
                      const val = sc[key];
                      const isObservations = Array.isArray(val) && val.length > 0 && typeof val[0] === "string";
                      if (isObservations) {
                        const items = val as string[];
                        return (
                          <ObservationList
                            key={key}
                            label={fieldLabels[key] || key}
                            items={items}
                          />
                        );
                      }
                      return (
                        <div key={key} className="border-l-2 border-muted-foreground/15 pl-3 space-y-1">
                          <h5 className="text-xs font-semibold text-muted-foreground">{fieldLabels[key] || key}</h5>
                          <p className="text-sm leading-relaxed">{renderValue(val)}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        } catch { return null; }
      })()}

      {/* AI Analiz Raporu */}
      {project.techContext && (
        <Card>
          <CardHeader className="cursor-pointer select-none" onClick={() => setReportOpen(v => !v)}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${reportOpen ? "" : "-rotate-90"}`} />
                <CardTitle className="text-base">AI Analiz Raporu</CardTitle>
              </div>
            </div>
          </CardHeader>
          {reportOpen && (
            <CardContent className="space-y-0 max-h-[480px] overflow-y-auto">
              <MarkdownBody text={project.techContext} />
            </CardContent>
          )}
        </Card>
      )}

      {!project.structuredContext && !project.techContext && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground text-sm">
            Kod taraması yapıldıktan sonra proje yapısı burada görünecek.
          </CardContent>
        </Card>
      )}

    </div>
  );
}
