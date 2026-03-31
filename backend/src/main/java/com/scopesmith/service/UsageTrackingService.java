package com.scopesmith.service;

import com.scopesmith.config.ModelProperties;
import com.scopesmith.entity.ModelTier;
import com.scopesmith.entity.OperationType;
import com.scopesmith.entity.UsageRecord;
import com.scopesmith.repository.UsageRecordRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Service
@RequiredArgsConstructor
@Slf4j
public class UsageTrackingService {

    private final UsageRecordRepository usageRecordRepository;
    private final ModelProperties modelProperties;

    private static final BigDecimal ONE_MILLION = new BigDecimal("1000000");

    public void record(OperationType operationType, Long projectId,
                       long inputTokens, long outputTokens, String model, long durationMs) {

        BigDecimal cost = calculateCost(inputTokens, outputTokens, model);

        UsageRecord record = UsageRecord.builder()
                .projectId(projectId)
                .operationType(operationType)
                .inputTokens((int) inputTokens)
                .outputTokens((int) outputTokens)
                .totalTokens((int) (inputTokens + outputTokens))
                .model(model)
                .estimatedCostUsd(cost)
                .durationMs(durationMs)
                .build();

        usageRecordRepository.save(record);

        log.info("Usage recorded: {} | project={} | model={} | tokens={}+{}={} | cost=${} | {}ms",
                operationType, projectId, model, inputTokens, outputTokens,
                inputTokens + outputTokens, cost, durationMs);
    }

    /**
     * Calculate cost dynamically based on the model used.
     * Resolves pricing from ModelProperties configuration.
     */
    private BigDecimal calculateCost(long inputTokens, long outputTokens, String model) {
        ModelTier tier = modelProperties.resolveTier(model);
        ModelProperties.PricingEntry pricing = modelProperties.getPricing(tier);

        BigDecimal inputCost = BigDecimal.valueOf(inputTokens)
                .multiply(pricing.getInputPerMillion())
                .divide(ONE_MILLION, 6, RoundingMode.HALF_UP);
        BigDecimal outputCost = BigDecimal.valueOf(outputTokens)
                .multiply(pricing.getOutputPerMillion())
                .divide(ONE_MILLION, 6, RoundingMode.HALF_UP);
        return inputCost.add(outputCost);
    }
}
