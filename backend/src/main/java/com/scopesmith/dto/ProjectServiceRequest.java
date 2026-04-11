package com.scopesmith.dto;

import com.scopesmith.entity.ServiceType;
import lombok.Data;

@Data
public class ProjectServiceRequest {
    private String name;
    private ServiceType serviceType;
    private String repoUrl;
    private String localPath;
    private String defaultBranch;
    private String ownerTeam;
    private Boolean active;
}
