package com.scopesmith.dto;

import com.fasterxml.jackson.annotation.JsonPropertyOrder;
import com.fasterxml.jackson.annotation.JsonSetter;
import com.scopesmith.dto.enums.TaskCategory;
import com.scopesmith.entity.TaskPriority;
import lombok.Data;

import java.util.List;

/**
 * Structured output from Claude's task breakdown.
 * Each task includes SP suggestion with rationale.
 */
@Data
@JsonPropertyOrder({"tasks"})
public class TaskBreakdownResult {

    private List<TaskItem> tasks;

    @Data
    @JsonPropertyOrder({"title", "description", "acceptanceCriteria", "spSuggestion", "spRationale", "priority", "category", "previousTaskId", "dependsOn"})
    public static class TaskItem {
        private String title;
        private String description;
        private String acceptanceCriteria;
        private Integer spSuggestion;
        private String spRationale;
        private TaskPriority priority;
        private TaskCategory category;
        private Long previousTaskId; // ID of the old task this evolved from (for smart merge)
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
