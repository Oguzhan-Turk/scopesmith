package com.scopesmith.dto;

import com.fasterxml.jackson.annotation.JsonPropertyOrder;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonPropertyOrder({"name", "group", "version", "scope"})
public class DependencyInfo {
    private String name;       // e.g., "spring-boot-starter-web"
    private String group;      // e.g., "org.springframework.boot"
    private String version;    // e.g., "3.5.3"
    private String scope;      // COMPILE, TEST, DEV, RUNTIME, PROVIDED
}
