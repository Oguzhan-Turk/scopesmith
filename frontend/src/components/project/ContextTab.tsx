import { useState } from "react";
import { RefreshCw, Plus, ChevronDown, CheckCircle2, AlertCircle, FileText, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { timeAgo } from "@/lib/utils";
import type { ContextTabProps } from "./types";

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
    onPartialRefresh,
    onLoadMorePartialRefreshHistory,
    documents,
    setDocDialog,
    handleDeleteDocument,
    actionLoading,
  } = props;

  const [advancedOpen, setAdvancedOpen] = useState(!project.hasContext);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);

  const selectedJob = partialRefreshHistory.find((j) => j.jobId === selectedJobId) ?? null;

  function formatDuration(startedAt?: string, completedAt?: string) {
    if (!startedAt) return "—";
    if (!completedAt) return "devam ediyor";
    const sec = Math.max(0, Math.round((new Date(completedAt).getTime() - new Date(startedAt).getTime()) / 1000));
    return sec < 60 ? `${sec}s` : `${Math.floor(sec / 60)}m ${sec % 60}s`;
  }

  // Freshness durumu
  const freshnessOk = contextFreshness?.recommendation === "NO_ACTION";
  const freshnessPartial = contextFreshness?.recommendation === "PARTIAL_REFRESH";
  const showFreshness = project.hasContext && !!project.lastScannedAt && contextFreshness && contextFreshness.status !== "NO_BASELINE";

  return (
    <div className="space-y-4">

      {/* ── Bağlam Durumu ── */}
      <div className="rounded-xl border bg-card px-5 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {project.hasContext ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
            )}
            <div>
              <p className="text-sm font-medium">
                {project.hasContext ? "Bağlam hazır" : "Bağlam henüz eklenmedi"}
              </p>
              <p className="text-xs text-muted-foreground">
                {project.hasContext
                  ? `Son tarama: ${timeAgo(project.lastScannedAt!)}${project.contextStale && project.commitsBehind ? ` · ${project.commitsBehind} yeni commit var` : ""}`
                  : "Kaynak kodunuzu taratarak AI analizlerini projenize özel hale getirin"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {showFreshness && freshnessOk && (
              <Badge variant="outline" className="border-emerald-300/70 text-emerald-700 dark:text-emerald-300">
                Güncel
              </Badge>
            )}
            {showFreshness && freshnessPartial && (
              <Badge variant="outline" className="border-amber-300/70 text-amber-700 dark:text-amber-300">
                Güncelleme önerilir
              </Badge>
            )}
          </div>
        </div>

        {/* Kısmi yenileme — sadece stale iken */}
        {showFreshness && freshnessPartial && (
          <div className="border-t mt-4 pt-3 flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">{contextFreshness!.reason}</p>
            <Button size="sm" variant="outline" onClick={onPartialRefresh}
              disabled={actionLoading === "partial-refresh" || partialRefreshStatus?.status === "RUNNING"}>
              {(actionLoading === "partial-refresh" || partialRefreshStatus?.status === "RUNNING")
                ? "Yenileniyor..." : "Etkilenenleri Yenile"}
            </Button>
          </div>
        )}
      </div>

      {/* ── Dokümanlar ── */}
      <div className="rounded-xl border bg-card">
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Dokümanlar</span>
            {documents.length > 0 && (
              <span className="text-xs text-muted-foreground">({documents.length})</span>
            )}
          </div>
          <Button size="sm" variant="outline" onClick={() => setDocDialog({ type: "project" })}>
            <Plus className="w-3.5 h-3.5 mr-1" />Ekle
          </Button>
        </div>
        {documents.length > 0 && (
          <div className="border-t px-5 py-3 space-y-2">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between gap-3 py-1">
                <div className="min-w-0 flex items-center gap-2">
                  <span className="text-sm truncate">{doc.filename}</span>
                  <Badge variant="outline" className="text-xs shrink-0">{doc.docType}</Badge>
                </div>
                <button
                  onClick={() => { if (window.confirm(`"${doc.filename}" silinsin mi?`)) handleDeleteDocument(doc.id); }}
                  className="text-xs text-muted-foreground hover:text-destructive shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                >
                  Sil
                </button>
              </div>
            ))}
          </div>
        )}
        {documents.length === 0 && (
          <div className="border-t px-5 py-3">
            <p className="text-xs text-muted-foreground">Toplantı notları, mimari kararlar veya e-postalar ekleyerek analizleri zenginleştirin.</p>
          </div>
        )}
      </div>

      {/* ── Gelişmiş ── */}
      <div className="rounded-xl border bg-card">
        <button
          className="w-full flex items-center justify-between px-5 py-4 text-left"
          onClick={() => setAdvancedOpen(v => !v)}
        >
          <div className="flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Gelişmiş</span>
          </div>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${advancedOpen ? "rotate-180" : ""}`} />
        </button>

        {advancedOpen && (
          <div className="border-t px-5 py-4 space-y-5">
            {/* Kaynak tarama */}
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Kaynak Tarama</p>
              <div className="inline-flex rounded bg-muted/40 p-0.5 gap-0.5">
                <button onClick={() => setScanMode("local")}
                  className={`px-2.5 py-0.5 text-xs rounded transition-colors ${scanMode === "local" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground"}`}>
                  Yerel Klasör
                </button>
                <button onClick={() => setScanMode("git")}
                  className={`px-2.5 py-0.5 text-xs rounded transition-colors ${scanMode === "git" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground"}`}>
                  Git URL
                </button>
              </div>
              {scanMode === "local" ? (
                <div className="flex gap-2">
                  <input type="text" placeholder="/Users/username/projects/my-app" value={scanPath}
                    onChange={(e) => setScanPath(e.target.value)}
                    className="flex-1 px-3 py-1.5 border rounded-md bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                  <Button size="sm" onClick={handleScan} disabled={!!actionLoading || !scanPath.trim()}>
                    {actionLoading === "scan" ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : "Tara"}
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <input type="text" placeholder="https://github.com/owner/repo.git" value={gitUrl}
                    onChange={(e) => setGitUrl(e.target.value)}
                    className="w-full px-3 py-1.5 border rounded-md bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                  <div className="flex gap-2">
                    <input type="password" placeholder="ghp_... (private repo için)" value={gitToken}
                      onChange={(e) => setGitToken(e.target.value)}
                      className="flex-1 px-3 py-1.5 border rounded-md bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                    <Button size="sm" onClick={handleScan} disabled={!!actionLoading || !gitUrl.trim()}>
                      {actionLoading === "scan" ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : "Tara"}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Geçmiş yenilemeler */}
            {partialRefreshHistory.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Geçmiş yenilemeler</p>
                <div className="space-y-1">
                  {partialRefreshHistory.map((job) => (
                    <button key={job.jobId ?? `${job.startedAt}-${job.status}`} type="button"
                      onClick={() => setSelectedJobId((prev) => (prev === (job.jobId ?? null) ? null : (job.jobId ?? null)))}
                      className="w-full flex items-center justify-between rounded border bg-background/70 px-2 py-1.5 text-xs hover:bg-muted/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={job.status === "DONE" ? "text-green-700 border-green-300" : job.status === "FAILED" ? "text-red-700 border-red-300" : "text-blue-700 border-blue-300"}>
                          {job.status}
                        </Badge>
                        <span className="text-muted-foreground">{job.refreshedCount ?? 0} talep</span>
                      </div>
                      <span className="text-muted-foreground">{job.startedAt ? timeAgo(job.startedAt) : "—"}</span>
                    </button>
                  ))}
                </div>
                {partialRefreshHasMore && (
                  <button type="button" onClick={onLoadMorePartialRefreshHistory} disabled={partialRefreshLoadingMore}
                    className="text-xs text-primary hover:underline disabled:opacity-50 focus-visible:outline-none rounded">
                    {partialRefreshLoadingMore ? "Yükleniyor..." : "Daha Fazla Göster"}
                  </button>
                )}
                {selectedJob && (
                  <div className="rounded border bg-background/70 p-2 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="font-medium">Job #{selectedJob.jobId}</span>
                      <span className="text-muted-foreground">{formatDuration(selectedJob.startedAt, selectedJob.completedAt)}</span>
                    </div>
                    {selectedJob.error && <div className="text-destructive">Hata: {selectedJob.error}</div>}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
