package com.scopesmith.dto;

import com.fasterxml.jackson.annotation.JsonPropertyOrder;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

/**
 * Structured output from Claude's project context analysis.
 * Instead of storing free-text, we store structured data that can be
 * queried, compared, and displayed meaningfully.
 */
@Data
@JsonPropertyOrder({"techStack", "architecturePattern", "architectureDescription", "modules", "entities", "apiEndpoints", "externalIntegrations", "dependencies", "keyObservations"})
public class ProjectContextResult {

    private TechStack techStack;
    private String architecturePattern; // e.g., "Monolithic MVC", "Microservices"
    private String architectureDescription;
    private List<ModuleInfo> modules;
    private List<EntityInfo> entities;
    private List<String> apiEndpoints;
    private List<String> externalIntegrations;
    private List<DependencyInfo> dependencies = new ArrayList<>();
    private List<String> keyObservations;

    @Data
    @JsonPropertyOrder({"languages", "frameworks", "databases", "buildTools", "otherTools"})
    public static class TechStack {
        private List<String> languages;
        private List<String> frameworks;
        private List<String> databases;
        private List<String> buildTools;
        private List<String> otherTools;
    }

    @Data
    @JsonPropertyOrder({"name", "description"})
    public static class ModuleInfo {
        private String name;
        private String description;
    }

    @Data
    @JsonPropertyOrder({"name", "description", "relationships"})
    public static class EntityInfo {
        private String name;
        private String description;
        private List<String> relationships; // e.g., "OneToMany with Order"
    }
}
