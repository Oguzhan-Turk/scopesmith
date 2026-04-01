import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatOperationType } from "./utils";
import type { UsageTabProps } from "./types";

export default function UsageTab({ usageSummary }: UsageTabProps) {
  if (!usageSummary || usageSummary.totalAiCalls === 0) {
    return (
      <Card className="text-center py-12 border-dashed">
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Henüz AI kullanımı yok. Bir talep analiz ettiğinizde burada maliyet ve ROI bilgileri görünecek.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold">{usageSummary.totalAiCalls}</p>
            <p className="text-xs text-muted-foreground">AI Çağrısı</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold">{usageSummary.totalTokens.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Toplam Token</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold">${usageSummary.totalEstimatedCostUsd.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">Toplam Maliyet</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold">{(usageSummary.totalDurationMs / 1000).toFixed(0)}s</p>
            <p className="text-xs text-muted-foreground">Toplam AI Süresi</p>
          </CardContent>
        </Card>
      </div>
      {usageSummary.roi && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">ROI Analizi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-2xl font-bold">{usageSummary.roi.totalAnalyses}</p>
                <p className="text-xs text-muted-foreground">Analiz Yapıldı</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{usageSummary.roi.estimatedHoursSaved.toFixed(0)} saat</p>
                <p className="text-xs text-muted-foreground">Tahmini Tasarruf</p>
              </div>
              <div>
                <p className="text-2xl font-bold">${usageSummary.roi.costPerAnalysis.toFixed(3)}</p>
                <p className="text-xs text-muted-foreground">Analiz Başına Maliyet</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">{usageSummary.roi.roiMultiplier}x</p>
                <p className="text-xs text-muted-foreground">ROI Çarpanı</p>
              </div>
            </div>
            <Separator />
            <p className="text-xs text-muted-foreground">
              Tahmini tasarruf: {usageSummary.roi.estimatedHoursSaved.toFixed(0)} saat × ${usageSummary.roi.analystHourlyRateUsd}/saat.
              AI maliyeti: ${usageSummary.totalEstimatedCostUsd.toFixed(2)}.
              Bu değerler varsayımsaldır, gerçek tasarruf proje karmaşıklığına bağlıdır.
            </p>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">İşlem Bazlı Dağılım</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(usageSummary.byOperationType).map(([op, data]) => (
              <div key={op} className="flex items-center justify-between py-1.5 border-b last:border-0">
                <span className="text-sm">{formatOperationType(op)}</span>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>{data.count} çağrı</span>
                  <span>${data.costUsd.toFixed(3)}</span>
                  <span>{(data.avgDurationMs / 1000).toFixed(1)}s ort.</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
