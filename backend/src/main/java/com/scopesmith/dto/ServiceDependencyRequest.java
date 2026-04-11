package com.scopesmith.dto;

import lombok.Data;

@Data
public class ServiceDependencyRequest {
    private Long fromServiceId;
    private Long toServiceId;
    private String dependencyType;
}
