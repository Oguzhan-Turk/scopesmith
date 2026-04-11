package com.scopesmith.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class PartialRefreshStatusResponse {
    private Long jobId;
    private String status;
    private String recommendation;
    private Integer totalAnalyses;
    private Integer processedAnalyses;
    private Integer refreshedCount;
    private List<Long> refreshedRequirementIds;
    private String error;
    private LocalDateTime startedAt;
    private LocalDateTime completedAt;
}
