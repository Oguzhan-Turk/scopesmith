export type BadgeVariant = "default" | "secondary" | "destructive";

export function riskColor(level: string): BadgeVariant {
  const l = level?.toUpperCase();
  if (l?.includes("HIGH")) return "destructive";
  if (l?.includes("MEDIUM")) return "secondary";
  return "default";
}

export function categoryColor(cat: string): string {
  const colors: Record<string, string> = {
    BACKEND: "border-cat-backend text-cat-backend",
    FRONTEND: "border-cat-frontend text-cat-frontend",
    MOBILE: "border-cat-mobile text-cat-mobile",
    DATABASE: "border-cat-database text-cat-database",
    DEVOPS: "border-cat-devops text-cat-devops",
    TESTING: "border-cat-testing text-cat-testing",
    FULLSTACK: "border-cat-fullstack text-cat-fullstack",
  };
  return colors[cat?.toUpperCase()] || "";
}

export function statusColor(status: string): string {
  const colors: Record<string, string> = {
    NEW: "bg-status-new",
    ANALYZED: "bg-status-analyzed",
    CLARIFYING: "bg-status-clarifying",
    COMPLETED: "bg-status-completed",
    RE_ANALYZED: "bg-status-reanalyzed",
  };
  return colors[status] || "bg-muted-foreground";
}

export function priorityColor(priority: string): string {
  const colors: Record<string, string> = {
    CRITICAL: "bg-priority-critical",
    HIGH: "bg-priority-high",
    MEDIUM: "bg-priority-medium",
    LOW: "bg-priority-low",
  };
  return colors[priority] || "bg-muted-foreground";
}

export function formatOperationType(op: string): string {
  const labels: Record<string, string> = {
    REQUIREMENT_ANALYSIS: "Talep Analizi",
    TASK_BREAKDOWN: "Task Üretimi",
    TASK_REFINEMENT: "Task İyileştirme",
    STAKEHOLDER_SUMMARY: "Talep Açıklaması",
    SUMMARY_REFINEMENT: "Özet İyileştirme",
    PROJECT_CONTEXT: "Proje Context",
    PROJECT_CONTEXT_STRUCTURED: "Yapısal Context",
    CHANGE_IMPACT: "Değişiklik Etkisi",
    HEALTH_CHECK: "Sağlık Kontrolü",
  };
  return labels[op] || op;
}
