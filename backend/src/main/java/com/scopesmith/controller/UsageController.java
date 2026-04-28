package com.scopesmith.controller;

import com.scopesmith.entity.OperationType;
import com.scopesmith.entity.UsageRecord;
import com.scopesmith.repository.UsageRecordRepository;
import com.scopesmith.service.ResourceAccessService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/usage")
@RequiredArgsConstructor
public class UsageController {

    private final UsageRecordRepository usageRecordRepository;
    private final ResourceAccessService resourceAccessService;

    @GetMapping("/projects/{projectId}/summary")
    public Map<String, Object> getProjectSummary(
            @PathVariable Long projectId,
            @RequestParam(defaultValue = "1.5") double hoursPerAnalysis,
            @RequestParam(defaultValue = "10.0") double hourlyRate) {
        resourceAccessService.assertProjectAccess(projectId);
        // Use entity-level aggregation instead of raw query to avoid cast issues
        List<UsageRecord> records = usageRecordRepository.findByProjectIdOrderByCreatedAtDesc(projectId);

        long totalInputTokens = 0;
        long totalOutputTokens = 0;
        BigDecimal totalCost = BigDecimal.ZERO;
        long totalDurationMs = 0;
        long analysisCount = 0;
        Map<String, long[]> opStats = new LinkedHashMap<>(); // [count, costMicro, totalDurationMs]

        for (UsageRecord r : records) {
            totalInputTokens += r.getInputTokens() != null ? r.getInputTokens() : 0;
            totalOutputTokens += r.getOutputTokens() != null ? r.getOutputTokens() : 0;
            totalCost = totalCost.add(r.getEstimatedCostUsd() != null ? r.getEstimatedCostUsd() : BigDecimal.ZERO);
            totalDurationMs += r.getDurationMs() != null ? r.getDurationMs() : 0;

            if (r.getOperationType() == OperationType.REQUIREMENT_ANALYSIS) {
                analysisCount++;
            }

            String opName = r.getOperationType().name();
            long[] stats = opStats.computeIfAbsent(opName, k -> new long[3]);
            stats[0]++; // count
            stats[1] += r.getEstimatedCostUsd() != null ? r.getEstimatedCostUsd().multiply(BigDecimal.valueOf(1_000_000)).longValue() : 0;
            stats[2] += r.getDurationMs() != null ? r.getDurationMs() : 0;
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalAiCalls", records.size());
        result.put("totalInputTokens", totalInputTokens);
        result.put("totalOutputTokens", totalOutputTokens);
        result.put("totalTokens", totalInputTokens + totalOutputTokens);
        result.put("totalEstimatedCostUsd", totalCost.setScale(4, RoundingMode.HALF_UP));
        result.put("totalDurationMs", totalDurationMs);

        // Breakdown by operation
        Map<String, Object> operations = new LinkedHashMap<>();
        for (var entry : opStats.entrySet()) {
            long[] stats = entry.getValue();
            Map<String, Object> opData = new LinkedHashMap<>();
            opData.put("count", stats[0]);
            opData.put("costUsd", BigDecimal.valueOf(stats[1]).divide(BigDecimal.valueOf(1_000_000), 4, RoundingMode.HALF_UP));
            opData.put("avgDurationMs", stats[0] > 0 ? stats[2] / stats[0] : 0);
            operations.put(entry.getKey(), opData);
        }
        result.put("byOperationType", operations);

        // ROI
        if (analysisCount > 0 && totalCost.compareTo(BigDecimal.ZERO) > 0) {
            double estimatedHoursSaved = analysisCount * hoursPerAnalysis;
            double estimatedValueSaved = estimatedHoursSaved * hourlyRate;
            double roiMultiplier = estimatedValueSaved / totalCost.doubleValue();

            Map<String, Object> roi = new LinkedHashMap<>();
            roi.put("totalAnalyses", analysisCount);
            roi.put("estimatedHoursSaved", estimatedHoursSaved);
            roi.put("costPerAnalysis", totalCost.doubleValue() / analysisCount);
            roi.put("hoursPerAnalysis", hoursPerAnalysis);
            roi.put("analystHourlyRateUsd", hourlyRate);
            roi.put("estimatedValueSavedUsd", Math.round(estimatedValueSaved));
            roi.put("roiMultiplier", Math.round(roiMultiplier));
            result.put("roi", roi);
        }

        return result;
    }
}
