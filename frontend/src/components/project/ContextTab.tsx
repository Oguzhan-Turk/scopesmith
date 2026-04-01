import { Code, FileText, RefreshCw, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { timeAgo } from "@/lib/utils";
import { suggestFeatures } from "@/api/client";
import type { ContextTabProps } from "./types";

export default function ContextTab({
  project,
  projectId,
  scanPath,
  scanMode,
  gitUrl,
  handleScan,
  documents,
  setDocDialog,
  handleDeleteDocument,
  featureSuggestions,
  setFeatureSuggestions,
  integrationConfig: _integrationConfig,
  actionLoading,
  setActionLoading,
  showToast,
  setActiveTab,
}: ContextTabProps) {
  return (
    <div className="space-y-4">
      {/* Context uyarıları */}
      {!project.hasContext && (
        <div className="flex items-center gap-2 rounded-lg border border-dashed border-warning/30 bg-warning/5 px-4 py-2.5 text-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-warning flex-shrink-0" />
          <span className="font-medium">Context yok</span>
          <span className="text-muted-foreground">— Kod taraması yaparak analiz kalitesini artırın.</span>
        </div>
      )}
      {project.contextStale && (
        <div className="flex items-center justify-between rounded-lg border border-warning/20 bg-warning/5 px-4 py-2.5">
          <div className="flex items-center gap-2 text-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-warning flex-shrink-0" />
            <span className="font-medium">Context güncellenmeli</span>
            <span className="text-muted-foreground">
              {project.lastScannedAt ? `Son tarama: ${timeAgo(project.lastScannedAt)}` :
               project.daysSinceLastScan != null ? `${project.daysSinceLastScan} gün önce tarandı` : ""}
              {project.commitsBehind != null && project.commitsBehind > 0 && ` · ${project.commitsBehind} commit geride`}
            </span>
          </div>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleScan}>
            Yeniden Tara
          </Button>
        </div>
      )}

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
                  <button onClick={() => { if (window.confirm(`"${doc.filename}" belgesini silmek istediğinizden emin misiniz?`)) handleDeleteDocument(doc.id); }} className="text-xs text-destructive hover:underline flex-shrink-0 ml-2">Sil</button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Kod Tarama */}
      {(() => {
        const hasSource = scanMode === "git" ? !!gitUrl.trim() : !!scanPath.trim();
        const sourceLabel = scanMode === "git" ? gitUrl : scanPath;
        return (
          <div className="flex items-center justify-between rounded-lg border px-4 py-3">
            <div className="flex items-center gap-3 min-w-0">
              <Code className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              {hasSource ? (
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{sourceLabel}</p>
                  <p className="text-xs text-muted-foreground">
                    {project.lastScannedAt ? `Son tarama: ${timeAgo(project.lastScannedAt)}` : "Henuz taranmadi"}
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-muted-foreground">Kaynak kod yolu ayarlanmadi</p>
                  <button onClick={() => setActiveTab("integrations")} className="text-xs text-primary hover:underline">
                    Entegrasyonlar'dan ayarla
                  </button>
                </div>
              )}
            </div>
            {hasSource && (
              <Button
                size="sm"
                variant="outline"
                className="flex-shrink-0 ml-3"
                onClick={handleScan}
                disabled={!!actionLoading}
              >
                {actionLoading === "scan" ? "Taraniyor..." : project.lastScannedAt ? "Yeniden Tara" : "Tara"}
              </Button>
            )}
          </div>
        );
      })()}

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

          const stats = [
            { label: "Modüller", value: modules?.length || 0, icon: "📦" },
            { label: "Entity'ler", value: entities?.length || 0, icon: "🗃️" },
            { label: "Endpoint'ler", value: endpoints?.length || 0, icon: "🔗" },
            { label: "Framework", value: techStack?.frameworks ? (techStack.frameworks as string[]).length : 0, icon: "⚙️" },
          ].filter((s) => s.value > 0);

          return (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Proje Yapısı</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {stats.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {stats.map((s) => (
                      <div key={s.label} className="text-center py-2 rounded-lg bg-muted/30">
                        <p className="text-lg font-bold">{s.value}</p>
                        <p className="text-xs text-muted-foreground">{s.label}</p>
                      </div>
                    ))}
                  </div>
                )}
                {techStack && (
                  <div>
                    <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Teknoloji Stack</h5>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(techStack).flatMap(([_k, v]) =>
                        Array.isArray(v) ? (v as string[]).map((item) => (
                          <span key={item} className="px-2 py-0.5 text-xs rounded-full bg-primary/5 border border-primary/10">
                            {item}
                          </span>
                        )) : []
                      )}
                    </div>
                  </div>
                )}
                <details>
                  <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground font-medium">
                    Detaylı yapı bilgisi
                  </summary>
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[...priorityKeys, ...otherKeys].filter((k) => sc[k] && k !== "techStack").map((key) => (
                      <div key={key} className="border-l-2 border-muted-foreground/15 pl-3 space-y-1">
                        <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          {fieldLabels[key] || key}
                        </h5>
                        <p className="text-sm leading-relaxed">{renderValue(sc[key])}</p>
                      </div>
                    ))}
                  </div>
                </details>
              </CardContent>
            </Card>
          );
        } catch { return null; }
      })()}

      {/* AI Analiz Raporu */}
      {project.techContext && (
        <details className="group">
          <summary className="flex items-center justify-between cursor-pointer border rounded-xl px-4 py-3 hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">AI Analiz Raporu</span>
            </div>
            <span className="text-xs text-muted-foreground group-open:hidden">Göster</span>
            <span className="text-xs text-muted-foreground hidden group-open:inline">Gizle</span>
          </summary>
          <div className="mt-2 border rounded-xl px-4 py-4">
            <div className="text-sm leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto">{project.techContext}</div>
          </div>
        </details>
      )}

      {!project.structuredContext && !project.techContext && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground text-sm">
            Kod taraması yapıldıktan sonra proje yapısı burada görünecek.
          </CardContent>
        </Card>
      )}

      {/* Feature Önerisi */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Feature Önerisi</CardTitle>
            <div className="flex items-center gap-2">
              {project.contextStale && (
                <Badge variant="outline" className="text-xs border-warning/30 text-warning font-normal">Context eski</Badge>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  setActionLoading("suggest-features");
                  try {
                    const result = await suggestFeatures(projectId);
                    setFeatureSuggestions(result);
                    showToast(`${result.suggestions.length} öneri üretildi.`, "success");
                  } catch { showToast("Öneriler üretilemedi."); }
                  finally { setActionLoading(null); }
                }}
                disabled={!!actionLoading || !project.hasContext}
              >
                {actionLoading === "suggest-features" ? <><RefreshCw className="w-3.5 h-3.5 mr-1 animate-spin" />Uretiliyor</> : <><Sparkles className="w-3.5 h-3.5 mr-1" />AI'a Sor</>}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!project.hasContext ? (
            <p className="text-sm text-muted-foreground">Feature önerisi için önce proje context'i oluşturulmalı. Yukarıdan kod taraması yapın.</p>
          ) : !featureSuggestions ? (
            <p className="text-sm text-muted-foreground">Proje context'ine göre AI'ın önerdiği özellikler burada görünecek.</p>
          ) : (
            <div className="space-y-3">
              {featureSuggestions.suggestions.map((s, i) => (
                <div key={i} className="border-l-2 border-primary/20 pl-3 py-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{s.title}</span>
                    <Badge variant="outline" className="text-xs">{s.category}</Badge>
                    <Badge variant="secondary" className="text-xs">{s.complexity}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{s.description}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
