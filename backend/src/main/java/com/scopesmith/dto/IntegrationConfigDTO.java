package com.scopesmith.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class IntegrationConfigDTO {

    private JiraSettings jira;
    private GitHubSettings github;
    private String preferredProvider; // "JIRA" or "GITHUB"

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class JiraSettings {
        private String projectKey;
        private String defaultIssueType;
        /**
         * How to map categories to Jira: "LABELS_ONLY", "COMPONENTS", "BOTH" (default)
         * LABELS_ONLY: only add category:xxx labels
         * COMPONENTS: try to match Jira Components, fall back to labels
         * BOTH: always add labels + try Components
         */
        private String categoryMode; // default "BOTH"
        /**
         * Maps ScopeSmith category → Jira Component name.
         * e.g., {"BACKEND": "Core API", "FRONTEND": "Web UI"}
         * If null, auto-matches by name.
         */
        private Map<String, String> categoryMapping;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class GitHubSettings {
        private String repo;
    }
}
