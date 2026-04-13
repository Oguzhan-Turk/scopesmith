import { useState, useRef, useEffect, type ReactNode } from "react";
import { ArrowLeft, Send, Pencil, ChevronRight, RefreshCw, Settings2, Check, Download, ExternalLink, Square } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";
import { syncToJira, syncToGitHub, suggestSp, getClaudeCodePrompt, updateTask, startManagedAgent, getManagedAgentStatus, cancelManagedAgent, getFeatures } from "@/api/client";

import { priorityColor } from "./utils";
import type { TasksTabProps } from "./types";

// ─── Category badge bg helper ────────────────────────────────────────────────

function categoryBadgeBg(cat: string): string {
  const map: Record<string, string> = {
    BACKEND: "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400",
    FRONTEND: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400",
    DATABASE: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
    MOBILE: "bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400",
    DEVOPS: "bg-slate-100 text-slate-600 dark:bg-slate-800/40 dark:text-slate-400",
    TESTING: "bg-pink-50 text-pink-600 dark:bg-pink-950/40 dark:text-pink-400",
    FULLSTACK: "bg-cyan-50 text-cyan-600 dark:bg-cyan-950/40 dark:text-cyan-400",
  };
  return map[cat?.toUpperCase()] || "bg-muted text-muted-foreground";
}

// ─── Integration Menu ─────────────────────────────────────────────────────────

interface IntegrationMenuProps {
  syncedCount: number;
  unsyncedCount: number;
  allSynced: boolean;
  actionLoading: string | null;
  integrationConfig: TasksTabProps["integrationConfig"];
  setActiveTab: TasksTabProps["setActiveTab"];
  handleSyncJira: TasksTabProps["handleSyncJira"];
  handleSyncGitHub: TasksTabProps["handleSyncGitHub"];
  handleExportCsv: TasksTabProps["handleExportCsv"];
  handleVerifySync: TasksTabProps["handleVerifySync"];
  askConfirm: (message: string, onConfirm: () => void) => void;
}

interface IntegrationMenuItemProps {
  onClick: () => void;
  closeMenu: () => void;
  disabled?: boolean;
  children: ReactNode;
}

function IntegrationMenuItem({
  onClick,
  closeMenu,
  disabled,
  children,
}: IntegrationMenuItemProps) {
  return (
    <button
      onClick={() => { onClick(); closeMenu(); }}
      disabled={disabled}
      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
    >
      {children}
    </button>
  );
}

function IntegrationMenuDivider() {
  return <div className="my-1 border-t border-border/60" />;
}

function IntegrationMenu({
  syncedCount,
  unsyncedCount,
  allSynced,
  actionLoading,
  integrationConfig,
  setActiveTab,
  handleSyncJira,
  handleSyncGitHub,
  handleExportCsv,
  handleVerifySync,
  askConfirm,
}: IntegrationMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const hasJira = !!(integrationConfig.jira?.projectKey);
  const hasGitHub = !!(integrationConfig.github?.repo);
  const hasAny = hasJira || hasGitHub;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={!!actionLoading}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-border bg-card text-[0.8rem] font-medium text-foreground/70 hover:bg-muted disabled:opacity-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="material-icons-outlined" style={{ fontSize: 14 }}>send</span>
        Gönder
        {unsyncedCount > 0 && (
          <span className="ml-0.5 px-1.5 py-0.5 text-xs font-semibold rounded-full bg-primary text-primary-foreground leading-none">
            {unsyncedCount}
          </span>
        )}
        <span className="material-icons-outlined" style={{ fontSize: 14 }}>expand_more</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-52 rounded-lg border border-border bg-popover shadow-lg z-50 py-1 overflow-hidden">
          {hasAny ? (
            <>
              {hasJira && (
                <IntegrationMenuItem
                  closeMenu={() => setOpen(false)}
                  disabled={allSynced || !!actionLoading}
                  onClick={() =>
                    askConfirm(
                      `SP onaylı ${unsyncedCount} task Jira'ya gönderilecek. Devam edilsin mi?`,
                      handleSyncJira,
                    )
                  }
                >
                  <Send className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  <span>Jira'ya Gönder</span>
                  {unsyncedCount > 0 && (
                    <span className="ml-auto text-xs text-muted-foreground">{unsyncedCount} bekliyor</span>
                  )}
                </IntegrationMenuItem>
              )}
              {hasGitHub && (
                <IntegrationMenuItem
                  closeMenu={() => setOpen(false)}
                  disabled={allSynced || !!actionLoading}
                  onClick={() =>
                    askConfirm(
                      `SP onaylı ${unsyncedCount} task GitHub'a gönderilecek. Devam edilsin mi?`,
                      handleSyncGitHub,
                    )
                  }
                >
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  <span>GitHub'a Gönder</span>
                  {unsyncedCount > 0 && (
                    <span className="ml-auto text-xs text-muted-foreground">{unsyncedCount} bekliyor</span>
                  )}
                </IntegrationMenuItem>
              )}
              <IntegrationMenuDivider />
              <IntegrationMenuItem closeMenu={() => setOpen(false)} onClick={handleExportCsv}>
                <Download className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                <span>CSV İndir</span>
              </IntegrationMenuItem>
              {syncedCount > 0 && (
                <IntegrationMenuItem closeMenu={() => setOpen(false)} onClick={handleVerifySync} disabled={!!actionLoading}>
                  <Check className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  <span>Task Sync</span>
                  <span className="ml-auto text-xs text-muted-foreground">{syncedCount} senkronize</span>
                </IntegrationMenuItem>
              )}
            </>
          ) : (
            <>
              <IntegrationMenuItem closeMenu={() => setOpen(false)} onClick={handleExportCsv}>
                <Download className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                <span>CSV İndir</span>
              </IntegrationMenuItem>
              <IntegrationMenuDivider />
              <IntegrationMenuItem closeMenu={() => setOpen(false)} onClick={() => setActiveTab("integrations")}>
                <Settings2 className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                <span>Entegrasyon Ayarla</span>
                <ChevronRight className="w-3.5 h-3.5 ml-auto text-muted-foreground" />
              </IntegrationMenuItem>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Prompt Section ───────────────────────────────────────────────────────────

function PromptSection({ taskId, showToast }: { taskId: number; showToast: (msg: string, type?: "success" | "error" | "info") => void }) {
  const [prompt, setPrompt] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function load() {
    if (prompt !== null) { setOpen(true); return; }
    setLoading(true);
    try {
      const result = await getClaudeCodePrompt(taskId);
      setPrompt(result.prompt);
      setOpen(true);
    } catch { showToast("Prompt yüklenemedi.", "error"); }
    finally { setLoading(false); }
  }

  return (
    <div className="bg-secondary/50 dark:bg-secondary/30 rounded-xl p-5">
      <div className="flex items-center justify-between">
        <span className="text-[0.62rem] font-semibold uppercase tracking-wider text-muted-foreground">Geliştirme Promptu</span>
        <div className="flex items-center gap-3">
          {open && prompt && (
            <button
              onClick={async () => { await navigator.clipboard.writeText(prompt); showToast("Kopyalandı!", "success"); }}
              className="text-[0.7rem] text-muted-foreground hover:text-foreground flex items-center gap-1 focus-visible:outline-none rounded transition-colors"
            >
              <span className="material-icons-outlined" style={{ fontSize: 13 }}>content_copy</span>Kopyala
            </button>
          )}
          <button
            onClick={() => open ? setOpen(false) : load()}
            className="text-[0.7rem] text-muted-foreground hover:text-foreground focus-visible:outline-none rounded transition-colors"
          >
            {loading ? <RefreshCw className="w-3 h-3 animate-spin" /> : open ? "Gizle" : "Göster"}
          </button>
        </div>
      </div>
      <p className="text-[0.72rem] text-muted-foreground mt-1.5 leading-relaxed">Claude Code'a yapıştırılmaya hazır implementasyon promptu</p>
      {open && prompt && (
        <pre className="text-xs text-foreground/70 bg-muted/50 rounded-lg p-3 mt-3 overflow-x-auto whitespace-pre-wrap leading-relaxed font-mono max-h-64 overflow-y-auto">
          {prompt}
        </pre>
      )}
    </div>
  );
}

// ─── Agent Section ────────────────────────────────────────────────────────────

function AgentSection({
  task,
  showToast,
  onStatusChange,
}: {
  task: { id: number; agentStatus: string | null; agentBranch: string | null; agentSessionId: string | null };
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
  onStatusChange: () => void;
  hasLocalPath: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [polling, setPolling] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const status = task.agentStatus;
  const isRunning = status === "PENDING" || status === "IN_PROGRESS";

  // Poll status while running
  useEffect(() => {
    if (isRunning && !polling) {
      setPolling(true);
      intervalRef.current = setInterval(async () => {
        try {
          const result = await getManagedAgentStatus(task.id);
          if (result.status !== "PENDING" && result.status !== "IN_PROGRESS") {
            onStatusChange();
            if (intervalRef.current) clearInterval(intervalRef.current);
            setPolling(false);
          }
        } catch { /* ignore polling errors */ }
      }, 5000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, task.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleStart() {
    setLoading(true);
    try {
      await startManagedAgent(task.id);
      showToast("Agent başlatıldı.", "success");
      onStatusChange();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Agent başlatılamadı.";
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    try {
      await cancelManagedAgent(task.id);
      showToast("Agent iptal edildi.", "info");
      onStatusChange();
    } catch { showToast("İptal edilemedi.", "error"); }
  }

  const statusLabel: Record<string, string> = {
    PENDING: "Başlatılıyor...",
    IN_PROGRESS: "Çalışıyor...",
    COMPLETED: "Tamamlandı",
    FAILED: "Başarısız",
    CANCELLED: "İptal edildi",
  };

  const statusColor: Record<string, string> = {
    PENDING: "text-blue-500",
    IN_PROGRESS: "text-blue-500",
    COMPLETED: "text-emerald-500",
    FAILED: "text-destructive",
    CANCELLED: "text-muted-foreground",
  };

  return (
    <div className="rounded-xl p-5 border border-violet-200 dark:border-violet-800/40" style={{ background: "linear-gradient(135deg, #faf5ff, #f5f3ff)" }}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[0.72rem] font-semibold text-violet-600 dark:text-violet-400 flex items-center gap-1.5">
          <span className="material-icons-outlined" style={{ fontSize: 15 }}>play_circle</span>
          Managed Agent
        </span>
        {!hasLocalPath && (
          <span className="text-[0.65rem] text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800">
            Yerel path gerekli
          </span>
        )}
        {status && (
          <span className={`text-[0.7rem] font-semibold ${statusColor[status] || "text-muted-foreground"}`}>
            {isRunning && <RefreshCw className="w-3 h-3 animate-spin inline mr-1" />}
            {statusLabel[status] || status}
          </span>
        )}
      </div>

      <p className="text-[0.72rem] text-muted-foreground leading-relaxed mb-2.5">
        {!status && "Ayrı branch açılır, kod yazılır ve push edilir."}
        {status === "PENDING" && "Branch oluşturuluyor, agent başlatılıyor..."}
        {status === "IN_PROGRESS" && "Agent projeyi inceliyor, kodu yazıyor. Bu birkaç dakika sürebilir."}
        {status === "COMPLETED" && "Kod yazıldı ve push edildi. Branch üzerinden review yapabilirsiniz."}
        {status === "FAILED" && "Agent çalışırken bir hata oluştu. Tekrar deneyebilirsiniz."}
        {status === "CANCELLED" && "Agent iptal edildi. Tekrar başlatabilirsiniz."}
      </p>

      <div className="flex items-center gap-2 flex-wrap">
        {!isRunning && (
          <button
            onClick={handleStart}
            disabled={loading || !hasLocalPath}
            title={!hasLocalPath ? "Managed Agent için yerel kaynak kodu klasörü gerekli. Bağlam sekmesinden yerel klasör taraması yapın." : undefined}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] border-none text-white text-[0.72rem] font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)", boxShadow: "0 1px 3px rgba(124,58,237,0.3)" }}
          >
            {loading ? (
              <><RefreshCw className="w-3.5 h-3.5 animate-spin" />Başlatılıyor</>
            ) : status === "COMPLETED" ? (
              <><RefreshCw className="w-3.5 h-3.5" />Tekrar Çalıştır</>
            ) : (
              <><span className="material-icons-outlined" style={{ fontSize: 14 }}>play_arrow</span>Agent Başlat</>
            )}
          </button>
        )}

        {isRunning && (
          <button
            onClick={handleCancel}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] border border-border bg-card text-[0.72rem] font-medium text-destructive hover:bg-muted transition-colors"
          >
            <Square className="w-3 h-3" />İptal
          </button>
        )}

        {task.agentBranch && (status === "COMPLETED" || status === "IN_PROGRESS") && (
          <span className="inline-flex items-center gap-1.5 text-[0.65rem] text-muted-foreground font-mono bg-muted/60 px-2 py-1 rounded-[5px]">
            <span className="material-icons-outlined" style={{ fontSize: 12 }}>commit</span>
            {task.agentBranch}
          </span>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────

export default function TasksTab({
  selectedRequirementId,
  selectedAnalysis,
  tasks,
  setTasks,
  expandedTasks,
  toggleTask,
  integrationConfig,
  handleGenerateTasks,
  handleSpDecision,
  handleRefineTasks,
  handleSyncJira,
  handleSyncGitHub,
  handleExportCsv,
  handleVerifySync,
  taskInstruction,
  setTaskInstruction,
  setManualTaskDialog,
  setEditingTask,
  setConfirmDialog,
  setActiveTab,
  loadTasks,
  actionLoading,
  setActionLoading,
  showToast,
  isAdmin,
  projectServices,
}: TasksTabProps) {
  const [spLoading, setSpLoading] = useState<Set<number>>(new Set());
  const [feedbackOpen, setFeedbackOpen] = useState<Set<number>>(new Set());
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<number>>(new Set());
  const [bulkServiceId, setBulkServiceId] = useState<number | "">("");
  const [agentEnabled, setAgentEnabled] = useState(false);

  // Check if managed agent feature is enabled
  useEffect(() => {
    getFeatures().then(f => setAgentEnabled(f.managedAgentEnabled)).catch(() => {});
  }, []);

  useEffect(() => {
    // Only fetch for tasks that have no spSuggestion AND no spFinal yet
    const newTasks = tasks.filter(t => !t.spFinal && !t.spSuggestion);
    if (newTasks.length === 0) return;
    setSpLoading(prev => new Set([...prev, ...newTasks.map(t => t.id)]));
    newTasks.forEach(async (task) => {
      try {
        const result = await suggestSp(task.id);
        // Persist into parent tasks state so remounts don't re-fetch
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, spSuggestion: result.spSuggestion } : t));
      } catch { /* silent */ }
      finally {
        setSpLoading(prev => { const n = new Set(prev); n.delete(task.id); return n; });
      }
    });
  }, [tasks, setTasks]);

  useEffect(() => {
    setSelectedTaskIds((prev) => {
      if (prev.size === 0) return prev;
      const validIds = new Set(tasks.map((t) => t.id));
      const next = new Set<number>();
      prev.forEach((id) => {
        if (validIds.has(id)) next.add(id);
      });
      return next;
    });
  }, [tasks]);

  if (!selectedRequirementId) {
    return (
      <div className="text-center py-12 border border-dashed border-border rounded-xl">
        <p className="text-sm text-muted-foreground mb-4">Task'lari gormek icin once bir talep secin.</p>
        <button
          onClick={() => setActiveTab("requirements")}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-border bg-card text-[0.8rem] font-medium text-foreground/70 hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />Talepler'e Git
        </button>
      </div>
    );
  }

  if (!selectedAnalysis) {
    return (
      <div className="text-center py-12 border border-dashed border-border rounded-xl">
        <p className="text-sm text-muted-foreground mb-4">Bu talep henuz analiz edilmedi.</p>
        <button
          onClick={() => setActiveTab("requirements")}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-border bg-card text-[0.8rem] font-medium text-foreground/70 hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />Talepler'e Don ve Analiz Et
        </button>
      </div>
    );
  }

  const askConfirm = (message: string, onConfirm: () => void) => {
    setConfirmDialog({ message, onConfirm });
  };

  const isTaskSynced = (task: { jiraKey: string | null; syncRefs?: Array<{ syncState: string }> }) =>
    (task.syncRefs?.some((r) => r.syncState === "SYNCED") ?? false) || !!task.jiraKey;

  const visibleSyncRefs = (task: {
    jiraKey: string | null;
    syncRefs?: Array<{ provider: "JIRA" | "GITHUB"; externalRef: string; target: string | null; syncState: string }>;
  }) => {
    if (task.syncRefs && task.syncRefs.length > 0) return task.syncRefs;
    if (task.jiraKey) {
      return [{
        provider: "JIRA" as const,
        externalRef: task.jiraKey,
        target: null,
        syncState: "SYNCED",
      }];
    }
    return [];
  };

  const syncRefUrl = (ref: { provider: "JIRA" | "GITHUB"; externalRef: string; target: string | null }) => {
    if (ref.provider === "JIRA" && ref.target?.startsWith("http")) {
      return `${ref.target}/browse/${ref.externalRef}`;
    }
    if (ref.provider === "GITHUB" && ref.target && ref.externalRef.startsWith("#")) {
      return `https://github.com/${ref.target}/issues/${ref.externalRef.replace("#", "")}`;
    }
    return null;
  };

  const selectedCount = selectedTaskIds.size;
  const selectableTaskIds = tasks.map((task) => task.id);
  const allSelected = selectedCount > 0 && selectedCount === selectableTaskIds.length;

  const toggleTaskSelection = (taskId: number, checked: boolean) => {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(taskId);
      else next.delete(taskId);
      return next;
    });
  };

  const toggleSelectAll = (checked: boolean) => {
    if (checked) setSelectedTaskIds(new Set(selectableTaskIds));
    else setSelectedTaskIds(new Set());
  };

  const handleBulkAssignService = async () => {
    if (!selectedAnalysis || bulkServiceId === "" || selectedTaskIds.size === 0) return;
    setActionLoading("bulk-service-assign");
    try {
      await Promise.all(
        Array.from(selectedTaskIds).map((taskId) =>
          updateTask(taskId, { serviceId: bulkServiceId })
        )
      );
      await loadTasks(selectedAnalysis.id);
      showToast(`${selectedTaskIds.size} task için service ataması güncellendi.`, "success");
      setSelectedTaskIds(new Set());
      setBulkServiceId("");
    } catch {
      showToast("Toplu service ataması başarısız oldu.");
    } finally {
      setActionLoading(null);
    }
  };

  const syncedCount = tasks.filter((t) => isTaskSynced(t)).length;
  // SP-approved and not yet synced — these are eligible for bulk sync
  const spApprovedUnsyncedCount = tasks.filter((t) => !isTaskSynced(t) && t.spFinal != null).length;
  const unsyncedCount = spApprovedUnsyncedCount;
  const allSynced = spApprovedUnsyncedCount === 0;

  return (
    <div className="space-y-4">
      {/* ── Content Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground tracking-tight">Task'lar</h2>
          {tasks.length > 0 && (
            <p className="text-[0.75rem] text-muted-foreground mt-0.5">
              {tasks.length} task — {tasks.reduce((sum, t) => sum + (t.spFinal || t.spSuggestion || 0), 0)} SP
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Task'lara Böl — sadece task yokken */}
          {tasks.length === 0 && (() => {
            const openCount = selectedAnalysis?.questions.filter((q) => q.status === "OPEN").length || 0;
            const blocked = openCount > 0;
            return (
              <Tooltip content={blocked ? `${openCount} açık soru var — önce soruları cevaplayın` : ""}>
                <span>
                  <button
                    onClick={handleGenerateTasks}
                    disabled={!!actionLoading || blocked}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-[0.8rem] font-semibold disabled:opacity-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    style={{ background: "linear-gradient(135deg, #00bcd4, #00acc1)", boxShadow: "0 1px 3px rgba(0,188,212,0.3)" }}
                  >
                    {actionLoading === "tasks" ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" />Üretiliyor</> : "Task'lara Böl"}
                  </button>
                </span>
              </Tooltip>
            );
          })()}

          {/* + Task Ekle */}
          <button
            onClick={() => setManualTaskDialog(true)}
            disabled={!!actionLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-border bg-card text-[0.8rem] font-medium text-foreground/70 hover:bg-muted disabled:opacity-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="material-icons-outlined" style={{ fontSize: 14 }}>add</span>
            Task Ekle
          </button>

          {/* Entegrasyon dropdown — sadece admin + task varken */}
          {isAdmin && tasks.length > 0 && (
            <IntegrationMenu
              syncedCount={syncedCount}
              unsyncedCount={unsyncedCount}
              allSynced={allSynced}
              actionLoading={actionLoading}
              integrationConfig={integrationConfig}
              setActiveTab={setActiveTab}
              handleSyncJira={handleSyncJira}
              handleSyncGitHub={handleSyncGitHub}
              handleExportCsv={handleExportCsv}
              handleVerifySync={handleVerifySync}
              askConfirm={askConfirm}
            />
          )}
        </div>
      </div>

      {/* ── Bulk service assignment bar ── */}
      {isAdmin && tasks.length > 0 && projectServices.length > 0 && (
        <div className="bg-card rounded-xl border border-black/[0.04] shadow-[0_1px_2px_rgba(0,0,0,0.03)] px-5 py-3.5 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={(e) => toggleSelectAll(e.target.checked)}
              className="h-4 w-4 rounded border-border"
            />
            Tümünü seç
          </label>
          <span className="text-sm text-muted-foreground">{selectedCount} task seçili</span>
          <select
            value={bulkServiceId}
            onChange={(e) => setBulkServiceId(e.target.value ? Number(e.target.value) : "")}
            className="h-8 min-w-[220px] rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="">Service seçin</option>
            {projectServices.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name} ({service.serviceType})
              </option>
            ))}
          </select>
          <button
            onClick={handleBulkAssignService}
            disabled={selectedCount === 0 || bulkServiceId === "" || !!actionLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-border bg-card text-[0.78rem] font-medium text-foreground/70 hover:bg-muted disabled:opacity-50 transition-colors"
          >
            {actionLoading === "bulk-service-assign" ? "Atanıyor..." : "Seçililere Service Ata"}
          </button>
        </div>
      )}

      {tasks.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-xl">
          <p className="text-sm text-muted-foreground">
            Henüz task üretilmedi. "Task'lara Böl" butonunu kullanın.
          </p>
        </div>
      ) : (
        <>
          {/* ── Task list ── */}
          <div className="flex flex-col gap-2">
            {tasks.map((task) => {
              const isExpanded = expandedTasks.has(task.id);
              const synced = isTaskSynced(task);
              return (
                <div
                  key={task.id}
                  className={`bg-card rounded-xl border border-black/[0.04] shadow-[0_1px_2px_rgba(0,0,0,0.03)] overflow-hidden transition-shadow hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] group/card ${
                    synced ? "border-l-[3px] border-l-emerald-500" : ""
                  }`}
                >
                  {/* ── Task header row ── */}
                  <div
                    className="flex items-center gap-3 px-5 py-3.5 cursor-pointer select-none"
                    onClick={() => toggleTask(task.id)}
                    role="button"
                    aria-label={isExpanded ? "Daralt" : "Genişlet"}
                  >
                    {/* Priority bar */}
                    <span className={`w-[3px] h-5 rounded-sm flex-shrink-0 ${priorityColor(task.priority)}`} />

                    {/* Chevron */}
                    <span
                      className={`material-icons-outlined text-muted-foreground/50 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                      style={{ fontSize: 16 }}
                    >
                      chevron_right
                    </span>

                    {/* Checkbox for bulk selection */}
                    {isAdmin && projectServices.length > 0 && (
                      <input
                        type="checkbox"
                        checked={selectedTaskIds.has(task.id)}
                        onChange={(e) => toggleTaskSelection(task.id, e.target.checked)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-4 w-4 rounded border-border"
                        aria-label="Task seç"
                      />
                    )}

                    {/* Title */}
                    <span className="text-[0.85rem] font-medium text-foreground truncate flex-1 min-w-0">{task.title}</span>

                    {/* Right-side metadata */}
                    <div className="flex items-center gap-2 flex-shrink-0 ml-auto" onClick={(e) => e.stopPropagation()}>
                      {/* Category badge */}
                      {task.category && (
                        <span className={`px-2 py-0.5 rounded-[5px] text-[0.62rem] font-semibold ${categoryBadgeBg(task.category)}`}>
                          {task.category}
                        </span>
                      )}
                      {task.serviceName && (
                        <span className="px-2 py-0.5 rounded-[5px] text-[0.62rem] font-normal border border-border text-muted-foreground">
                          {task.serviceName}
                        </span>
                      )}

                      {/* SP — final takes precedence */}
                      {task.spFinal ? (
                        <span className="text-[0.78rem] font-bold tabular-nums text-foreground min-w-[32px] text-right">
                          {task.spFinal} SP
                        </span>
                      ) : spLoading.has(task.id) ? (
                        <RefreshCw className="w-3 h-3 animate-spin text-muted-foreground" />
                      ) : task.spSuggestion ? (
                        <span className="text-[0.78rem] font-medium tabular-nums text-muted-foreground min-w-[32px] text-right">
                          ~{task.spSuggestion} SP
                        </span>
                      ) : null}

                      {/* Sync refs */}
                      {visibleSyncRefs(task).slice(0, 2).map((ref) => {
                        const url = syncRefUrl(ref);
                        const refEl = (
                          <span className="inline-flex items-center gap-1 rounded bg-muted/60 px-1.5 py-0.5 text-[0.62rem] font-semibold text-muted-foreground hover:bg-muted transition-colors" title={ref.target || undefined}>
                            <span>{ref.provider === "JIRA" ? "JR" : "GH"}</span>
                            <code className="font-mono">{ref.externalRef}</code>
                          </span>
                        );
                        return (
                          <span key={`${ref.provider}-${ref.externalRef}`}>
                            {url ? <a href={url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>{refEl}</a> : refEl}
                          </span>
                        );
                      })}
                      {visibleSyncRefs(task).length > 2 && (
                        <span className="text-[0.62rem] text-muted-foreground">+{visibleSyncRefs(task).length - 2}</span>
                      )}

                      {/* Agent branch tag */}
                      {task.agentBranch && task.agentStatus === "COMPLETED" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[5px] bg-muted/60 text-muted-foreground text-[0.65rem] font-mono">
                          <span className="material-icons-outlined" style={{ fontSize: 12 }}>commit</span>
                          {task.agentBranch}
                        </span>
                      )}

                      {/* Actions — visible on hover */}
                      <div className="flex items-center gap-0.5 opacity-0 group-hover/card:opacity-100 transition-opacity">
                        {!synced && task.spFinal != null && isAdmin && (integrationConfig.jira?.projectKey || integrationConfig.github?.repo) && (
                          <button
                            onClick={async () => {
                              setActionLoading(`sync-${task.id}`);
                              try {
                                if (integrationConfig.jira?.projectKey) {
                                  await syncToJira(selectedAnalysis!.id, integrationConfig.jira.projectKey, undefined, [task.id]);
                                } else if (integrationConfig.github?.repo) {
                                  await syncToGitHub(selectedAnalysis!.id, integrationConfig.github.repo, [task.id]);
                                }
                                await loadTasks(selectedAnalysis!.id);
                                showToast("Gönderildi.", "success");
                              } catch (e) {
                                const msg = e instanceof Error ? e.message : "Gönderilemedi.";
                                showToast(msg);
                              }
                              finally { setActionLoading(null); }
                            }}
                            disabled={!!actionLoading}
                            className="text-muted-foreground hover:text-primary p-1 rounded hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                            aria-label="Gonder"
                          >
                            <Send className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => setEditingTask({...task})}
                          className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                          aria-label="Task duzenle"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* ── Expanded task body ── */}
                  {isExpanded && (
                    <div className="px-6 pb-6 pt-2 border-t border-border/30">
                      {/* Hero title */}
                      <div className="mb-6 mt-2">
                        <h3 className="text-[1.15rem] font-bold text-foreground tracking-tight mb-1.5">{task.title}</h3>
                        <div className="flex gap-2 items-center">
                          {task.category && (
                            <span className={`px-2 py-0.5 rounded-[5px] text-[0.62rem] font-semibold ${categoryBadgeBg(task.category)}`}>
                              {task.category}
                            </span>
                          )}
                          {task.priority && (
                            <span className="text-[0.72rem] text-muted-foreground">
                              Öncelik: {task.priority === "CRITICAL" ? "Kritik" : task.priority === "HIGH" ? "Yüksek" : task.priority === "MEDIUM" ? "Orta" : "Düşük"}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Description — bg-secondary card */}
                      <div className="bg-secondary/50 dark:bg-secondary/30 rounded-xl p-5 mb-5">
                        <p className="text-[0.85rem] text-foreground/70 leading-relaxed">{task.description}</p>
                      </div>

                      {/* Acceptance Criteria — bordered card */}
                      {task.acceptanceCriteria && (
                        <div className="bg-card border border-border/40 rounded-xl p-5 mb-5">
                          <div className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">Kabul Kriterleri</div>
                          <ul className="space-y-1.5">
                            {task.acceptanceCriteria.split("\n").filter(Boolean).map((line, i) => (
                              <li key={i} className="flex items-start gap-2 text-[0.78rem] text-foreground/65 leading-relaxed">
                                <span className="mt-0.5 w-[18px] h-[18px] rounded-[5px] border-[1.5px] border-border flex items-center justify-center flex-shrink-0">
                                  <span className="material-icons-outlined" style={{ fontSize: 13, color: "var(--color-muted-foreground)" }}>check</span>
                                </span>
                                <span>{line.replace(/^[-*•]\s*/, "")}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Dependency */}
                      {task.dependencyTitle && (
                        <div className="flex items-center gap-2 mb-5 text-[0.78rem] text-muted-foreground">
                          <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>Bağımlılık: <span className="text-foreground/70">{task.dependencyTitle}</span></span>
                        </div>
                      )}

                      {/* SP Decision — bg-secondary rounded card */}
                      <div className="bg-secondary/50 dark:bg-secondary/30 rounded-xl p-5 mb-5">
                        <div className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground mb-3">SP Kararı</div>
                        {/* AI suggestion */}
                        {(() => {
                          const displaySp = task.spSuggestion;
                          const displayRationale = task.spRationale;
                          const isCalibrating = spLoading.has(task.id);
                          return (
                            <div className="text-[0.78rem] text-muted-foreground mb-3">
                              {isCalibrating ? (
                                <span className="flex items-center gap-1.5"><RefreshCw className="w-3 h-3 animate-spin" />Kalibrasyon yapılıyor...</span>
                              ) : displaySp ? (
                                <span>AI önerisi: <span className="font-bold text-foreground text-[0.88rem]">{displaySp} SP</span>
                                  {displayRationale && <span className="ml-1 text-muted-foreground">— {displayRationale}</span>}
                                </span>
                              ) : null}
                            </div>
                          );
                        })()}

                        {/* Fibonacci buttons */}
                        <div className="flex items-center gap-2">
                          {[1, 2, 3, 5, 8, 13].map((sp) => (
                            <button
                              key={sp}
                              aria-label={`SP ${sp} seç`}
                              onClick={() => {
                                const aiSp = task.spSuggestion;
                                handleSpDecision(task.id, sp);
                                if (aiSp && sp !== aiSp) {
                                  setFeedbackOpen(prev => new Set([...prev, task.id]));
                                } else {
                                  setFeedbackOpen(prev => { const n = new Set(prev); n.delete(task.id); return n; });
                                }
                              }}
                              className={`w-11 h-[38px] rounded-[9px] border-[1.5px] text-[0.88rem] font-semibold flex items-center justify-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                                task.spFinal === sp
                                  ? "text-white border-[#00bcd4] shadow-[0_2px_8px_rgba(0,188,212,0.3)]"
                                  : "bg-card border-border text-foreground/60 hover:border-[#00bcd4] hover:text-[#00838f] hover:bg-[#f0fdfa] hover:-translate-y-px"
                              }`}
                              style={task.spFinal === sp ? { background: "linear-gradient(135deg, #00bcd4, #00acc1)" } : undefined}
                            >
                              {sp}
                            </button>
                          ))}
                        </div>

                        {/* Divergence feedback chips */}
                        {feedbackOpen.has(task.id) && (
                          <div className="pt-3">
                            <p className="text-[0.78rem] text-muted-foreground mb-2">AI'dan farklı seçtiniz — neden? <span className="opacity-60">(opsiyonel)</span></p>
                            <div className="flex flex-wrap gap-1.5">
                              {["Karmaşık entegrasyon", "Belirsiz kapsam", "Yabancı teknoloji", "Bağımlılık riski"].map(reason => (
                                <button
                                  key={reason}
                                  onClick={() => {
                                    handleSpDecision(task.id, task.spFinal!, reason);
                                    setFeedbackOpen(prev => { const n = new Set(prev); n.delete(task.id); return n; });
                                    showToast("Geri bildirim kaydedildi.", "success");
                                  }}
                                  className="px-2.5 py-1 text-xs rounded-full border border-border bg-card hover:border-primary/40 hover:text-primary transition-colors"
                                >
                                  {reason}
                                </button>
                              ))}
                              <button
                                onClick={() => setFeedbackOpen(prev => { const n = new Set(prev); n.delete(task.id); return n; })}
                                className="px-2.5 py-1 text-xs rounded-full border border-transparent text-muted-foreground hover:text-foreground transition-colors"
                              >
                                Atla
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Two-column: Prompt + Agent */}
                      <div className={`grid gap-4 ${agentEnabled ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"}`}>
                        <PromptSection taskId={task.id} showToast={showToast} />
                        {agentEnabled && (
                          <AgentSection
                            task={task}
                            showToast={showToast}
                            onStatusChange={() => { if (selectedAnalysis) loadTasks(selectedAnalysis.id); }}
                            hasLocalPath={!!project.localPath}
                          />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Refine row ── */}
          <div className="flex gap-2 pt-3 border-t border-border/30">
            <input
              type="text"
              placeholder="İyileştirme talimatı girin..."
              value={taskInstruction}
              onChange={(e) => setTaskInstruction(e.target.value)}
              className="flex-1 px-3 py-2 text-[0.78rem] rounded-lg border border-border bg-secondary/30 text-foreground placeholder:text-muted-foreground/50 focus:border-[#00bcd4] focus:bg-card focus-visible:outline-none transition-colors"
            />
            <button
              onClick={handleRefineTasks}
              disabled={!!actionLoading || !taskInstruction.trim()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-border bg-card text-[0.78rem] font-medium text-foreground/70 hover:bg-muted disabled:opacity-50 transition-colors"
            >
              {actionLoading === "refine-tasks" ? "İyileştiriliyor..." : "İyileştir"}
            </button>
          </div>

          {/* Quick refine chips */}
          <div className="flex flex-wrap gap-1.5">
            {[
              "Frontend ve backend'e ayır",
              "Mikro task'ları birleştir (4-8 hedefi)",
              "Service sınırına göre grupla",
              "Test task'ları ekle",
              "Öncelikleri yükselt",
              "Database task'larını ayır",
            ].map((chip) => (
              <button
                key={chip}
                onClick={() => setTaskInstruction(chip)}
                className="px-2.5 py-1 text-xs rounded-full border border-border bg-muted/50 hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {chip}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
