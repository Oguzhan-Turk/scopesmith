import { useState } from "react";
import { Save, Trash2, GitBranch, FolderOpen, ChevronDown, Layers, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { timeAgo } from "@/lib/utils";
import type { IntegrationsTabProps } from "./types";

export default function IntegrationsTab({
  project,
  integrationConfig,
  setIntegrationConfig,
  handleSaveIntegrationConfig,
  handleUpdateProject,
  actionLoading,
  isAdmin,
  onDeleteProject,
  projectServices,
  serviceGraph,
  newServiceForm,
  setNewServiceForm,
  handleCreateService,
  handleDeleteService,
  handleScanService,
  dependencyForm,
  setDependencyForm,
  handleAddDependency,
  handleDeleteDependency,
}: IntegrationsTabProps) {
  const [editName, setEditName] = useState(project.name);
  const [editDescription, setEditDescription] = useState(project.description ?? "");
  const [infoOpen, setInfoOpen] = useState(false);
  const [trackerOpen, setTrackerOpen] = useState(true);
  const [archOpen, setArchOpen] = useState(false);
  const [multiService, setMultiService] = useState(projectServices.length > 0);

  return (
    <div className="space-y-6">
      {/* Proje Bilgileri — sadece admin */}
      {isAdmin && (
        <Card>
          <CardHeader className="pb-3 cursor-pointer select-none" onClick={() => setInfoOpen(v => !v)}>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-muted-foreground" />
                Proje Bilgileri
              </CardTitle>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${infoOpen ? "rotate-180" : ""}`} />
            </div>
          </CardHeader>
          {infoOpen && <CardContent className="space-y-3">
            <div>
              <label htmlFor="project-name" className="text-xs text-muted-foreground mb-1 block">Proje Adı</label>
              <input
                id="project-name"
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-3 py-1.5 border rounded-md bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div>
              <label htmlFor="project-description" className="text-xs text-muted-foreground mb-1 block">Açıklama</label>
              <textarea
                id="project-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-1.5 border rounded-md bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              />
            </div>
            <div className="flex justify-end">
              <Button
                size="sm"
                variant="outline"
                disabled={actionLoading === "update-project" || !editName.trim()}
                onClick={() => handleUpdateProject(editName.trim(), editDescription.trim())}
              >
                {actionLoading === "update-project" ? "Kaydediliyor..." : <><Save className="w-3.5 h-3.5 mr-1.5" />Kaydet</>}
              </Button>
            </div>
          </CardContent>}
        </Card>
      )}

      {/* Issue Tracker */}
      <Card>
        <CardHeader className="pb-3 cursor-pointer select-none" onClick={() => setTrackerOpen(v => !v)}>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-muted-foreground" />
              Issue Tracker
            </CardTitle>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">Bir projede tek platform aktif olabilir</span>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${trackerOpen ? "rotate-180" : ""}`} />
            </div>
          </div>
        </CardHeader>
        {trackerOpen && <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-3">
          {/* Jira */}
          <div className={`rounded-lg border p-4 space-y-3 ${integrationConfig.github?.repo && !integrationConfig.jira?.projectKey ? "opacity-40" : ""}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-[#0052CC] dark:text-blue-400 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.005-1.005zm5.723-5.756H5.736a5.215 5.215 0 0 0 5.215 5.214h2.129v2.058a5.218 5.218 0 0 0 5.215 5.214V6.758a1.001 1.001 0 0 0-1.001-1.001zM23.013 0H11.455a5.215 5.215 0 0 0 5.215 5.215h2.129v2.057A5.215 5.215 0 0 0 24.013 12.487V1.005A1.005 1.005 0 0 0 23.013 0z"/></svg>
                <span className="text-sm font-medium">Jira</span>
              </div>
              {integrationConfig.jira?.projectKey
                ? <Badge variant="default" className="text-xs">Aktif</Badge>
                : <Badge variant="secondary" className="text-xs">Pasif</Badge>}
            </div>
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
          </div>

          {/* GitHub */}
          <div className={`rounded-lg border p-4 space-y-3 ${integrationConfig.jira?.projectKey && !integrationConfig.github?.repo ? "opacity-40" : ""}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
                <span className="text-sm font-medium">GitHub Issues</span>
              </div>
              {integrationConfig.github?.repo
                ? <Badge variant="default" className="text-xs">Aktif</Badge>
                : <Badge variant="secondary" className="text-xs">Pasif</Badge>}
            </div>
            <div>
              <label htmlFor="github-repo" className="text-xs text-muted-foreground mb-1 block">Repository</label>
              <input id="github-repo" type="text" placeholder="owner/repo"
                value={integrationConfig.github?.repo || ""}
                onChange={(e) => setIntegrationConfig({ ...integrationConfig, github: { repo: e.target.value }, jira: undefined })}
                className="w-full px-3 py-1.5 border rounded-md bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </div>
          </div>
          </div>
          <div className="flex justify-end border-t pt-3 mt-1">
            <Button size="sm" variant="outline" onClick={handleSaveIntegrationConfig} disabled={actionLoading === "save-config"}>
              {actionLoading === "save-config" ? "Kaydediliyor..." : <><Save className="w-3.5 h-3.5 mr-1.5" />Kaydet</>}
            </Button>
          </div>
        </CardContent>}
      </Card>

      {/* Servis Mimarisi */}
      <Card>
        <CardHeader className="pb-3 cursor-pointer select-none" onClick={() => setArchOpen(v => !v)}>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="w-4 h-4 text-muted-foreground" />
              Servis Mimarisi
            </CardTitle>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${archOpen ? "rotate-180" : ""}`} />
          </div>
        </CardHeader>
        {archOpen && (
          <CardContent className="space-y-3">
            {/* Çoklu servis toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Çoklu servis projesi</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {multiService
                    ? "Her servis ayrı taranır, AI analizlerinde ilgili servisler seçilir."
                    : "Tek repo — Bağlam sekmesindeki Kaynak Tarama yeterli."}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={multiService}
                onClick={() => {
                  if (!multiService && project.hasContext) {
                    if (!window.confirm("Çoklu servis moduna geçmek mevcut taramayı silmez. Yeni servisler eklenirse AI analizleri federe moda geçer. Devam edilsin mi?")) return;
                  }
                  setMultiService(v => !v);
                }}
                className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${multiService ? "bg-primary" : "bg-muted"}`}
              >
                <span className={`pointer-events-none block h-4 w-4 rounded-full bg-background shadow-sm transition-transform ${multiService ? "translate-x-4" : "translate-x-0.5"} mt-[1px]`} />
              </button>
            </div>

            {/* Servis listesi */}
            {multiService && (
              <div className="space-y-3">
                {/* Servis ekleme */}
                <div className="space-y-2">
                  <div className="grid md:grid-cols-3 gap-2">
                    <input type="text" placeholder="Servis adı (billing-api)"
                      value={newServiceForm.name}
                      onChange={(e) => setNewServiceForm({ ...newServiceForm, name: e.target.value })}
                      className="px-3 py-1.5 border rounded-md bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                    <select value={newServiceForm.serviceType}
                      onChange={(e) => setNewServiceForm({ ...newServiceForm, serviceType: e.target.value as typeof newServiceForm.serviceType })}
                      className="px-3 py-1.5 border rounded-md bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      {["BACKEND", "FRONTEND", "LIBRARY", "OTHER"].map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    <input type="text" placeholder="Klasör yolu veya Git URL"
                      value={newServiceForm.localPath || newServiceForm.repoUrl}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val.startsWith("http") || val.startsWith("git@")) {
                          setNewServiceForm({ ...newServiceForm, repoUrl: val, localPath: "" });
                        } else {
                          setNewServiceForm({ ...newServiceForm, localPath: val, repoUrl: "" });
                        }
                      }}
                      className="px-3 py-1.5 border rounded-md bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                  </div>
                  <div className="flex justify-end">
                    <Button size="sm" variant="outline" onClick={handleCreateService}
                      disabled={actionLoading === "create-service" || !newServiceForm.name.trim()}>
                      {actionLoading === "create-service" ? "Ekleniyor..." : <><Plus className="w-3.5 h-3.5 mr-1" />Servis Ekle</>}
                    </Button>
                  </div>
                </div>

                {/* Servis listesi */}
                {projectServices.length > 0 && (
                  <div className="space-y-2">
                    {projectServices.map((service) => (
                      <div key={service.id} className="rounded-lg border px-3 py-2 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{service.name}</span>
                            <Badge variant="outline" className="text-xs">{service.serviceType}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {service.lastScannedAt ? `Son tarama: ${timeAgo(service.lastScannedAt)}` : "Henüz taranmadı"}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Button size="sm" variant="outline" onClick={() => handleScanService(service.id)}
                            disabled={actionLoading === `scan-service-${service.id}`}>
                            {actionLoading === `scan-service-${service.id}` ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : "Tara"}
                          </Button>
                          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive"
                            onClick={() => handleDeleteService(service.id)}
                            disabled={actionLoading === `delete-service-${service.id}`}>
                            Sil
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Bağımlılıklar */}
                {projectServices.length >= 2 && (
                  <div className="rounded-lg border p-3 space-y-2">
                    <p className="text-sm font-medium">Servis Bağımlılıkları</p>
                    <div className="grid md:grid-cols-4 gap-2">
                      <select value={dependencyForm.fromServiceId}
                        onChange={(e) => setDependencyForm({ ...dependencyForm, fromServiceId: e.target.value ? Number(e.target.value) : "" })}
                        className="px-3 py-1.5 border rounded-md bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        <option value="">Kaynak</option>
                        {projectServices.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                      <select value={dependencyForm.toServiceId}
                        onChange={(e) => setDependencyForm({ ...dependencyForm, toServiceId: e.target.value ? Number(e.target.value) : "" })}
                        className="px-3 py-1.5 border rounded-md bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        <option value="">Hedef</option>
                        {projectServices.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                      <input type="text" placeholder="Tip (SYNC/ASYNC)" value={dependencyForm.dependencyType}
                        onChange={(e) => setDependencyForm({ ...dependencyForm, dependencyType: e.target.value || "SYNC" })}
                        className="px-3 py-1.5 border rounded-md bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                      <Button size="sm" variant="outline" onClick={handleAddDependency}
                        disabled={actionLoading === "add-service-dependency"}>
                        {actionLoading === "add-service-dependency" ? "..." : "Ekle"}
                      </Button>
                    </div>
                    {(serviceGraph?.dependencies?.length ?? 0) > 0 && (
                      <div className="space-y-1">
                        {serviceGraph!.dependencies.map((d) => (
                          <div key={d.id} className="text-xs flex items-center justify-between rounded border px-2 py-1">
                            <span>{d.fromServiceName} → {d.toServiceName} <span className="text-muted-foreground">({d.dependencyType})</span></span>
                            <button onClick={() => handleDeleteDependency(d.id)}
                              className="text-destructive hover:underline focus-visible:outline-none rounded"
                              disabled={actionLoading === `delete-dependency-${d.id}`}>
                              Sil
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        )}
      </Card>

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
