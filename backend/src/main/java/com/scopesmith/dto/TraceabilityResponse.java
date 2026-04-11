package com.scopesmith.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TraceabilityResponse {
    private Long projectId;
    private LocalDateTime generatedAt;
    private Summary summary;
    private List<Item> items;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Summary {
        private int totalRequirements;
        private int analyzedRequirements;
        private int requirementsWithTasks;
        private int totalTasks;
        private int approvedTasks;
        private int syncedTasks;
        private double syncCoveragePercent;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Item {
        private Long requirementId;
        private Integer requirementSeq;
        private String requirementType;
        private String requirementPreview;
        private Long analysisId;
        private LocalDateTime analysisCreatedAt;
        private int taskCount;
        private int approvedTaskCount;
        private int syncedTaskCount;
        private List<String> syncTargets;
        private List<TaskLink> tasks;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TaskLink {
        private Long taskId;
        private String title;
        private Integer spFinal;
        private String syncRef;
        private String syncTarget;
        private String syncStatus;
        private List<SyncRef> syncRefs;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SyncRef {
        private String provider;
        private String externalRef;
        private String target;
        private String syncState;
    }
}
