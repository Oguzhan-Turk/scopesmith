package com.scopesmith.dto;

import lombok.Data;

import java.util.List;

/**
 * Structured output from Claude's task breakdown.
 * Each task includes SP suggestion with rationale.
 */
@Data
public class TaskBreakdownResult {

    private List<TaskItem> tasks;

    @Data
    public static class TaskItem {
        private String title;
        private String description;
        private String acceptanceCriteria;
        private Integer spSuggestion;
        private String spRationale;
        private String priority; // LOW, MEDIUM, HIGH, CRITICAL
        private String dependsOn; // title of another task, null if independent
    }
}
