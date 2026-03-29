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
    private String localPath;
    private boolean hasContext;
    private String techContext;
    private Integer contextVersion;
    private LocalDateTime lastScannedAt;
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
                .localPath(project.getLocalPath())
                .hasContext(project.getTechContext() != null)
                .techContext(project.getTechContext())
                .contextVersion(project.getContextVersion())
                .lastScannedAt(project.getLastScannedAt())
                .requirementCount(project.getRequirements().size())
                .documentCount(project.getDocuments().size())
                .createdAt(project.getCreatedAt())
                .updatedAt(project.getUpdatedAt())
                .build();
    }
}
