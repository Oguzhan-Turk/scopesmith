package com.scopesmith.dto;

import com.scopesmith.entity.Task;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class TaskResponse {

    private Long id;
    private Long analysisId;
    private String title;
    private String description;
    private String acceptanceCriteria;
    private Integer spSuggestion;
    private String spRationale;
    private Integer spFinal;
    private String spDivergenceReason;
    private String priority;
    private String category;
    private String dependencyTitle;
    private String jiraKey;
    private LocalDateTime createdAt;

    public static TaskResponse from(Task task) {
        return TaskResponse.builder()
                .id(task.getId())
                .analysisId(task.getAnalysis().getId())
                .title(task.getTitle())
                .description(task.getDescription())
                .acceptanceCriteria(task.getAcceptanceCriteria())
                .spSuggestion(task.getSpSuggestion())
                .spRationale(task.getSpRationale())
                .spFinal(task.getSpFinal())
                .spDivergenceReason(task.getSpDivergenceReason())
                .priority(task.getPriority().name())
                .category(task.getCategory())
                .dependencyTitle(task.getDependency() != null ? task.getDependency().getTitle() : null)
                .jiraKey(task.getJiraKey())
                .createdAt(task.getCreatedAt())
                .build();
    }
}
