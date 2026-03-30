package com.scopesmith.dto;

import com.fasterxml.jackson.annotation.JsonSetter;
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

        /**
         * AI sometimes returns acceptanceCriteria as a list of strings instead of a single string.
         * This setter handles both cases gracefully.
         */
        @JsonSetter("acceptanceCriteria")
        public void setAcceptanceCriteria(Object value) {
            if (value instanceof String s) {
                this.acceptanceCriteria = s;
            } else if (value instanceof List<?> list) {
                this.acceptanceCriteria = String.join("\n", list.stream().map(Object::toString).toList());
            } else if (value != null) {
                this.acceptanceCriteria = value.toString();
            }
        }
    }
}
