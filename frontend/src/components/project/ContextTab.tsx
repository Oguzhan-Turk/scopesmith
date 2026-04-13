import { useState } from "react";
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
    if (!startedAt) return "\u2014";
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

      {/* -- Content Header -- */}
      <div className="mb-1.5">
        <h2 className="text-xl font-bold text-foreground">Bağlam</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Kaynak kodu ve dokümanlarla AI analizlerini projenize özel hale getirin
        </p>
      </div>

      {/* -- Hero Status Card -- */}
      {project.hasContext ? (
        <div
          className="flex items-center gap-6 rounded-2xl p-8 border"
          style={{
            background: "linear-gradient(135deg, #ecfdf5, #f0fdfa)",
            borderColor: "#d1fae5",
          }}
        >
          <div className="w-[52px] h-[52px] rounded-[14px] bg-emerald-500 flex items-center justify-center shrink-0">
            <span className="material-icons-outlined text-white" style={{ fontSize: 26 }}>verified</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[1.1rem] font-bold text-emerald-900 mb-0.5">Kod Bağlamı Hazır</div>
            <div className="text-[0.78rem] text-emerald-700">
              {project.contextStale && project.commitsBehind
                ? `Son tarama: ${timeAgo(project.lastScannedAt!)} \u00b7 ${project.commitsBehind} yeni commit var`
                : "Repository üzerinden proje contexti hazırlandı. AI analizleri projenize özel sonuçlar üretecek."}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-2xl font-bold text-emerald-900 tabular-nums">
              v{project.contextVersion ?? "?"}
            </div>
            <div className="text-[0.68rem] text-emerald-700">{timeAgo(project.lastScannedAt!)}</div>
          </div>
          {showFreshness && freshnessOk && (
            <span className="shrink-0 px-2.5 py-0.5 rounded-md text-[0.68rem] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200 ml-2">
              Güncel
            </span>
          )}
          {showFreshness && freshnessPartial && (
            <span className="shrink-0 px-2.5 py-0.5 rounded-md text-[0.68rem] font-semibold bg-amber-50 text-amber-600 border border-amber-200 ml-2">
              Güncelleme önerilir
            </span>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-4 bg-card rounded-[14px] border border-black/[0.04] shadow-[0_1px_3px_rgba(0,0,0,0.03)] px-5 py-5">
          <div className="w-[42px] h-[42px] rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
            <span className="material-icons-outlined text-amber-500" style={{ fontSize: 22 }}>warning</span>
          </div>
          <div className="flex-1">
            <div className="text-[0.92rem] font-semibold text-foreground">Bağlam henüz eklenmedi</div>
            <div className="text-[0.75rem] text-muted-foreground mt-0.5">
              Kaynak kodunuzu taratarak AI analizlerini projenize özel hale getirin
            </div>
          </div>
        </div>
      )}

      {/* Partial refresh banner -- only when stale */}
      {showFreshness && freshnessPartial && (
        <div className="bg-card rounded-[14px] border border-black/[0.04] shadow-[0_1px_3px_rgba(0,0,0,0.03)] px-5 py-3 flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">{contextFreshness!.reason}</p>
          <button
            className="shrink-0 px-3 py-1.5 rounded-[7px] border border-border bg-background text-[0.72rem] font-medium text-foreground hover:bg-muted/30 transition-colors disabled:opacity-50"
            onClick={onPartialRefresh}
            disabled={actionLoading === "partial-refresh" || partialRefreshStatus?.status === "RUNNING"}
          >
            {(actionLoading === "partial-refresh" || partialRefreshStatus?.status === "RUNNING")
              ? "Yenileniyor..." : "Etkilenenleri Yenile"}
          </button>
        </div>
      )}

      {/* -- Two-column grid: Documents + Scan History -- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Documents card */}
        <div className="bg-card rounded-[14px] border border-black/[0.04] shadow-[0_1px_3px_rgba(0,0,0,0.03)] px-5 py-5">
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-1.5 text-[0.82rem] font-semibold text-foreground">
              <span className="material-icons-outlined text-muted-foreground" style={{ fontSize: 16 }}>article</span>
              Dokümanlar
              {documents.length > 0 && (
                <span className="text-[0.65rem] font-semibold text-muted-foreground bg-secondary px-1.5 py-px rounded-[10px] ml-1">
                  {documents.length}
                </span>
              )}
            </div>
            <button
              onClick={() => setDocDialog({ type: "project" })}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-border bg-background text-[0.7rem] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors"
            >
              <span className="material-icons-outlined" style={{ fontSize: 14 }}>add</span>
              Ekle
            </button>
          </div>

          {documents.length > 0 ? (
            <div>
              {documents.map((doc, i) => (
                <div
                  key={doc.id}
                  className={`flex items-center justify-between py-2 ${i > 0 ? "border-t border-border/30" : ""}`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="material-icons-outlined text-primary shrink-0" style={{ fontSize: 15 }}>description</span>
                    <span className="text-[0.78rem] text-foreground/80 truncate">{doc.filename}</span>
                    <span className="shrink-0 px-1.5 py-px rounded text-[0.6rem] font-semibold bg-secondary text-muted-foreground">
                      {doc.docType}
                    </span>
                  </div>
                  <button
                    onClick={() => { if (window.confirm(`"${doc.filename}" silinsin mi?`)) handleDeleteDocument(doc.id); }}
                    className="shrink-0 text-[0.68rem] text-muted-foreground hover:text-destructive transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                  >
                    Sil
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[0.75rem] text-muted-foreground leading-relaxed">
              Toplantı notları, mimari kararlar veya e-postalar ekleyerek analizleri zenginleştirin.
            </p>
          )}
        </div>

        {/* Scan History card */}
        {partialRefreshHistory.length > 0 && (
          <div className="bg-card rounded-[14px] border border-black/[0.04] shadow-[0_1px_3px_rgba(0,0,0,0.03)] px-5 py-5">
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-1.5 text-[0.82rem] font-semibold text-foreground">
                <span className="material-icons-outlined text-muted-foreground" style={{ fontSize: 16 }}>history</span>
                Tarama Geçmişi
              </div>
            </div>

            {/* Grid header */}
            <div className="grid grid-cols-[70px_1fr_80px] text-[0.68rem] font-semibold text-muted-foreground uppercase tracking-wide pb-1.5 border-b border-border/40 mb-1">
              <div>Durum</div>
              <div>Detay</div>
              <div className="text-right">Tarih</div>
            </div>

            {/* History rows */}
            {partialRefreshHistory.map((job, i) => (
              <button
                key={job.jobId ?? `${job.startedAt}-${job.status}`}
                type="button"
                onClick={() => setSelectedJobId((prev) => (prev === (job.jobId ?? null) ? null : (job.jobId ?? null)))}
                className={`w-full grid grid-cols-[70px_1fr_80px] items-center py-2 text-left hover:bg-muted/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded ${i > 0 ? "border-t border-border/20" : ""}`}
              >
                <div>
                  <span className={`inline-block px-1.5 py-0.5 rounded-[5px] text-[0.62rem] font-semibold ${
                    job.status === "DONE"
                      ? "bg-emerald-50 text-emerald-600"
                      : job.status === "FAILED"
                        ? "bg-red-50 text-red-600"
                        : "bg-blue-50 text-blue-600"
                  }`}>
                    {job.status}
                  </span>
                </div>
                <div className="text-[0.75rem] text-foreground/70">
                  {job.refreshedCount ?? 0} talep yenilendi
                </div>
                <div className="text-[0.7rem] text-muted-foreground text-right">
                  {job.startedAt ? timeAgo(job.startedAt) : "\u2014"}
                </div>
              </button>
            ))}

            {partialRefreshHasMore && (
              <button
                type="button"
                onClick={onLoadMorePartialRefreshHistory}
                disabled={partialRefreshLoadingMore}
                className="text-xs text-primary hover:underline disabled:opacity-50 focus-visible:outline-none rounded mt-1"
              >
                {partialRefreshLoadingMore ? "Yükleniyor..." : "Daha Fazla Göster"}
              </button>
            )}

            {selectedJob && (
              <div className="rounded-lg border bg-background/70 p-2.5 text-xs space-y-1 mt-2">
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

      {/* -- Advanced / Collapsible Scan Settings -- */}
      <div className="bg-card rounded-[14px] border border-black/[0.04] shadow-[0_1px_3px_rgba(0,0,0,0.03)] overflow-hidden">
        <button
          className="w-full flex items-center justify-between px-6 py-3.5 text-left hover:bg-muted/10 transition-colors"
          onClick={() => setAdvancedOpen(v => !v)}
        >
          <div className="flex items-center gap-2">
            <span className="material-icons-outlined text-muted-foreground" style={{ fontSize: 16 }}>tune</span>
            <span className="text-[0.82rem] font-semibold text-foreground">Gelişmiş Tarama Ayarları</span>
          </div>
          <span
            className="material-icons-outlined text-muted-foreground transition-transform"
            style={{ fontSize: 16, transform: advancedOpen ? "rotate(180deg)" : "rotate(0deg)" }}
          >
            expand_more
          </span>
        </button>

        {advancedOpen && (
          <div className="px-6 pb-5 border-t border-border/30">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">

              {/* Left: Scan source */}
              <div>
                <div className="text-[0.62rem] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  Kaynak Kodu Bağlantısı
                </div>
                <div className="inline-flex rounded-[7px] bg-secondary p-0.5 gap-0.5 mb-3">
                  <button
                    onClick={() => setScanMode("local")}
                    className={`px-2.5 py-1 rounded-[5px] text-[0.72rem] font-medium transition-all ${
                      scanMode === "local"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Yerel Klasör
                  </button>
                  <button
                    onClick={() => setScanMode("git")}
                    className={`px-2.5 py-1 rounded-[5px] text-[0.72rem] font-medium transition-all ${
                      scanMode === "git"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
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
                      className="flex-1 px-3 py-2 rounded-lg border border-border bg-muted/30 text-[0.78rem] text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:bg-background focus:outline-none transition-colors"
                    />
                    <button
                      onClick={handleScan}
                      disabled={!!actionLoading || !scanPath.trim()}
                      className="inline-flex items-center gap-1 px-3.5 py-2 rounded-[7px] text-[0.75rem] font-semibold text-white disabled:opacity-50 transition-all"
                      style={{
                        background: "linear-gradient(135deg, #00bcd4, #00acc1)",
                        boxShadow: "0 1px 3px rgba(0,188,212,0.3)",
                      }}
                    >
                      {actionLoading === "scan" ? (
                        <span className="material-icons-outlined animate-spin" style={{ fontSize: 14 }}>refresh</span>
                      ) : "Tara"}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="https://github.com/owner/repo.git"
                      value={gitUrl}
                      onChange={(e) => setGitUrl(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-muted/30 text-[0.78rem] text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:bg-background focus:outline-none transition-colors"
                    />
                    <div className="flex gap-2">
                      <input
                        type="password"
                        placeholder="ghp_... (private repo için)"
                        value={gitToken}
                        onChange={(e) => setGitToken(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-lg border border-border bg-muted/30 text-[0.78rem] text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:bg-background focus:outline-none transition-colors"
                      />
                      <button
                        onClick={handleScan}
                        disabled={!!actionLoading || !gitUrl.trim()}
                        className="inline-flex items-center gap-1 px-3.5 py-2 rounded-[7px] text-[0.75rem] font-semibold text-white disabled:opacity-50 transition-all"
                        style={{
                          background: "linear-gradient(135deg, #00bcd4, #00acc1)",
                          boxShadow: "0 1px 3px rgba(0,188,212,0.3)",
                        }}
                      >
                        {actionLoading === "scan" ? (
                          <span className="material-icons-outlined animate-spin" style={{ fontSize: 14 }}>refresh</span>
                        ) : "Tara"}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Right: Scan config / partial refresh */}
              <div>
                <div className="text-[0.62rem] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  Tarama Yapılandırması
                </div>
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-[9px]">
                    <div>
                      <div className="text-[0.78rem] font-medium text-foreground">Kısmi yenileme</div>
                      <div className="text-[0.68rem] text-muted-foreground">Sadece etkilenen analizleri güncelle</div>
                    </div>
                    <button
                      onClick={onPartialRefresh}
                      disabled={actionLoading === "partial-refresh" || partialRefreshStatus?.status === "RUNNING" || !project.hasContext}
                      className="shrink-0 px-3 py-1 rounded-[7px] border border-border bg-background text-[0.7rem] font-medium text-foreground hover:bg-muted/20 transition-colors disabled:opacity-50"
                    >
                      {(actionLoading === "partial-refresh" || partialRefreshStatus?.status === "RUNNING")
                        ? "Yenileniyor..." : "Şimdi Yenile"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
