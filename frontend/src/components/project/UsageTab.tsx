import { formatOperationType } from "./utils";
import type { UsageTabProps } from "./types";

const OP_COLORS: Record<string, string> = {
  REQUIREMENT_ANALYSIS: "#3b82f6",
  BUG_ANALYSIS: "#3b82f6",
  ANALYSIS_REFINEMENT: "#3b82f6",
  TASK_BREAKDOWN: "#8b5cf6",
  TASK_REFINEMENT: "#8b5cf6",
  STAKEHOLDER_SUMMARY: "#00bcd4",
  SUMMARY_REFINEMENT: "#00bcd4",
  PROJECT_CONTEXT: "#10b981",
  PROJECT_CONTEXT_STRUCTURED: "#10b981",
  CHANGE_IMPACT: "#10b981",
  HEALTH_CHECK: "#10b981",
  SP_SUGGESTION: "#f59e0b",
  FEATURE_SUGGESTION: "#f59e0b",
  DOCUMENT_SUMMARY: "#00bcd4",
  CLAUDE_CODE_EXPORT: "#8b5cf6",
};

function getOpColor(op: string): string {
  return OP_COLORS[op] || "#94a3b8";
}


export default function UsageTab({ usageSummary }: UsageTabProps) {
  if (!usageSummary || usageSummary.totalAiCalls === 0) {
    return (
      <div className="bg-card rounded-[14px] p-12 border border-dashed border-border text-center">
        <span className="material-icons-outlined text-[2.5rem] text-muted-foreground/40 mb-3 block">bar_chart</span>
        <p className="text-muted-foreground text-sm">
          Henüz AI kullanimi yok. Bir talep analiz ettiginizde burada maliyet ve ROI bilgileri gorunecek.
        </p>
      </div>
    );
  }

  const opEntries = Object.entries(usageSummary.byOperationType);

  return (
    <div className="space-y-6">
      {/* Content header */}
      <div>
        <h2 className="text-[1.25rem] font-bold text-foreground tracking-[-0.02em]">Kullanim Analizi</h2>
        <p className="text-xs text-muted-foreground mt-0.5">AI kullanim istatistikleri ve yatirim getirisi</p>
      </div>

      {/* 4-column metrics grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* AI Cagrisi */}
        <div className="bg-card rounded-[14px] p-6 border border-black/4 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <div className="flex items-center gap-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-2.5">
            <span className="material-icons-outlined text-[15px]">bolt</span>
            AI Cagrisi
          </div>
          <div className="text-[1.75rem] font-bold text-foreground tabular-nums tracking-[-0.02em]">
            {usageSummary.totalAiCalls.toLocaleString()}
          </div>
        </div>

        {/* Toplam Token */}
        <div className="bg-card rounded-[14px] p-6 border border-black/4 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <div className="flex items-center gap-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-2.5">
            <span className="material-icons-outlined text-[15px]">token</span>
            Toplam Token
          </div>
          <div className="text-[1.75rem] font-bold text-foreground tabular-nums tracking-[-0.02em]">
            {usageSummary.totalTokens.toLocaleString()}
          </div>
        </div>

        {/* Toplam Maliyet */}
        <div className="bg-card rounded-[14px] p-6 border border-black/4 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <div className="flex items-center gap-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-2.5">
            <span className="material-icons-outlined text-[15px]">payments</span>
            Toplam Maliyet
          </div>
          <div className="text-[1.75rem] font-bold text-[#059669] tabular-nums tracking-[-0.02em]">
            ${usageSummary.totalEstimatedCostUsd.toFixed(2)}
          </div>
        </div>

        {/* AI Suresi */}
        <div className="bg-card rounded-[14px] p-6 border border-black/4 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <div className="flex items-center gap-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-2.5">
            <span className="material-icons-outlined text-[15px]">schedule</span>
            AI Suresi
          </div>
          <div className="text-[1.75rem] font-bold text-[#00838f] tabular-nums tracking-[-0.02em]">
            {(usageSummary.totalDurationMs / 1000).toFixed(0)}s
          </div>
          <div className="text-[0.68rem] text-muted-foreground mt-0.5">toplam AI suresi</div>
        </div>
      </div>

      {/* ROI card */}
      {usageSummary.roi && (
        <div
          className="rounded-2xl p-8 border border-[#ccfbf1] grid grid-cols-[1fr_auto] gap-8 items-center"
          style={{ background: "linear-gradient(135deg, #f0fdfa, #ecfeff)" }}
        >
          <div>
            <div className="flex items-center gap-1.5 text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-[#0d9488] mb-4">
              <span className="material-icons-outlined text-[16px]">trending_up</span>
              AI Verimlilik Ozeti (ROI)
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <div className="text-[1.5rem] font-bold text-[#065f46] tabular-nums">
                  {usageSummary.roi.totalAnalyses}
                </div>
                <div className="text-[0.68rem] text-[#047857] mt-0.5">Analiz tamamlandi</div>
              </div>
              <div>
                <div className="text-[1.5rem] font-bold text-[#065f46] tabular-nums">
                  {usageSummary.roi.estimatedHoursSaved.toFixed(0)}
                </div>
                <div className="text-[0.68rem] text-[#047857] mt-0.5">Tahmini saat tasarrufu</div>
              </div>
              <div>
                <div className="text-[1.5rem] font-bold text-[#065f46] tabular-nums">
                  ${usageSummary.roi.costPerAnalysis.toFixed(3)}
                </div>
                <div className="text-[0.68rem] text-[#047857] mt-0.5">Analiz basina maliyet</div>
              </div>
              <div>
                <div className="text-[2rem] font-bold text-primary tabular-nums">
                  {usageSummary.roi.roiMultiplier}x
                </div>
                <div className="text-[0.68rem] text-[#047857] mt-0.5">ROI carpani</div>
              </div>
            </div>
          </div>
          <div className="text-center">
            <div
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-white text-[0.82rem] font-bold shadow-[0_4px_12px_rgba(0,188,212,0.3)]"
              style={{ background: "linear-gradient(135deg, #00bcd4, #00acc1)" }}
            >
              <span className="material-icons-outlined text-[18px]">rocket_launch</span>
              Yuksek Verim
            </div>
            <div className="text-[0.65rem] text-muted-foreground mt-2 max-w-[140px]">
              Manuel analize kiyasla {usageSummary.roi.roiMultiplier} kat daha verimli
            </div>
          </div>
        </div>
      )}

      {/* ROI formula breakdown — transparency */}
      {usageSummary.roi && (
        <div className="bg-secondary/30 border border-border/50 rounded-[10px] px-5 py-3">
          <div className="text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
            ROI Hesabı
          </div>
          <div className="text-[0.78rem] text-foreground/80 font-mono">
            {usageSummary.roi.totalAnalyses} analiz × {usageSummary.roi.hoursPerAnalysis} saat ×{" "}
            ${usageSummary.roi.analystHourlyRateUsd}/saat (analist rate) ={" "}
            <span className="font-semibold text-emerald-700 dark:text-emerald-400">
              ${usageSummary.roi.estimatedValueSavedUsd} tahmini değer
            </span>
            {" / "}
            <span className="font-semibold text-foreground">
              ${usageSummary.totalEstimatedCostUsd.toFixed(4)} AI maliyeti
            </span>
            {" = "}
            <span className="font-bold text-primary">{usageSummary.roi.roiMultiplier}× ROI</span>
          </div>
          <div className="text-[0.68rem] text-muted-foreground/80 mt-1.5">
            Default: 1.5 saat/analiz, ${usageSummary.roi.analystHourlyRateUsd}/saat (junior düzey).
            Senior rate veya gerçek pazar saat ücretiyle çok daha yüksek olur.
          </div>
        </div>
      )}

      {/* Operations breakdown card */}
      <div className="bg-card rounded-[14px] border border-black/4 shadow-[0_1px_3px_rgba(0,0,0,0.03)] overflow-hidden">
        {/* Card header */}
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-1.5 text-[0.88rem] font-semibold text-foreground">
            <span className="material-icons-outlined text-[17px] text-muted-foreground">donut_small</span>
            Operasyon Bazli Dagilim
          </div>
        </div>

        {/* Table header */}
        <div className="grid grid-cols-[1fr_100px_100px_100px] px-6 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.06em] text-muted-foreground border-b border-border bg-muted/30">
          <div>Operasyon</div>
          <div className="text-right">Cagri</div>
          <div className="text-right">Maliyet</div>
          <div className="text-right">Ort. Sure</div>
        </div>

        {/* Table rows */}
        {opEntries.map(([op, data]) => (
          <div
            key={op}
            className="grid grid-cols-[1fr_100px_100px_100px] px-6 py-3 text-[0.82rem] items-center border-b border-border/30 last:border-b-0 hover:bg-muted/20 transition-colors"
          >
            <div className="flex items-center gap-2 font-medium text-foreground/80">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: getOpColor(op) }}
              />
              {formatOperationType(op)}
            </div>
            <div className="text-right tabular-nums font-semibold text-foreground/70">
              {data.count.toLocaleString()}
            </div>
            <div className="text-right tabular-nums font-semibold text-[#059669]">
              ${data.costUsd.toFixed(3)}
            </div>
            <div className="text-right tabular-nums text-muted-foreground">
              {(data.avgDurationMs / 1000).toFixed(1)}s
            </div>
          </div>
        ))}

      </div>

      {/* ROI disclaimer */}
      {usageSummary.roi && (
        <p className="text-[0.65rem] text-muted-foreground">
          Tahmini tasarruf: {usageSummary.roi.estimatedHoursSaved.toFixed(0)} saat x ${usageSummary.roi.analystHourlyRateUsd}/saat.
          AI maliyeti: ${usageSummary.totalEstimatedCostUsd.toFixed(2)}.
          Bu degerler varsayimsaldir, gercek tasarruf proje karmasikligina baglidir.
        </p>
      )}
    </div>
  );
}
