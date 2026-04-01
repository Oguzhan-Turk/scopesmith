import { useLayoutEffect, useRef, useState } from "react";
import { Code, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { IntegrationsTabProps } from "./types";

export default function IntegrationsTab({
  project,
  integrationConfig,
  setIntegrationConfig,
  handleSaveIntegrationConfig,
  actionLoading,
  scanPath,
  setScanPath,
  scanMode,
  setScanMode,
  gitUrl,
  setGitUrl,
  gitToken,
  setGitToken,
  isAdmin,
  onDeleteProject,
}: IntegrationsTabProps) {
  const hasSource = scanMode === "git" ? !!gitUrl.trim() : !!scanPath.trim();

  const containerRef = useRef<HTMLDivElement>(null);
  const localRef = useRef<HTMLButtonElement>(null);
  const gitRef = useRef<HTMLButtonElement>(null);
  const [slider, setSlider] = useState({ left: 0, width: 0 });

  useLayoutEffect(() => {
    const activeBtn = scanMode === "local" ? localRef.current : gitRef.current;
    const container = containerRef.current;
    if (activeBtn && container) {
      const cr = container.getBoundingClientRect();
      const br = activeBtn.getBoundingClientRect();
      setSlider({ left: br.left - cr.left, width: br.width });
    }
  }, [scanMode]);

  return (
    <div className="space-y-6">
      {/* Kaynak Kod */}
      <div>
        <h3 className="text-sm font-medium mb-3">Kaynak Kod</h3>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Code className="w-4 h-4 text-primary" />
                </div>
                <CardTitle className="text-base">Proje Kaynagi</CardTitle>
              </div>
              {hasSource ? (
                <Badge variant="default" className="text-xs">Ayarli</Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">Ayarlanmadi</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div ref={containerRef} className="relative inline-flex rounded-lg bg-muted/40 p-0.5">
              {slider.width > 0 && (
                <div
                  className="absolute top-0.5 rounded-md bg-primary shadow-sm transition-all duration-250 ease-out"
                  style={{ left: slider.left, width: slider.width, height: "calc(100% - 4px)" }}
                />
              )}
              <button
                ref={localRef}
                onClick={() => setScanMode("local")}
                className={`relative z-10 px-3.5 py-1.5 text-sm rounded-md transition-colors duration-200 ${
                  scanMode === "local" ? "text-primary-foreground font-medium" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Yerel Klasör
              </button>
              <button
                ref={gitRef}
                onClick={() => setScanMode("git")}
                className={`relative z-10 px-3.5 py-1.5 text-sm rounded-md transition-colors duration-200 ${
                  scanMode === "git" ? "text-primary-foreground font-medium" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Git URL
              </button>
            </div>
            {scanMode === "local" ? (
              <div>
                <label htmlFor="scan-path" className="text-xs text-muted-foreground mb-1 block">Proje Klasör Yolu</label>
                <input
                  id="scan-path"
                  type="text"
                  placeholder="/Users/username/projects/my-app"
                  value={scanPath}
                  onChange={(e) => setScanPath(e.target.value)}
                  className="w-full px-3 py-1.5 border rounded-md bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <div>
                  <label htmlFor="git-url" className="text-xs text-muted-foreground mb-1 block">Repository URL</label>
                  <input
                    id="git-url"
                    type="text"
                    placeholder="https://github.com/owner/repo.git"
                    value={gitUrl}
                    onChange={(e) => setGitUrl(e.target.value)}
                    className="w-full px-3 py-1.5 border rounded-md bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
                <div>
                  <label htmlFor="git-token" className="text-xs text-muted-foreground mb-1 block">Token (private repo, opsiyonel)</label>
                  <input
                    id="git-token"
                    type="password"
                    placeholder="ghp_..."
                    value={gitToken}
                    onChange={(e) => setGitToken(e.target.value)}
                    className="w-full px-3 py-1.5 border rounded-md bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
              </div>
            )}
            <p className="text-xs text-muted-foreground">Tarama islemini Context sekmesinden baslatabilirsiniz.</p>
          </CardContent>
        </Card>
      </div>

      {/* Issue Tracker */}
      <div>
        <h3 className="text-sm font-medium mb-3">Issue Tracker</h3>
        <p className="text-xs text-muted-foreground mb-3">Task'lari gönderecginiz platformu seçin. Bir projede tek platform aktif olabilir.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Jira Card */}
          <Card
            className={`cursor-pointer transition-all ${
              integrationConfig.jira?.projectKey && !integrationConfig.github?.repo
                ? "ring-2 ring-info"
                : !integrationConfig.jira?.projectKey && integrationConfig.github?.repo
                ? "opacity-50"
                : ""
            }`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="currentColor"><path d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.005-1.005zm5.723-5.756H5.736a5.215 5.215 0 0 0 5.215 5.214h2.129v2.058a5.218 5.218 0 0 0 5.215 5.214V6.758a1.001 1.001 0 0 0-1.001-1.001zM23.013 0H11.455a5.215 5.215 0 0 0 5.215 5.215h2.129v2.057A5.215 5.215 0 0 0 24.013 12.487V1.005A1.005 1.005 0 0 0 23.013 0z"/></svg>
                  </div>
                  <CardTitle className="text-base">Jira</CardTitle>
                </div>
                {integrationConfig.jira?.projectKey ? (
                  <Badge variant="default" className="text-xs">Aktif</Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">Pasif</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="jira-project-key" className="text-xs text-muted-foreground mb-1 block">Proje Key</label>
                  <input id="jira-project-key" type="text" placeholder="SS"
                    value={integrationConfig.jira?.projectKey || ""}
                    onChange={(e) => setIntegrationConfig({ ...integrationConfig, jira: { ...integrationConfig.jira, projectKey: e.target.value.toUpperCase() }, github: undefined })}
                    className="w-full px-3 py-1.5 border rounded-md bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                </div>
                <div>
                  <label htmlFor="jira-issue-type" className="text-xs text-muted-foreground mb-1 block">Issue Type</label>
                  <input id="jira-issue-type" type="text" placeholder="Task"
                    value={integrationConfig.jira?.defaultIssueType || ""}
                    onChange={(e) => setIntegrationConfig({ ...integrationConfig, jira: { ...integrationConfig.jira, defaultIssueType: e.target.value } })}
                    className="w-full px-3 py-1.5 border rounded-md bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                </div>
              </div>
              <div>
                <label htmlFor="jira-category-mode" className="text-xs text-muted-foreground mb-1 block">Kategori Modu</label>
                <select id="jira-category-mode"
                  value={integrationConfig.jira?.categoryMode || "BOTH"}
                  onChange={(e) => setIntegrationConfig({ ...integrationConfig, jira: { ...integrationConfig.jira, categoryMode: e.target.value as "LABELS_ONLY" | "COMPONENTS" | "BOTH" } })}
                  className="w-full px-3 py-1.5 border rounded-md bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <option value="BOTH">Label + Component</option>
                  <option value="LABELS_ONLY">Sadece Label</option>
                  <option value="COMPONENTS">Sadece Component</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* GitHub Card */}
          <Card
            className={`cursor-pointer transition-all ${
              integrationConfig.github?.repo && !integrationConfig.jira?.projectKey
                ? "ring-2 ring-foreground/30"
                : !integrationConfig.github?.repo && integrationConfig.jira?.projectKey
                ? "opacity-50"
                : ""
            }`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-foreground/5 flex items-center justify-center">
                    <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
                  </div>
                  <CardTitle className="text-base">GitHub Issues</CardTitle>
                </div>
                {integrationConfig.github?.repo ? (
                  <Badge variant="default" className="text-xs">Aktif</Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">Pasif</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <label htmlFor="github-repo" className="text-xs text-muted-foreground mb-1 block">Repository</label>
              <input id="github-repo" type="text" placeholder="owner/repo"
                value={integrationConfig.github?.repo || ""}
                onChange={(e) => setIntegrationConfig({ ...integrationConfig, github: { repo: e.target.value }, jira: undefined })}
                className="w-full px-3 py-1.5 border rounded-md bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSaveIntegrationConfig} disabled={actionLoading === "save-config"}>
          {actionLoading === "save-config" ? "Kaydediliyor..." : <><Save className="w-3.5 h-3.5 mr-1.5" />Ayarlari Kaydet</>}
        </Button>
      </div>

      {/* Projeyi Sil — sadece admin görür */}
      {isAdmin && (
        <div className="border border-destructive/25 rounded-lg p-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Projeyi Sil</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              <span className="font-mono">{project.name}</span> projesi ve tüm talepler, analizler, task'lar kalıcı olarak silinir.
            </p>
          </div>
          <Button
            variant="destructive"
            size="sm"
            className="shrink-0"
            onClick={onDeleteProject}
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
            Projeyi Sil
          </Button>
        </div>
      )}
    </div>
  );
}
