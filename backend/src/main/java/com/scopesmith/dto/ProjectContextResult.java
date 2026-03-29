package com.scopesmith.dto;

import lombok.Data;

import java.util.List;

/**
 * Structured output from Claude's project context analysis.
 * Instead of storing free-text, we store structured data that can be
 * queried, compared, and displayed meaningfully.
 */
@Data
public class ProjectContextResult {

    private TechStack techStack;
    private String architecturePattern; // e.g., "Monolithic MVC", "Microservices"
    private String architectureDescription;
    private List<ModuleInfo> modules;
    private List<EntityInfo> entities;
    private List<String> apiEndpoints;
    private List<String> externalIntegrations;
    private List<String> keyObservations;

    @Data
    public static class TechStack {
        private List<String> languages;
        private List<String> frameworks;
        private List<String> databases;
        private List<String> buildTools;
        private List<String> otherTools;
    }

    @Data
    public static class ModuleInfo {
        private String name;
        private String description;
    }

    @Data
    public static class EntityInfo {
        private String name;
        private String description;
        private List<String> relationships; // e.g., "OneToMany with Order"
    }
}
