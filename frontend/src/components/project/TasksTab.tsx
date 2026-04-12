import { useState, useRef, useEffect, type ReactNode } from "react";
import { ArrowLeft, Send, Pencil, ChevronDown, ChevronRight, Copy, RefreshCw, Plus, Settings2, Check, Download, ExternalLink, Play, Square, GitBranch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tooltip } from "@/components/ui/tooltip";
import { syncToJira, syncToGitHub, suggestSp, getClaudeCodePrompt, updateTask, startManagedAgent, getManagedAgentStatus, cancelManagedAgent, getFeatures } from "@/api/client";

import { categoryColor, priorityColor } from "./utils";
import type { TasksTabProps } from "./types";

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
        className="flex items-center gap-1.5 px-3 h-8 text-sm font-medium rounded-md border border-border bg-background hover:bg-muted disabled:opacity-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Gönder
        {unsyncedCount > 0 && (
          <span className="ml-0.5 px-1.5 py-0.5 text-xs font-semibold rounded-full bg-primary text-primary-foreground leading-none">
            {unsyncedCount}
          </span>
        )}
        <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
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
    <div className="border-l-2 border-primary/15 pl-4 py-3 space-y-2">
      <div className="flex items-center justify-between">
        <h5 className="text-xs font-semibold text-primary/60 uppercase tracking-wide">Uygulama Promptu</h5>
        <div className="flex items-center gap-2">
          {open && prompt && (
            <button
              onClick={async () => { await navigator.clipboard.writeText(prompt); showToast("Kopyalandı!", "success"); }}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 focus-visible:outline-none rounded"
            >
              <Copy className="w-3 h-3" />Kopyala
            </button>
          )}
          <button
            onClick={() => open ? setOpen(false) : load()}
            className="text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none rounded"
          >
            {loading ? <RefreshCw className="w-3 h-3 animate-spin" /> : open ? "Gizle" : "Göster"}
          </button>
        </div>
      </div>
      {open && prompt && (
        <pre className="text-xs text-foreground/70 bg-muted/50 rounded-md p-3 overflow-x-auto whitespace-pre-wrap leading-relaxed font-mono max-h-64 overflow-y-auto">
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
    PENDING: "text-blue-600 dark:text-blue-400",
    IN_PROGRESS: "text-blue-600 dark:text-blue-400",
    COMPLETED: "text-emerald-600 dark:text-emerald-400",
    FAILED: "text-destructive",
    CANCELLED: "text-muted-foreground",
  };

  return (
    <div className="border-l-2 border-violet-300/40 dark:border-violet-700/40 pl-4 py-3 space-y-2">
      <div className="flex items-center justify-between">
        <h5 className="text-xs font-semibold text-violet-600/70 dark:text-violet-400/70 uppercase tracking-wide flex items-center gap-1.5">
          <Play className="w-3 h-3" />
          Managed Agent
        </h5>

        {/* Status badge */}
        {status && (
          <span className={`text-xs font-medium ${statusColor[status] || "text-muted-foreground"}`}>
            {isRunning && <RefreshCw className="w-3 h-3 animate-spin inline mr-1" />}
            {statusLabel[status] || status}
          </span>
        )}
      </div>

      {/* Description — context-aware, one line */}
      <p className="text-xs text-muted-foreground leading-relaxed">
        {!status && "Claude Code bu task'ı projeniz üzerinde implement eder. Ayrı bir branch açılır, kod yazılır ve push edilir."}
        {status === "PENDING" && "Branch oluşturuluyor, agent başlatılıyor..."}
        {status === "IN_PROGRESS" && "Agent projeyi inceliyor, kodu yazıyor. Bu birkaç dakika sürebilir."}
        {status === "COMPLETED" && "Kod yazıldı ve push edildi. Branch üzerinden review yapabilirsiniz."}
        {status === "FAILED" && "Agent çalışırken bir hata oluştu. Tekrar deneyebilirsiniz."}
        {status === "CANCELLED" && "Agent iptal edildi. Tekrar başlatabilirsiniz."}
      </p>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        {!isRunning && (
          <Button
            size="sm"
            variant={status === "COMPLETED" ? "outline" : "default"}
            className="text-xs"
            onClick={handleStart}
            disabled={loading}
          >
            {loading ? (
              <><RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />Başlatılıyor</>
            ) : status === "COMPLETED" ? (
              <><RefreshCw className="w-3.5 h-3.5 mr-1.5" />Tekrar Çalıştır</>
            ) : (
              <><Play className="w-3.5 h-3.5 mr-1.5" />Agent Başlat</>
            )}
          </Button>
        )}

        {isRunning && (
          <Button size="sm" variant="outline" className="text-xs text-destructive" onClick={handleCancel}>
            <Square className="w-3 h-3 mr-1.5" />İptal
          </Button>
        )}

        {/* Branch link */}
        {task.agentBranch && (status === "COMPLETED" || status === "IN_PROGRESS") && (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded">
            <GitBranch className="w-3 h-3" />
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
      <div className="text-center py-12 border border-dashed rounded-lg">
        <p className="text-sm text-muted-foreground mb-4">Task'lari gormek icin once bir talep secin.</p>
        <Button variant="outline" size="sm" onClick={() => setActiveTab("requirements")}>
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />Talepler'e Git
        </Button>
      </div>
    );
  }

  if (!selectedAnalysis) {
    return (
      <div className="text-center py-12 border border-dashed rounded-lg">
        <p className="text-sm text-muted-foreground mb-4">Bu talep henuz analiz edilmedi.</p>
        <Button variant="outline" size="sm" onClick={() => setActiveTab("requirements")}>
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />Talepler'e Don ve Analiz Et
        </Button>
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
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">
          Task'lar
          {tasks.length > 0 && (
            <span className="ml-2 text-base font-normal text-muted-foreground">
              {tasks.length} task — {tasks.reduce((sum, t) => sum + (t.spFinal || t.spSuggestion || 0), 0)} SP
            </span>
          )}
        </h2>
        <div className="flex items-center gap-2">
          {/* Task'lara Böl — sadece task yokken */}
          {tasks.length === 0 && (() => {
            const openCount = selectedAnalysis?.questions.filter((q) => q.status === "OPEN").length || 0;
            const blocked = openCount > 0;
            return (
              <Tooltip content={blocked ? `${openCount} açık soru var — önce soruları cevaplayın` : ""}>
                <span>
                  <Button onClick={handleGenerateTasks} disabled={!!actionLoading || blocked}>
                    {actionLoading === "tasks" ? <><RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />Üretiliyor</> : "Task'lara Böl"}
                  </Button>
                </span>
              </Tooltip>
            );
          })()}

          {/* + Task Ekle */}
          <Button variant="outline" size="sm" onClick={() => setManualTaskDialog(true)} disabled={!!actionLoading}>
            <Plus className="w-3.5 h-3.5 mr-1" />Task Ekle
          </Button>

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
      {isAdmin && tasks.length > 0 && projectServices.length > 0 && (
        <Card>
          <CardContent className="pt-4 pb-4 flex flex-wrap items-center gap-3">
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
            <Button
              size="sm"
              variant="outline"
              onClick={handleBulkAssignService}
              disabled={selectedCount === 0 || bulkServiceId === "" || !!actionLoading}
            >
              {actionLoading === "bulk-service-assign" ? "Atanıyor..." : "Seçililere Service Ata"}
            </Button>
          </CardContent>
        </Card>
      )}

      {tasks.length === 0 ? (
        <div className="text-center py-12 border border-dashed rounded-lg">
          <p className="text-sm text-muted-foreground">
            Henüz task üretilmedi. "Task'lara Böl" butonunu kullanın.
          </p>
        </div>
      ) : (
        <>
          {tasks.map((task) => {
            const isExpanded = expandedTasks.has(task.id);
            return (
              <Card key={task.id} className={isTaskSynced(task) ? "border-emerald-300/50 dark:border-emerald-700/40" : ""}>
                <div
                  className="flex items-center gap-3 cursor-pointer select-none px-4 py-1.5"
                  onClick={() => toggleTask(task.id)}
                  role="button"
                  aria-label={isExpanded ? "Daralt" : "Genişlet"}
                >
                    {/* Priority bar */}
                    <span className={`w-0.5 h-5 rounded-full flex-shrink-0 ${priorityColor(task.priority)}`} />

                    {/* Chevron */}
                    {isExpanded
                      ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />}
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
                    <span className="text-sm font-medium truncate flex-1 min-w-0">{task.title}</span>

                    {/* Right-side metadata */}
                    <div className="flex items-center gap-2 flex-shrink-0 ml-auto" onClick={(e) => e.stopPropagation()}>
                      {/* Category */}
                      {task.category && (
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded border ${categoryColor(task.category)}`}>
                          {task.category}
                        </span>
                      )}
                      {task.serviceName && (
                        <Badge variant="outline" className="text-[11px] font-normal">
                          {task.serviceName}
                        </Badge>
                      )}

                      {/* SP — final takes precedence */}
                      {task.spFinal ? (
                        <span className="text-xs font-semibold tabular-nums text-primary min-w-[28px] text-right">
                          {task.spFinal} SP
                        </span>
                      ) : spLoading.has(task.id) ? (
                        <RefreshCw className="w-3 h-3 animate-spin text-muted-foreground" />
                      ) : task.spSuggestion ? (
                        <span className="text-xs tabular-nums text-muted-foreground min-w-[28px] text-right">
                          ~{task.spSuggestion} SP
                        </span>
                      ) : null}

                      {/* Sync refs */}
                      {visibleSyncRefs(task).slice(0, 2).map((ref) => {
                        const url = syncRefUrl(ref);
                        const refEl = (
                          <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground" title={ref.target || undefined}>
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
                        <span className="text-[11px] text-muted-foreground">+{visibleSyncRefs(task).length - 2}</span>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-0.5 opacity-0 group-hover/card:opacity-100 transition-opacity">
                        {!isTaskSynced(task) && task.spFinal != null && isAdmin && (integrationConfig.jira?.projectKey || integrationConfig.github?.repo) && (
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
                            className="text-muted-foreground hover:text-primary p-1 rounded hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            aria-label="Gonder"
                          >
                            <Send className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => setEditingTask({...task})}
                          className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          aria-label="Task duzenle"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                {isExpanded && (
                  <CardContent className="space-y-0 pt-0 border-t border-border/60">
                    {/* Description */}
                    <div className="border-l-2 border-primary/30 pl-4 py-3">
                      <p className="text-sm leading-relaxed text-foreground/80">{task.description}</p>
                    </div>
                    {task.acceptanceCriteria && (
                      <>
                        <Separator />
                        <div className="border-l-2 border-primary/15 pl-4 py-3">
                          <h5 className="text-xs font-semibold text-primary/60 uppercase tracking-wide mb-2">Kabul Kriterleri</h5>
                          <ul className="space-y-1">
                            {task.acceptanceCriteria.split("\n").filter(Boolean).map((line, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-foreground/75">
                                <span className="mt-0.5 w-4 h-4 rounded border border-border flex items-center justify-center flex-shrink-0">
                                  <Check className="w-2.5 h-2.5 text-muted-foreground" />
                                </span>
                                <span>{line.replace(/^[-*•]\s*/, "")}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </>
                    )}
                    {task.spRationale && (
                      <>
                        <Separator />
                        <div className="border-l-2 border-primary/15 pl-4 py-3">
                          <h5 className="text-xs font-semibold text-primary/60 uppercase tracking-wide mb-1.5">SP Gerekçesi</h5>
                          <p className="text-sm text-foreground/70">{task.spRationale}</p>
                        </div>
                      </>
                    )}
                    {task.dependencyTitle && (
                      <>
                        <Separator />
                        <div className="border-l-2 border-muted-foreground/20 pl-4 py-2.5 flex items-center gap-2">
                          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                          <span className="text-xs text-muted-foreground">Bağımlılık: <span className="text-foreground/70">{task.dependencyTitle}</span></span>
                        </div>
                      </>
                    )}
                    <Separator />
                    <div className="border-l-2 border-primary/15 pl-4 py-3 space-y-3">
                      <h5 className="text-xs font-semibold text-primary/60 uppercase tracking-wide">SP Kararı</h5>
                      {/* AI suggestion with rationale */}
                      {(() => {
                        const displaySp = task.spSuggestion;
                        const displayRationale = task.spRationale;
                        const isCalibrating = spLoading.has(task.id);
                        return (
                          <div className="text-xs text-muted-foreground">
                            {isCalibrating ? (
                              <span className="flex items-center gap-1.5"><RefreshCw className="w-3 h-3 animate-spin" />Kalibrasyon yapılıyor...</span>
                            ) : displaySp ? (
                              <span>AI önerisi: <span className="font-semibold text-foreground">{displaySp} SP</span>
                                {displayRationale && <span className="ml-1 text-muted-foreground">— {displayRationale}</span>}
                              </span>
                            ) : null}
                          </div>
                        );
                      })()}
                      {/* Fibonacci buttons */}
                      <div className="flex items-center gap-1.5 flex-wrap">
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
                            className={`px-2.5 py-1 text-xs rounded-md border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                              task.spFinal === sp
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-background hover:bg-muted border-border"
                            }`}
                          >
                            {sp}
                          </button>
                        ))}
                      </div>
                      {/* Divergence feedback chips — only shown when final ≠ AI suggestion */}
                      {feedbackOpen.has(task.id) && (
                        <div className="pt-1">
                          <p className="text-xs text-muted-foreground mb-2">AI'dan farklı seçtiniz — neden? <span className="opacity-60">(opsiyonel)</span></p>
                          <div className="flex flex-wrap gap-1.5">
                            {["Karmaşık entegrasyon", "Belirsiz kapsam", "Yabancı teknoloji", "Bağımlılık riski"].map(reason => (
                              <button
                                key={reason}
                                onClick={() => {
                                  handleSpDecision(task.id, task.spFinal!, reason);
                                  setFeedbackOpen(prev => { const n = new Set(prev); n.delete(task.id); return n; });
                                  showToast("Geri bildirim kaydedildi.", "success");
                                }}
                                className="px-2.5 py-1 text-xs rounded-full border border-border bg-muted hover:border-primary/40 hover:text-primary transition-colors"
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
                    <Separator />
                    <PromptSection taskId={task.id} showToast={showToast} />
                    {agentEnabled && (
                      <>
                        <Separator />
                        <AgentSection
                          task={task}
                          showToast={showToast}
                          onStatusChange={() => { if (selectedAnalysis) loadTasks(selectedAnalysis.id); }}
                        />
                      </>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}

          {/* Task Refinement */}
          <Card>
            <CardContent className="pt-6 space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="İyileştirme talimatı girin..."
                  value={taskInstruction}
                  onChange={(e) => setTaskInstruction(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-sm border rounded-md bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <Button
                  size="sm"
                  onClick={handleRefineTasks}
                  disabled={!!actionLoading || !taskInstruction.trim()}
                >
                  {actionLoading === "refine-tasks" ? "İyileştiriliyor..." : "İyileştir"}
                </Button>
              </div>
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
                    className="px-2.5 py-1 text-xs rounded-full border bg-muted hover:bg-muted/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

    </div>
  );
}
