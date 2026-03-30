package com.scopesmith.controller;

import com.scopesmith.entity.OperationType;
import com.scopesmith.repository.UsageRecordRepository;
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
@CrossOrigin(origins = "http://localhost:5173")
public class UsageController {

    private final UsageRecordRepository usageRecordRepository;

    // ROI assumptions
    private static final double HOURS_PER_ANALYSIS = 3.5; // manual requirement analysis
    private static final double ANALYST_HOURLY_RATE_USD = 75.0;

    @GetMapping("/projects/{projectId}/summary")
    public Map<String, Object> getProjectSummary(@PathVariable Long projectId) {
        Object[] summary = usageRecordRepository.getProjectSummary(projectId);
        List<Object[]> byOp = usageRecordRepository.getProjectSummaryByOperation(projectId);

        long totalInputTokens = ((Number) summary[0]).longValue();
        long totalOutputTokens = ((Number) summary[1]).longValue();
        BigDecimal totalCost = (BigDecimal) summary[2];
        long totalCalls = ((Number) summary[3]).longValue();
        long totalDurationMs = ((Number) summary[4]).longValue();

        // ROI calculation
        long analysisCount = usageRecordRepository.countByProjectIdAndOperationType(
                projectId, OperationType.REQUIREMENT_ANALYSIS);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalAiCalls", totalCalls);
        result.put("totalInputTokens", totalInputTokens);
        result.put("totalOutputTokens", totalOutputTokens);
        result.put("totalTokens", totalInputTokens + totalOutputTokens);
        result.put("totalEstimatedCostUsd", totalCost.setScale(4, RoundingMode.HALF_UP));
        result.put("totalDurationMs", totalDurationMs);

        // Breakdown by operation
        Map<String, Object> operations = new LinkedHashMap<>();
        for (Object[] row : byOp) {
            OperationType opType = (OperationType) row[0];
            Map<String, Object> opData = new LinkedHashMap<>();
            opData.put("count", ((Number) row[1]).longValue());
            opData.put("costUsd", ((BigDecimal) row[2]).setScale(4, RoundingMode.HALF_UP));
            opData.put("avgDurationMs", ((Number) row[3]).longValue());
            operations.put(opType.name(), opData);
        }
        result.put("byOperationType", operations);

        // ROI
        if (analysisCount > 0 && totalCost.compareTo(BigDecimal.ZERO) > 0) {
            double estimatedHoursSaved = analysisCount * HOURS_PER_ANALYSIS;
            double estimatedValueSaved = estimatedHoursSaved * ANALYST_HOURLY_RATE_USD;
            double roiMultiplier = estimatedValueSaved / totalCost.doubleValue();

            Map<String, Object> roi = new LinkedHashMap<>();
            roi.put("totalAnalyses", analysisCount);
            roi.put("estimatedHoursSaved", estimatedHoursSaved);
            roi.put("costPerAnalysis", totalCost.doubleValue() / analysisCount);
            roi.put("analystHourlyRateUsd", ANALYST_HOURLY_RATE_USD);
            roi.put("estimatedValueSavedUsd", Math.round(estimatedValueSaved));
            roi.put("roiMultiplier", Math.round(roiMultiplier));
            result.put("roi", roi);
        }

        return result;
    }
}
