import { ArrowLeft, Send, Pencil, ChevronDown, ChevronRight, Sparkles, Copy, RefreshCw, Plus, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tooltip } from "@/components/ui/tooltip";
import { syncToJira, syncToGitHub, suggestSp, getClaudeCodePrompt } from "@/api/client";
import { categoryColor, priorityColor } from "./utils";
import type { TasksTabProps } from "./types";

export default function TasksTab({
  selectedRequirementId,
  selectedAnalysis,
  tasks,
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
}: TasksTabProps) {
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

  const syncedCount = tasks.filter((t) => t.jiraKey).length;
  const unsyncedCount = tasks.length - syncedCount;
  const allSynced = unsyncedCount === 0;

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
          {tasks.length === 0 ? (() => {
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
          })() : null}
          <Button variant="outline" size="sm" onClick={() => setManualTaskDialog(true)} disabled={!!actionLoading}>
            <Plus className="w-3.5 h-3.5 mr-1" />Task Ekle
          </Button>
          {isAdmin && tasks.length > 0 && (
            <>
              {syncedCount > 0 && (() => {
                const jiraCount = tasks.filter((t) => t.jiraKey && !t.jiraKey.startsWith("#")).length;
                const ghCount = tasks.filter((t) => t.jiraKey && t.jiraKey.startsWith("#")).length;
                return (
                  <>
                    <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                      {jiraCount > 0 && <span className="flex items-center gap-0.5"><svg className="w-3 h-3 text-blue-500" viewBox="0 0 24 24" fill="currentColor"><path d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.005-1.005zm5.723-5.756H5.736a5.215 5.215 0 0 0 5.215 5.214h2.129v2.058a5.218 5.218 0 0 0 5.215 5.214V6.758a1.001 1.001 0 0 0-1.001-1.001z"/></svg>{jiraCount}</span>}
                      {ghCount > 0 && <span className="flex items-center gap-0.5"><svg className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>{ghCount}</span>}
                      <span>/ {tasks.length}</span>
                    </span>
                    <Button size="sm" variant="ghost" onClick={handleVerifySync} disabled={!!actionLoading} className="text-xs h-6 px-2">
                      {actionLoading === "verify-sync" ? <RefreshCw className="w-3 h-3 animate-spin" /> : "Doğrula"}
                    </Button>
                  </>
                );
              })()}
              {integrationConfig.jira?.projectKey && (
                <>
                  <Button size="sm" variant="outline" onClick={() => {
                    askConfirm(
                      allSynced
                        ? "Tüm task'lar zaten gönderilmiş. Tekrar göndermek istiyor musunuz?"
                        : `${unsyncedCount} task Jira'ya (${integrationConfig.jira!.projectKey}) gönderilecek.`,
                      handleSyncJira
                    );
                  }} disabled={!!actionLoading}>
                    {actionLoading === "jira-sync" ? "Gönderiliyor..." : "Jira'ya Gönder"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleExportCsv} disabled={!!actionLoading}>
                    {actionLoading === "export" ? "İndiriliyor..." : "CSV İndir"}
                  </Button>
                </>
              )}
              {integrationConfig.github?.repo && (
                <Button size="sm" variant="outline" onClick={() => {
                  askConfirm(
                    allSynced
                      ? "Tüm task'lar zaten gönderilmiş. Tekrar göndermek istiyor musunuz?"
                      : `${unsyncedCount} task GitHub Issues'a gönderilecek.`,
                    handleSyncGitHub
                  );
                }} disabled={!!actionLoading}>
                  {actionLoading === "github-sync" ? "Gönderiliyor..." : "GitHub'a Gönder"}
                </Button>
              )}
              {!integrationConfig.jira?.projectKey && !integrationConfig.github?.repo && (
                <Button size="sm" variant="outline" onClick={() => setActiveTab("integrations")}>
                  <Settings2 className="w-3.5 h-3.5 mr-1" />Entegrasyon Ayarla
                </Button>
              )}
            </>
          )}
        </div>
      </div>

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
              <Card key={task.id}>
                <CardHeader className="pb-3">
                  <div
                    className="flex items-center justify-between cursor-pointer select-none"
                    onClick={() => toggleTask(task.id)}
                  >
                    <CardTitle className="text-base flex items-center gap-2 min-w-0 mr-3">
                      {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />}
                      <span className="truncate">{task.title}</span>
                    </CardTitle>
                    <div className="flex items-center gap-1.5 self-center" onClick={(e) => e.stopPropagation()}>
                      <Badge variant="outline" className="text-xs">AI: {task.spSuggestion}</Badge>
                      {task.spFinal && <Badge variant="default" className="text-xs">Final: {task.spFinal}</Badge>}
                      <Badge variant="secondary" className="text-xs min-w-[52px] justify-center">
                        <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${priorityColor(task.priority)}`} />
                        {task.priority === "LOW" ? "Düşük" : task.priority === "MEDIUM" ? "Orta" : task.priority === "HIGH" ? "Yüksek" : "Kritik"}
                      </Badge>
                      {task.category && <Badge variant="outline" className={`text-xs ${categoryColor(task.category)}`}>{task.category}</Badge>}
                      {task.jiraKey && (() => {
                        const isGH = task.jiraKey.startsWith("#");
                        const url = isGH
                          ? `https://github.com/${integrationConfig.github?.repo || ""}/issues/${task.jiraKey.replace("#", "")}`
                          : null;
                        return (
                          <span className="inline-flex items-center" onClick={(e) => e.stopPropagation()}>
                            {url ? (
                              <a href={url} target="_blank" rel="noopener noreferrer">
                                <Badge variant="outline" className="text-xs hover:bg-muted cursor-pointer gap-1">
                                  <svg className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
                                  {task.jiraKey}
                                </Badge>
                              </a>
                            ) : (
                              <Badge variant="outline" className="text-xs gap-1">
                                <svg className="w-3 h-3 text-blue-500" viewBox="0 0 24 24" fill="currentColor"><path d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.005-1.005zm5.723-5.756H5.736a5.215 5.215 0 0 0 5.215 5.214h2.129v2.058a5.218 5.218 0 0 0 5.215 5.214V6.758a1.001 1.001 0 0 0-1.001-1.001zM23.013 0H11.455a5.215 5.215 0 0 0 5.215 5.215h2.129v2.057A5.215 5.215 0 0 0 24.013 12.487V1.005A1.005 1.005 0 0 0 23.013 0z"/></svg>
                                {task.jiraKey}
                              </Badge>
                            )}
                          </span>
                        );
                      })()}
                      <span className="ml-1 border-l pl-2 border-muted flex items-center gap-1">
                        {!task.jiraKey && isAdmin && (integrationConfig.jira?.projectKey || integrationConfig.github?.repo) && (
                          <button
                            onClick={async () => {
                              setActionLoading(`sync-${task.id}`);
                              try {
                                if (integrationConfig.jira?.projectKey) {
                                  await syncToJira(selectedAnalysis!.id, integrationConfig.jira.projectKey);
                                } else if (integrationConfig.github?.repo) {
                                  await syncToGitHub(selectedAnalysis!.id, integrationConfig.github.repo);
                                }
                                await loadTasks(selectedAnalysis!.id);
                                showToast("Gönderildi.", "success");
                              } catch { showToast("Gönderilemedi."); }
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
                      </span>
                    </div>
                  </div>
                </CardHeader>
                {isExpanded && (
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">{task.description}</p>
                    {task.acceptanceCriteria && (
                      <div>
                        <h5 className="text-sm font-medium mb-1">Kabul Kriterleri</h5>
                        <p className="text-xs text-muted-foreground whitespace-pre-wrap">{task.acceptanceCriteria}</p>
                      </div>
                    )}
                    {task.spRationale && (
                      <div>
                        <h5 className="text-sm font-medium mb-1">SP Gerekçesi</h5>
                        <p className="text-xs text-muted-foreground">{task.spRationale}</p>
                      </div>
                    )}
                    {task.dependencyTitle && (
                      <p className="text-xs text-muted-foreground">Bağımlılık: {task.dependencyTitle}</p>
                    )}
                    <Separator />
                    <div>
                      <h5 className="text-sm font-medium mb-2">SP Kararı</h5>
                      <div className="flex items-center gap-1.5">
                        {[1, 2, 3, 5, 8, 13].map((sp) => (
                          <button
                            key={sp}
                            onClick={() => handleSpDecision(task.id, sp)}
                            className={`px-2.5 py-1 text-xs rounded-md border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                              task.spFinal === sp
                                ? "bg-primary text-primary-foreground"
                                : "bg-background hover:bg-muted"
                            }`}
                          >
                            {sp}
                          </button>
                        ))}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-xs ml-2"
                          disabled={!!actionLoading}
                          onClick={async () => {
                            setActionLoading(`sp-${task.id}`);
                            try {
                              const result = await suggestSp(task.id);
                              handleSpDecision(task.id, result.spSuggestion);
                              showToast(`AI önerisi: ${result.spSuggestion} SP — ${result.spRationale}`, "success");
                            } catch { showToast("SP önerisi alınamadı."); }
                            finally { setActionLoading(null); }
                          }}
                        >
                          {actionLoading === `sp-${task.id}` ? <RefreshCw className="w-3 h-3 animate-spin" /> : <><Sparkles className="w-3 h-3 mr-1" />AI Oner</>}
                        </Button>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs"
                        onClick={async () => {
                          try {
                            const result = await getClaudeCodePrompt(task.id);
                            await navigator.clipboard.writeText(result.prompt);
                            showToast("Claude Code prompt'u kopyalandı!", "success");
                          } catch { showToast("Prompt kopyalanamadı."); }
                        }}
                      >
                        <Copy className="w-3.5 h-3.5 mr-1.5" />Claude Code Kopyala
                      </Button>
                    </div>
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
                  "Daha küçük parçalara böl",
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
