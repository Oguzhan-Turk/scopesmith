package com.scopesmith.dto;

import com.scopesmith.entity.Project;
import com.scopesmith.service.InsightService;
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
    private String structuredContext;
    private Integer contextVersion;
    private LocalDateTime lastScannedAt;
    private int requirementCount;
    private int documentCount;
    private String integrationConfig;
    private Integer daysSinceLastScan;
    private Integer commitsBehind;
    private boolean contextStale;
    private String stalenessWarning;
    private Long organizationId;
    private String organizationName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static ProjectResponse from(Project project) {
        return from(project, null);
    }

    public static ProjectResponse from(Project project, InsightService.StalenessInfo staleness) {
        ProjectResponseBuilder builder = ProjectResponse.builder()
                .id(project.getId())
                .name(project.getName())
                .description(project.getDescription())
                .repoUrl(project.getRepoUrl())
                .localPath(project.getLocalPath())
                .hasContext(project.getTechContext() != null)
                .techContext(project.getTechContext())
                .structuredContext(project.getStructuredContext())
                .contextVersion(project.getContextVersion())
                .lastScannedAt(project.getLastScannedAt())
                .requirementCount(project.getRequirements().size())
                .documentCount(project.getDocuments().size())
                .integrationConfig(project.getIntegrationConfig())
                .organizationId(project.getOrganization() != null ? project.getOrganization().getId() : null)
                .organizationName(project.getOrganization() != null ? project.getOrganization().getName() : null)
                .createdAt(project.getCreatedAt())
                .updatedAt(project.getUpdatedAt());

        if (staleness != null) {
            builder.daysSinceLastScan(staleness.daysSinceLastScan())
                    .commitsBehind(staleness.commitsBehind())
                    .contextStale(staleness.isStale())
                    .stalenessWarning(staleness.warningMessage());
        }

        return builder.build();
    }
}
