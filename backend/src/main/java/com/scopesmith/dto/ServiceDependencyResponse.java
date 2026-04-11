package com.scopesmith.dto;

import com.scopesmith.entity.ServiceDependency;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class ServiceDependencyResponse {
    private Long id;
    private Long projectId;
    private Long fromServiceId;
    private String fromServiceName;
    private Long toServiceId;
    private String toServiceName;
    private String dependencyType;
    private LocalDateTime createdAt;

    public static ServiceDependencyResponse from(ServiceDependency dependency) {
        return ServiceDependencyResponse.builder()
                .id(dependency.getId())
                .projectId(dependency.getProject().getId())
                .fromServiceId(dependency.getFromService().getId())
                .fromServiceName(dependency.getFromService().getName())
                .toServiceId(dependency.getToService().getId())
                .toServiceName(dependency.getToService().getName())
                .dependencyType(dependency.getDependencyType())
                .createdAt(dependency.getCreatedAt())
                .build();
    }
}
