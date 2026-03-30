package com.scopesmith.service;

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

    // Claude Sonnet 4 pricing (USD per million tokens)
    private static final BigDecimal INPUT_PRICE_PER_MILLION = new BigDecimal("3.00");
    private static final BigDecimal OUTPUT_PRICE_PER_MILLION = new BigDecimal("15.00");
    private static final BigDecimal ONE_MILLION = new BigDecimal("1000000");

    public void record(OperationType operationType, Long projectId,
                       long inputTokens, long outputTokens, String model, long durationMs) {

        BigDecimal cost = calculateCost(inputTokens, outputTokens);

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

        log.info("Usage recorded: {} | project={} | tokens={}+{}={} | cost=${} | {}ms",
                operationType, projectId, inputTokens, outputTokens,
                inputTokens + outputTokens, cost, durationMs);
    }

    private BigDecimal calculateCost(long inputTokens, long outputTokens) {
        BigDecimal inputCost = BigDecimal.valueOf(inputTokens)
                .multiply(INPUT_PRICE_PER_MILLION)
                .divide(ONE_MILLION, 6, RoundingMode.HALF_UP);
        BigDecimal outputCost = BigDecimal.valueOf(outputTokens)
                .multiply(OUTPUT_PRICE_PER_MILLION)
                .divide(ONE_MILLION, 6, RoundingMode.HALF_UP);
        return inputCost.add(outputCost);
    }
}
