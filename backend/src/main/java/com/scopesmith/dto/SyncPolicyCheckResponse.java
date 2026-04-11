package com.scopesmith.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SyncPolicyCheckResponse {
    private boolean passed;
    private String status;
    private int totalTasks;
    private int eligibleTasks;
    private int errorCount;
    private int warningCount;
    private String message;
    private List<Violation> violations;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Violation {
        private Long taskId;
        private String taskTitle;
        private String code;
        private String severity;
        private String message;
    }
}
