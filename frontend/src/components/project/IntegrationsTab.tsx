import { useState } from "react";
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
  const [multiService, setMultiService] = useState(projectServices.length > 0);
  const [addServiceOpen, setAddServiceOpen] = useState(false);

  /* Which platform is "selected"? */
  const jiraActive = !!integrationConfig.jira?.projectKey;
  const githubActive = !!integrationConfig.github?.repo;

  /* Input classes reused across the page */
  const inputCls =
    "w-full px-3 py-2.5 rounded-[10px] border border-border bg-card text-[0.85rem] text-foreground outline-none transition-colors focus:border-primary focus:ring-[3px] focus:ring-primary/8 font-[inherit]";

  return (
    <div className="space-y-0">
      {/* ── PROJE BİLGİLERİ ── */}
      {isAdmin && (
        <>
          <div className="text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground mb-3 pb-2 border-b border-border/40">
            Proje Bilgileri
          </div>

          <div className="mb-4">
            <label htmlFor="project-name" className="text-[0.72rem] font-medium text-muted-foreground mb-1.5 block">
              Proje Adı
            </label>
            <input
              id="project-name"
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className={inputCls}
            />
          </div>

          <div className="mb-4">
            <label htmlFor="project-description" className="text-[0.72rem] font-medium text-muted-foreground mb-1.5 block">
              Proje Açıklaması
            </label>
            <textarea
              id="project-description"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={3}
              className={`${inputCls} resize-none min-h-[80px]`}
            />
          </div>

          <div className="flex justify-end mb-1">
            <button
              disabled={actionLoading === "update-project" || !editName.trim()}
              onClick={() => handleUpdateProject(editName.trim(), editDescription.trim())}
              className="px-5 py-2 rounded-[9px] border-none bg-gradient-to-br from-primary to-cyan-600 text-white text-[0.78rem] font-semibold cursor-pointer shadow-[0_1px_3px_rgba(0,188,212,0.3)] inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {actionLoading === "update-project" ? (
                "Kaydediliyor..."
              ) : (
                <>
                  <span className="material-icons-outlined text-[15px]">save</span>
                  Kaydet
                </>
              )}
            </button>
          </div>
        </>
      )}

      {/* ── DIŞ PLATFORM BAĞLANTISI ── */}
      <div className={`text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground mb-3 pb-2 border-b border-border/40 ${isAdmin ? "mt-10" : ""}`}>
        Dış Platform Bağlantısı
      </div>

      <p className="text-[0.72rem] text-muted-foreground text-center mb-4">
        Bir projede tek platform aktif olabilir
      </p>

      {/* Platform Cards — 2 column grid */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        {/* ── Jira Card ── */}
        <div
          className={`rounded-[14px] p-6 border-2 cursor-pointer transition-all relative ${
            jiraActive
              ? "border-primary bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-950/30 dark:to-cyan-950/30 shadow-[0_0_0_3px_rgba(0,188,212,0.08)]"
              : githubActive
                ? "border-border bg-card opacity-35 pointer-events-none"
                : "border-border bg-card hover:border-muted-foreground/30"
          }`}
          onClick={() => {
            if (!jiraActive && !githubActive) {
              setIntegrationConfig({ ...integrationConfig, jira: { ...integrationConfig.jira, projectKey: "" }, github: undefined });
            }
          }}
        >
          {jiraActive && (
            <div className="absolute top-3 right-3 w-[22px] h-[22px] rounded-full bg-primary text-white flex items-center justify-center">
              <span className="material-icons-outlined text-[14px]">check</span>
            </div>
          )}
          <div className="flex items-center gap-2.5 mb-0">
            <div className="w-10 h-10 rounded-[10px] bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#0052CC">
                <path d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.005-1.005zm5.723-5.756H5.736a5.215 5.215 0 0 0 5.215 5.214h2.129v2.058a5.218 5.218 0 0 0 5.215 5.214V6.758a1.001 1.001 0 0 0-1.001-1.001zM23.013 0H11.455a5.215 5.215 0 0 0 5.215 5.215h2.129v2.057A5.215 5.215 0 0 0 24.013 12.487V1.005A1.005 1.005 0 0 0 23.013 0z" />
              </svg>
            </div>
            <span className="text-[1rem] font-semibold text-foreground">Jira</span>
            <span
              className={`ml-auto px-2.5 py-0.5 rounded-full text-[0.68rem] font-semibold ${
                jiraActive ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-secondary text-muted-foreground"
              }`}
            >
              {jiraActive ? "Aktif" : "Pasif"}
            </span>
          </div>
        </div>

        {/* ── GitHub Card ── */}
        <div
          className={`rounded-[14px] p-6 border-2 cursor-pointer transition-all relative ${
            githubActive
              ? "border-primary bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-950/30 dark:to-cyan-950/30 shadow-[0_0_0_3px_rgba(0,188,212,0.08)]"
              : jiraActive
                ? "border-border bg-card opacity-35 pointer-events-none"
                : "border-border bg-card hover:border-muted-foreground/30"
          }`}
          onClick={() => {
            if (!githubActive && !jiraActive) {
              setIntegrationConfig({ ...integrationConfig, github: { repo: "" }, jira: undefined });
            }
          }}
        >
          {githubActive && (
            <div className="absolute top-3 right-3 w-[22px] h-[22px] rounded-full bg-primary text-white flex items-center justify-center">
              <span className="material-icons-outlined text-[14px]">check</span>
            </div>
          )}
          <div className="flex items-center gap-2.5 mb-0">
            <div className="w-10 h-10 rounded-[10px] bg-secondary flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
              </svg>
            </div>
            <span className="text-[1rem] font-semibold text-foreground">GitHub Issues</span>
            <span
              className={`ml-auto px-2.5 py-0.5 rounded-full text-[0.68rem] font-semibold ${
                githubActive ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-secondary text-muted-foreground"
              }`}
            >
              {githubActive ? "Aktif" : "Pasif"}
            </span>
          </div>
        </div>
      </div>

      {/* ── Platform Config (Jira) ── */}
      {(jiraActive || (!jiraActive && !githubActive)) && (
        <div className="bg-secondary/60 rounded-xl p-5 mb-5">
          <div className="text-[0.75rem] font-semibold text-muted-foreground mb-3.5 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="#0052CC">
              <path d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.005-1.005zm5.723-5.756H5.736a5.215 5.215 0 0 0 5.215 5.214h2.129v2.058a5.218 5.218 0 0 0 5.215 5.214V6.758a1.001 1.001 0 0 0-1.001-1.001zM23.013 0H11.455a5.215 5.215 0 0 0 5.215 5.215h2.129v2.057A5.215 5.215 0 0 0 24.013 12.487V1.005A1.005 1.005 0 0 0 23.013 0z" />
            </svg>
            Jira Yapılandırması
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="jira-project-key" className="text-[0.72rem] font-medium text-muted-foreground mb-1.5 block">Proje Key</label>
              <input
                id="jira-project-key"
                type="text"
                placeholder="SS"
                value={integrationConfig.jira?.projectKey || ""}
                onChange={(e) =>
                  setIntegrationConfig({
                    ...integrationConfig,
                    jira: { ...integrationConfig.jira, projectKey: e.target.value.toUpperCase() },
                    github: undefined,
                  })
                }
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor="jira-issue-type" className="text-[0.72rem] font-medium text-muted-foreground mb-1.5 block">Issue Type</label>
              <input
                id="jira-issue-type"
                type="text"
                placeholder="Task"
                value={integrationConfig.jira?.defaultIssueType || ""}
                onChange={(e) =>
                  setIntegrationConfig({
                    ...integrationConfig,
                    jira: { ...integrationConfig.jira, defaultIssueType: e.target.value },
                  })
                }
                className={inputCls}
              />
            </div>
          </div>
          <div className="mb-4">
            <label htmlFor="jira-category-mode" className="text-[0.72rem] font-medium text-muted-foreground mb-1.5 block">Kategori Modu</label>
            <select
              id="jira-category-mode"
              value={integrationConfig.jira?.categoryMode || "BOTH"}
              onChange={(e) =>
                setIntegrationConfig({
                  ...integrationConfig,
                  jira: {
                    ...integrationConfig.jira,
                    categoryMode: e.target.value as "LABELS_ONLY" | "COMPONENTS" | "BOTH",
                  },
                })
              }
              className={inputCls}
            >
              <option value="BOTH">Label + Component</option>
              <option value="LABELS_ONLY">Sadece Label</option>
              <option value="COMPONENTS">Sadece Component</option>
            </select>
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleSaveIntegrationConfig}
              disabled={actionLoading === "save-config"}
              className="px-5 py-2 rounded-[9px] border-none bg-gradient-to-br from-primary to-cyan-600 text-white text-[0.78rem] font-semibold cursor-pointer shadow-[0_1px_3px_rgba(0,188,212,0.3)] inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {actionLoading === "save-config" ? (
                "Kaydediliyor..."
              ) : (
                <>
                  <span className="material-icons-outlined text-[15px]">save</span>
                  Kaydet
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── Platform Config (GitHub) ── */}
      {githubActive && (
        <div className="bg-secondary/60 rounded-xl p-5 mb-5">
          <div className="text-[0.75rem] font-semibold text-muted-foreground mb-3.5 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
            GitHub Yapılandırması
          </div>
          <div className="mb-4">
            <label htmlFor="github-repo" className="text-[0.72rem] font-medium text-muted-foreground mb-1.5 block">Repository</label>
            <input
              id="github-repo"
              type="text"
              placeholder="owner/repo"
              value={integrationConfig.github?.repo || ""}
              onChange={(e) =>
                setIntegrationConfig({
                  ...integrationConfig,
                  github: { repo: e.target.value },
                  jira: undefined,
                })
              }
              className={inputCls}
            />
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleSaveIntegrationConfig}
              disabled={actionLoading === "save-config"}
              className="px-5 py-2 rounded-[9px] border-none bg-gradient-to-br from-primary to-cyan-600 text-white text-[0.78rem] font-semibold cursor-pointer shadow-[0_1px_3px_rgba(0,188,212,0.3)] inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {actionLoading === "save-config" ? (
                "Kaydediliyor..."
              ) : (
                <>
                  <span className="material-icons-outlined text-[15px]">save</span>
                  Kaydet
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── SERVİS MİMARİSİ ── */}
      <div className="text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground mb-3 pb-2 border-b border-border/40 mt-10">
        Servis Mimarisi
      </div>

      {/* Toggle row */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[0.88rem] font-medium text-foreground">Çoklu servis projesi</p>
          <p className="text-[0.72rem] text-muted-foreground mt-0.5">
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
              if (
                !window.confirm(
                  "Çoklu servis moduna geçmek mevcut taramayı silmez. Yeni servisler eklenirse AI analizleri federe moda geçer. Devam edilsin mi?"
                )
              )
                return;
            }
            setMultiService((v) => !v);
          }}
          className={`relative inline-flex shrink-0 cursor-pointer rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            multiService ? "bg-primary" : "bg-muted"
          }`}
          style={{ width: 38, height: 22 }}
        >
          <span
            className="pointer-events-none block rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.12)] transition-transform"
            style={{
              width: 18,
              height: 18,
              marginTop: 2,
              transform: multiService ? "translateX(18px)" : "translateX(2px)",
            }}
          />
        </button>
      </div>

      {/* Service table */}
      {multiService && (
        <>
          {projectServices.length > 0 && (
            <div className="bg-card rounded-[14px] border border-border/40 overflow-hidden mb-3">
              {/* Header */}
              <div
                className="grid items-center px-5 py-2.5 text-[0.65rem] font-semibold uppercase tracking-[0.06em] text-muted-foreground border-b border-border/40 bg-secondary/50"
                style={{ gridTemplateColumns: "1fr 100px 1.2fr 120px" }}
              >
                <div>Ad</div>
                <div>Tip</div>
                <div>Yol</div>
                <div className="text-right">Islemler</div>
              </div>

              {/* Rows */}
              {projectServices.map((service) => {
                const typeBg =
                  service.serviceType === "BACKEND"
                    ? "bg-blue-50 text-blue-500 dark:bg-blue-900/30 dark:text-blue-400"
                    : service.serviceType === "FRONTEND"
                      ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                      : "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400";

                return (
                  <div
                    key={service.id}
                    className="grid items-center px-5 py-3 text-[0.82rem] border-b border-border/20 last:border-b-0 hover:bg-secondary/30 transition-colors"
                    style={{ gridTemplateColumns: "1fr 100px 1.2fr 120px" }}
                  >
                    <div className="font-medium text-foreground">{service.name}</div>
                    <div>
                      <span className={`inline-flex px-2 py-0.5 rounded-md text-[0.68rem] font-semibold ${typeBg}`}>
                        {service.serviceType}
                      </span>
                    </div>
                    <div className="text-[0.75rem] text-muted-foreground font-mono truncate">
                      {service.localPath || service.repoUrl || "—"}
                      {service.lastScannedAt && (
                        <span className="ml-2 text-[0.65rem] opacity-60">({timeAgo(service.lastScannedAt)})</span>
                      )}
                    </div>
                    <div className="flex gap-1 justify-end">
                      <button
                        onClick={() => handleScanService(service.id)}
                        disabled={actionLoading === `scan-service-${service.id}`}
                        className="border-none bg-transparent text-[0.72rem] text-muted-foreground cursor-pointer px-2 py-1 rounded-md hover:bg-secondary hover:text-foreground transition-colors disabled:opacity-50"
                      >
                        {actionLoading === `scan-service-${service.id}` ? (
                          <span className="material-icons-outlined text-[14px] animate-spin">refresh</span>
                        ) : (
                          "Tara"
                        )}
                      </button>
                      <button
                        onClick={() => handleDeleteService(service.id)}
                        disabled={actionLoading === `delete-service-${service.id}`}
                        className="border-none bg-transparent text-[0.72rem] text-muted-foreground cursor-pointer px-2 py-1 rounded-md hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                      >
                        Sil
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Add service row */}
              <div
                className="flex items-center gap-3 px-5 py-3 border-t border-dashed border-border cursor-pointer text-muted-foreground text-[0.78rem] font-medium hover:bg-secondary/30 hover:text-foreground transition-colors"
                onClick={() => setAddServiceOpen((v) => !v)}
              >
                <span className="material-icons-outlined text-[16px]">add</span>
                Yeni Servis Ekle
              </div>
            </div>
          )}

          {/* Add service form — shown when no services exist OR when add row clicked */}
          {(projectServices.length === 0 || addServiceOpen) && (
            <div className="bg-secondary/40 rounded-xl p-4 mb-3 space-y-3">
              <div className="grid md:grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder="Servis adı (billing-api)"
                  value={newServiceForm.name}
                  onChange={(e) => setNewServiceForm({ ...newServiceForm, name: e.target.value })}
                  className={inputCls}
                />
                <select
                  value={newServiceForm.serviceType}
                  onChange={(e) =>
                    setNewServiceForm({ ...newServiceForm, serviceType: e.target.value as typeof newServiceForm.serviceType })
                  }
                  className={inputCls}
                >
                  {["BACKEND", "FRONTEND", "LIBRARY", "OTHER"].map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Klasor yolu veya Git URL"
                  value={newServiceForm.localPath || newServiceForm.repoUrl}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val.startsWith("http") || val.startsWith("git@")) {
                      setNewServiceForm({ ...newServiceForm, repoUrl: val, localPath: "" });
                    } else {
                      setNewServiceForm({ ...newServiceForm, localPath: val, repoUrl: "" });
                    }
                  }}
                  className={inputCls}
                />
              </div>
              <div className="flex justify-end">
                <button
                  onClick={handleCreateService}
                  disabled={actionLoading === "create-service" || !newServiceForm.name.trim()}
                  className="px-4 py-2 rounded-[9px] border-none bg-gradient-to-br from-primary to-cyan-600 text-white text-[0.78rem] font-semibold cursor-pointer shadow-[0_1px_3px_rgba(0,188,212,0.3)] inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading === "create-service" ? (
                    "Ekleniyor..."
                  ) : (
                    <>
                      <span className="material-icons-outlined text-[15px]">add</span>
                      Servis Ekle
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* No services yet — show the add form directly */}
          {projectServices.length === 0 && !addServiceOpen && (
            <div
              className="flex items-center gap-3 px-5 py-4 rounded-[14px] border border-dashed border-border cursor-pointer text-muted-foreground text-[0.78rem] font-medium hover:bg-secondary/30 hover:text-foreground transition-colors mb-3"
              onClick={() => setAddServiceOpen(true)}
            >
              <span className="material-icons-outlined text-[16px]">add</span>
              Yeni Servis Ekle
            </div>
          )}

          {/* Dependencies */}
          {projectServices.length >= 2 && (
            <div className="bg-secondary/40 rounded-xl p-4 space-y-3">
              <p className="text-[0.82rem] font-medium text-foreground">Servis Bagimliliklar</p>
              <div className="grid md:grid-cols-4 gap-3">
                <select
                  value={dependencyForm.fromServiceId}
                  onChange={(e) =>
                    setDependencyForm({ ...dependencyForm, fromServiceId: e.target.value ? Number(e.target.value) : "" })
                  }
                  className={inputCls}
                >
                  <option value="">Kaynak</option>
                  {projectServices.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <select
                  value={dependencyForm.toServiceId}
                  onChange={(e) =>
                    setDependencyForm({ ...dependencyForm, toServiceId: e.target.value ? Number(e.target.value) : "" })
                  }
                  className={inputCls}
                >
                  <option value="">Hedef</option>
                  {projectServices.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Tip (SYNC/ASYNC)"
                  value={dependencyForm.dependencyType}
                  onChange={(e) => setDependencyForm({ ...dependencyForm, dependencyType: e.target.value || "SYNC" })}
                  className={inputCls}
                />
                <button
                  onClick={handleAddDependency}
                  disabled={actionLoading === "add-service-dependency"}
                  className="px-4 py-2 rounded-[8px] border border-border bg-card text-[0.75rem] font-medium text-foreground cursor-pointer inline-flex items-center justify-center gap-1 hover:bg-secondary transition-colors disabled:opacity-50"
                >
                  {actionLoading === "add-service-dependency" ? "..." : "Ekle"}
                </button>
              </div>

              {(serviceGraph?.dependencies?.length ?? 0) > 0 && (
                <div className="space-y-1.5">
                  {serviceGraph!.dependencies.map((d) => (
                    <div
                      key={d.id}
                      className="text-[0.78rem] flex items-center justify-between rounded-lg border border-border/40 px-3 py-2 bg-card"
                    >
                      <span>
                        {d.fromServiceName} → {d.toServiceName}{" "}
                        <span className="text-muted-foreground">({d.dependencyType})</span>
                      </span>
                      <button
                        onClick={() => handleDeleteDependency(d.id)}
                        className="text-red-500 hover:underline focus-visible:outline-none rounded text-[0.72rem]"
                        disabled={actionLoading === `delete-dependency-${d.id}`}
                      >
                        Sil
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── TEHLİKE BÖLGESİ — Projeyi Sil ── */}
      {isAdmin && (
        <div className="mt-12 px-6 py-5 border border-red-300 dark:border-red-800 rounded-[14px] bg-card flex items-center justify-between gap-4">
          <div>
            <p className="text-[0.88rem] font-semibold text-red-600 dark:text-red-400 flex items-center gap-1.5">
              <span className="material-icons-outlined text-[18px]">warning</span>
              Projeyi Kalici Olarak Sil
            </p>
            <p className="text-[0.72rem] text-muted-foreground mt-0.5">
              Bu islem geri alinamaz. <code className="font-mono text-foreground">{project.name}</code> projesi ve tum verileri silinir.
            </p>
          </div>
          <button
            onClick={onDeleteProject}
            className="shrink-0 px-4 py-2 rounded-[8px] border-none bg-red-500 text-white text-[0.75rem] font-semibold cursor-pointer inline-flex items-center gap-1.5 hover:bg-red-600 transition-colors"
          >
            <span className="material-icons-outlined text-[14px]">delete</span>
            Projeyi Sil
          </button>
        </div>
      )}
    </div>
  );
}
