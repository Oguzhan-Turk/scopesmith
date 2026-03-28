package com.scopesmith.dto;

import com.scopesmith.entity.Project;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class ProjectResponse {

    private Long id;
    private String name;
    private String description;
    private String repoUrl;
    private boolean hasContext;
    private int requirementCount;
    private int documentCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static ProjectResponse from(Project project) {
        return ProjectResponse.builder()
                .id(project.getId())
                .name(project.getName())
                .description(project.getDescription())
                .repoUrl(project.getRepoUrl())
                .hasContext(project.getTechContext() != null)
                .requirementCount(project.getRequirements().size())
                .documentCount(project.getDocuments().size())
                .createdAt(project.getCreatedAt())
                .updatedAt(project.getUpdatedAt())
                .build();
    }
}
