package com.scopesmith.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class ServiceGraphResponse {
    private Long projectId;
    private List<ProjectServiceResponse> services;
    private List<ServiceDependencyResponse> dependencies;
}
