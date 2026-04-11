package com.scopesmith.dto;

import com.scopesmith.entity.ProjectServiceNode;
import com.scopesmith.entity.ServiceType;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class ProjectServiceResponse {
    private Long id;
    private Long projectId;
    private String name;
    private ServiceType serviceType;
    private String repoUrl;
    private String localPath;
    private String defaultBranch;
    private String ownerTeam;
    private Boolean active;
    private Integer contextVersion;
    private LocalDateTime lastScannedAt;
    private String lastScannedCommitHash;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static ProjectServiceResponse from(ProjectServiceNode service) {
        return ProjectServiceResponse.builder()
                .id(service.getId())
                .projectId(service.getProject().getId())
                .name(service.getName())
                .serviceType(service.getServiceType())
                .repoUrl(service.getRepoUrl())
                .localPath(service.getLocalPath())
                .defaultBranch(service.getDefaultBranch())
                .ownerTeam(service.getOwnerTeam())
                .active(service.getActive())
                .contextVersion(service.getContextVersion())
                .lastScannedAt(service.getLastScannedAt())
                .lastScannedCommitHash(service.getLastScannedCommitHash())
                .createdAt(service.getCreatedAt())
                .updatedAt(service.getUpdatedAt())
                .build();
    }
}
