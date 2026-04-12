import { useState } from "react";
import { Code, RefreshCw, Plus, ChevronDown, Layers } from "lucide-react";
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

export default function ContextTab(props: ContextTabProps) {
  const {
    project,
    scanPath,
    setScanPath,
    scanMode,
    setScanMode,
    gitUrl,
    setGitUrl,
    gitToken,
    setGitToken,
    handleScan,
    contextFreshness,
    partialRefreshStatus,
    partialRefreshHistory,
    partialRefreshHasMore,
    partialRefreshLoadingMore,
    traceability,
    onPartialRefresh,
    onLoadMorePartialRefreshHistory,
    documents,
    setDocDialog,
    handleDeleteDocument,
    actionLoading,
    // Workspace Services
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
  } = props;
  const [reportOpen, setReportOpen] = useState(true);
  const [scanOpen, setScanOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  // Multi-service toggle: auto-open if services already exist
  const [multiService, setMultiService] = useState(projectServices.length > 0);

  function formatDuration(startedAt?: string, completedAt?: string) {
    if (!startedAt) return "—";
    if (!completedAt) return "devam ediyor";
    const startMs = new Date(startedAt).getTime();
    const endMs = new Date(completedAt).getTime();
    if (Number.isNaN(startMs) || Number.isNaN(endMs)) return "—";
    const sec = Math.max(0, Math.round((endMs - startMs) / 1000));
    if (sec < 60) return `${sec}s`;
    const min = Math.floor(sec / 60);
    const rem = sec % 60;
    return `${min}m ${rem}s`;
  }

  const selectedJob = partialRefreshHistory.find((j) => j.jobId === selectedJobId) ?? null;
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
          {contextFreshness && (
            <div className="rounded-md border bg-muted/25 p-3 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">Context Freshness</p>
                  <p className="text-xs text-muted-foreground">
                    {contextFreshness.reason}
                  </p>
                </div>
                <Badge variant="outline">
                  Skor {contextFreshness.analysisFreshnessScore} / Güven {contextFreshness.contextConfidence}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>{contextFreshness.commitsBehind ?? 0} commit</span>
                <span>·</span>
                <span>{contextFreshness.changedFiles} dosya değişti</span>
                {contextFreshness.impactedModules.length > 0 && (
                  <>
                    <span>·</span>
                    <span>{contextFreshness.impactedModules.slice(0, 4).join(", ")}</span>
                  </>
                )}
              </div>
              {partialRefreshStatus?.status === "RUNNING" && (
                <div className="text-xs text-muted-foreground">
                  Kısmi yenileme sürüyor: {partialRefreshStatus.processedAnalyses ?? 0}/{partialRefreshStatus.totalAnalyses ?? 0}
                </div>
              )}
              {contextFreshness.recommendation === "PARTIAL_REFRESH" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onPartialRefresh}
                  disabled={actionLoading === "partial-refresh" || partialRefreshStatus?.status === "RUNNING"}
                >
                  {(actionLoading === "partial-refresh" || partialRefreshStatus?.status === "RUNNING")
                    ? "Kısmi yenileme..."
                    : "Etkilenenleri Yeniden Analiz Et"}
                </Button>
              )}
              {partialRefreshHistory.length > 0 && (
                <div className="pt-1">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Son Kısmi Yenileme Denemeleri</p>
                  <div className="space-y-1.5">
                    {partialRefreshHistory.map((job) => (
                      <button
                        key={job.jobId ?? `${job.startedAt}-${job.status}`}
                        type="button"
                        onClick={() => setSelectedJobId((prev) => (prev === (job.jobId ?? null) ? null : (job.jobId ?? null)))}
                        className="w-full flex items-center justify-between rounded border bg-background/70 px-2 py-1.5 text-xs hover:bg-muted/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={
                            job.status === "DONE"
                              ? "text-green-700 border-green-300"
                              : job.status === "FAILED"
                                ? "text-red-700 border-red-300"
                                : "text-blue-700 border-blue-300"
                          }>
                            {job.status}
                          </Badge>
                          <span className="text-muted-foreground">
                            {job.refreshedCount ?? 0} talep
                          </span>
                        </div>
                        <span className="text-muted-foreground">
                          {job.startedAt ? timeAgo(job.startedAt) : "—"}
                        </span>
                      </button>
                    ))}
                  </div>
                  {partialRefreshHasMore && (
                    <button
                      type="button"
                      onClick={onLoadMorePartialRefreshHistory}
                      disabled={partialRefreshLoadingMore}
                      className="mt-2 text-xs text-primary hover:underline disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                    >
                      {partialRefreshLoadingMore ? "Yükleniyor..." : "Daha Fazla Göster"}
                    </button>
                  )}
                  {selectedJob && (
                    <div className="mt-2 rounded border bg-background/70 p-2 text-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Job #{selectedJob.jobId}</span>
                        <span className="text-muted-foreground">Süre: {formatDuration(selectedJob.startedAt, selectedJob.completedAt)}</span>
                      </div>
                      <div className="text-muted-foreground">
                        Recommendation: {selectedJob.recommendation ?? "—"} · İlerleme: {selectedJob.processedAnalyses ?? 0}/{selectedJob.totalAnalyses ?? 0}
                      </div>
                      {(selectedJob.refreshedRequirementIds?.length ?? 0) > 0 && (
                        <div className="text-muted-foreground">
                          Yenilenen Talep ID: {selectedJob.refreshedRequirementIds?.join(", ")}
                        </div>
                      )}
                      {selectedJob.error && (
                        <div className="text-destructive">
                          Hata: {selectedJob.error}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

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

      {/* Workspace Services — multi-service toggle */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="w-4 h-4 text-muted-foreground" />
              Proje Yapısı
            </CardTitle>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <span className="text-xs text-muted-foreground">Çoklu servis projesi</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={multiService}
                  onClick={() => setMultiService(v => !v)}
                  className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    multiService ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <span className={`pointer-events-none block h-4 w-4 rounded-full bg-background shadow-sm ring-0 transition-transform ${
                    multiService ? "translate-x-4" : "translate-x-0.5"
                  } mt-[1px]`} />
                </button>
              </label>
            </div>
          </div>
          {!multiService && (
            <p className="text-xs text-muted-foreground mt-1">
              Tek repo projesi — yukarıdaki kaynak kod taraması yeterli. Çoklu repo/mikroservis yapısı varsa açın.
            </p>
          )}
        </CardHeader>

        {multiService && (
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Her servisi ayrı ayrı ekleyip tarayın. AI analizlerine ilgili servislerin context'i otomatik dahil edilir.
            </p>

            {/* Service ekleme formu */}
            <div className="grid md:grid-cols-5 gap-2">
              <input
                type="text"
                placeholder="Servis adı (billing-api)"
                value={newServiceForm.name}
                onChange={(e) => setNewServiceForm({ ...newServiceForm, name: e.target.value })}
                className="md:col-span-2 px-3 py-1.5 border rounded-md bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <select
                value={newServiceForm.serviceType}
                onChange={(e) => setNewServiceForm({ ...newServiceForm, serviceType: e.target.value as typeof newServiceForm.serviceType })}
                className="px-3 py-1.5 border rounded-md bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {["BACKEND", "FRONTEND", "MOBILE", "GATEWAY", "DATA", "PLATFORM", "SHARED", "OTHER"].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Yerel klasör yolu"
                value={newServiceForm.localPath}
                onChange={(e) => setNewServiceForm({ ...newServiceForm, localPath: e.target.value })}
                className="px-3 py-1.5 border rounded-md bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <Button size="sm" variant="outline" onClick={handleCreateService} disabled={actionLoading === "create-service" || !newServiceForm.name.trim()}>
                {actionLoading === "create-service" ? "Ekleniyor..." : <><Plus className="w-3.5 h-3.5 mr-1" />Ekle</>}
              </Button>
            </div>

            {/* Service listesi */}
            {projectServices.length === 0 ? (
              <p className="text-sm text-muted-foreground">Henüz servis eklenmedi.</p>
            ) : (
              <div className="space-y-2">
                {projectServices.map((service) => (
                  <div key={service.id} className="rounded-lg border px-3 py-2 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{service.name}</span>
                        <Badge variant="outline" className="text-xs">{service.serviceType}</Badge>
                        {service.lastScannedAt && <span className="text-xs text-muted-foreground">v{service.contextVersion}</span>}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {service.localPath || service.repoUrl || "Klasör yolu tanımlanmadı"}
                        {" · "}
                        {service.lastScannedAt ? `Son tarama: ${timeAgo(service.lastScannedAt)}` : "Henüz taranmadı"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleScanService(service.id)}
                        disabled={actionLoading === `scan-service-${service.id}`}
                      >
                        {actionLoading === `scan-service-${service.id}` ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : "Tara"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDeleteService(service.id)}
                        disabled={actionLoading === `delete-service-${service.id}`}
                      >
                        Sil
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Dependency graph */}
            {projectServices.length >= 2 && (
              <div className="rounded-lg border p-3 space-y-2">
                <p className="text-sm font-medium">Servis Bağımlılıkları</p>
                <div className="grid md:grid-cols-4 gap-2">
                  <select
                    value={dependencyForm.fromServiceId}
                    onChange={(e) => setDependencyForm({ ...dependencyForm, fromServiceId: e.target.value ? Number(e.target.value) : "" })}
                    className="px-3 py-1.5 border rounded-md bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Kaynak servis</option>
                    {projectServices.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <select
                    value={dependencyForm.toServiceId}
                    onChange={(e) => setDependencyForm({ ...dependencyForm, toServiceId: e.target.value ? Number(e.target.value) : "" })}
                    className="px-3 py-1.5 border rounded-md bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Hedef servis</option>
                    {projectServices.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <input
                    type="text"
                    placeholder="Bağımlılık tipi"
                    value={dependencyForm.dependencyType}
                    onChange={(e) => setDependencyForm({ ...dependencyForm, dependencyType: e.target.value || "SYNC" })}
                    className="px-3 py-1.5 border rounded-md bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <Button size="sm" variant="outline" onClick={handleAddDependency} disabled={actionLoading === "add-service-dependency"}>
                    {actionLoading === "add-service-dependency" ? "Ekleniyor..." : "Ekle"}
                  </Button>
                </div>
                {(serviceGraph?.dependencies?.length ?? 0) > 0 && (
                  <div className="space-y-1">
                    {serviceGraph!.dependencies.map((d) => (
                      <div key={d.id} className="text-xs flex items-center justify-between rounded border px-2 py-1">
                        <span>{d.fromServiceName} → {d.toServiceName} <span className="text-muted-foreground">({d.dependencyType})</span></span>
                        <button
                          onClick={() => handleDeleteDependency(d.id)}
                          className="text-destructive hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
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

            {/* Readiness summary */}
            {projectServices.length > 0 && (() => {
              const scanned = projectServices.filter(s => !!s.lastScannedAt).length;
              return (
                <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
                  <span>{scanned}/{projectServices.length} servis tarandı</span>
                  <span>·</span>
                  <span>{serviceGraph?.dependencies?.length ?? 0} bağımlılık</span>
                </div>
              );
            })()}
          </CardContent>
        )}
      </Card>

      {traceability && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Traceability</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2 grid-cols-2 md:grid-cols-4">
              <div className="rounded border bg-muted/20 px-3 py-2">
                <p className="text-[11px] text-muted-foreground">Talep</p>
                <p className="text-sm font-semibold">{traceability.summary.totalRequirements}</p>
              </div>
              <div className="rounded border bg-muted/20 px-3 py-2">
                <p className="text-[11px] text-muted-foreground">Analizli</p>
                <p className="text-sm font-semibold">{traceability.summary.analyzedRequirements}</p>
              </div>
              <div className="rounded border bg-muted/20 px-3 py-2">
                <p className="text-[11px] text-muted-foreground">SP Onaylı</p>
                <p className="text-sm font-semibold">{traceability.summary.approvedTasks}</p>
              </div>
              <div className="rounded border bg-muted/20 px-3 py-2">
                <p className="text-[11px] text-muted-foreground">Sync Coverage</p>
                <p className="text-sm font-semibold">%{Math.round(traceability.summary.syncCoveragePercent)}</p>
              </div>
            </div>

            {traceability.items.length === 0 ? (
              <p className="text-sm text-muted-foreground">Henüz traceability verisi yok.</p>
            ) : (
              <div className="space-y-1.5">
                {traceability.items.slice(0, 6).map((item) => (
                  <div key={item.requirementId} className="rounded border bg-background/70 px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium truncate">
                        {item.requirementSeq != null ? `#${item.requirementSeq} ` : ""}{item.requirementPreview}
                      </p>
                      <Badge variant="outline" className="text-xs">
                        {item.syncedTaskCount}/{item.approvedTaskCount} sync
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Analysis: {item.analysisId ?? "—"} · Task: {item.taskCount} · Hedef: {item.syncTargets.length > 0 ? item.syncTargets.join(", ") : "—"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
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
