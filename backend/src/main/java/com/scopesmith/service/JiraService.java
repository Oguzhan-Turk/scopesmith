package com.scopesmith.service;

import com.scopesmith.config.JiraConfig;
import com.scopesmith.dto.IntegrationConfigDTO;
import com.scopesmith.entity.Analysis;
import com.scopesmith.entity.RequirementType;
import com.scopesmith.entity.Task;
import com.scopesmith.repository.AnalysisRepository;
import com.scopesmith.repository.TaskRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.*;

@Service
@Slf4j
public class JiraService {

    private final JiraConfig jiraConfig;
    private final TaskRepository taskRepository;
    private final AnalysisRepository analysisRepository;
    private final RestTemplate restTemplate;

    public JiraService(JiraConfig jiraConfig, TaskRepository taskRepository,
                       AnalysisRepository analysisRepository, RestTemplateBuilder restTemplateBuilder) {
        this.jiraConfig = jiraConfig;
        this.taskRepository = taskRepository;
        this.analysisRepository = analysisRepository;
        this.restTemplate = restTemplateBuilder
                .connectTimeout(Duration.ofSeconds(10))
                .readTimeout(Duration.ofSeconds(30))
                .build();
    }

    private static final Map<String, String> PRIORITY_MAP = Map.of(
            "LOW", "Low",
            "MEDIUM", "Medium",
            "HIGH", "High",
            "CRITICAL", "Highest"
    );

    /**
     * Sync all tasks from an analysis to Jira as issues.
     * Returns a map with created issue keys.
     */
    @Transactional
    public Map<String, Object> syncTasksToJira(Long analysisId, String projectKey, String issueType) {
        if (!jiraConfig.isConfigured()) {
            throw new IllegalStateException("Jira is not configured. Set JIRA_URL, JIRA_EMAIL, and JIRA_API_TOKEN.");
        }

        Analysis analysis = analysisRepository.findById(analysisId)
                .orElseThrow(() -> new EntityNotFoundException("Analysis not found: " + analysisId));

        List<Task> tasks = taskRepository.findByAnalysisId(analysisId);
        if (tasks.isEmpty()) {
            throw new IllegalStateException("No tasks to sync for analysis #" + analysisId);
        }

        // Resolve config: request param → project integration config → server config (.env)
        IntegrationConfigDTO projectConfig = parseIntegrationConfig(analysis.getRequirement().getProject().getIntegrationConfig());
        String configKey = projectConfig != null && projectConfig.getJira() != null
                ? projectConfig.getJira().getProjectKey() : null;

        String project = firstNonBlank(projectKey, configKey, jiraConfig.getProjectKey());

        String defaultType = analysis.getRequirement().getType() == RequirementType.BUG ? "Bug" : "Task";
        String projectDefaultType = projectConfig != null && projectConfig.getJira() != null
                ? projectConfig.getJira().getDefaultIssueType() : null;
        String type = firstNonBlank(issueType, projectDefaultType, defaultType);

        List<Map<String, String>> created = new ArrayList<>();
        List<Map<String, String>> failed = new ArrayList<>();

        for (Task task : tasks) {
            if (task.getJiraKey() != null) {
                // Already synced, skip
                created.add(Map.of("taskId", task.getId().toString(), "jiraKey", task.getJiraKey(), "status", "already_synced"));
                continue;
            }

            try {
                IntegrationConfigDTO.JiraSettings jiraSettings = projectConfig != null ? projectConfig.getJira() : null;
                String jiraKey = createJiraIssue(task, project, type, jiraSettings);
                task.setJiraKey(jiraKey);
                taskRepository.save(task);
                created.add(Map.of("taskId", task.getId().toString(), "jiraKey", jiraKey, "status", "created"));
                log.info("Created Jira issue {} for task #{} '{}'", jiraKey, task.getId(), task.getTitle());
            } catch (Exception e) {
                log.error("Failed to create Jira issue for task #{}: {}", task.getId(), e.getMessage(), e);
                failed.add(Map.of("taskId", task.getId().toString(), "title", task.getTitle(), "error", e.getMessage()));
            }
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalTasks", tasks.size());
        result.put("created", created.size());
        result.put("failed", failed.size());
        result.put("issues", created);
        if (!failed.isEmpty()) {
            result.put("errors", failed);
        }

        return result;
    }

    /**
     * Verify sync status — check if Jira issues still exist and are open.
     * Clears jiraKey for deleted/resolved issues.
     */
    @Transactional
    public Map<String, Object> verifySyncStatus(Long analysisId) {
        List<Task> tasks = taskRepository.findByAnalysisId(analysisId);
        List<Task> syncedTasks = tasks.stream()
                .filter(t -> t.getJiraKey() != null && !t.getJiraKey().startsWith("#"))
                .toList();

        if (syncedTasks.isEmpty()) {
            return Map.of("checked", 0, "cleared", 0);
        }

        int cleared = 0;
        for (Task task : syncedTasks) {
            try {
                String url = jiraConfig.getUrl() + "/rest/api/3/issue/" + task.getJiraKey();
                HttpHeaders headers = new HttpHeaders();
                headers.setBasicAuth(jiraConfig.getEmail(), jiraConfig.getApiToken(), StandardCharsets.UTF_8);

                ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, new HttpEntity<>(headers), Map.class);
                Map fields = (Map) response.getBody().get("fields");
                Map status = (Map) fields.get("status");
                String statusCategory = (String) ((Map) status.get("statusCategory")).get("key");

                if ("done".equals(statusCategory)) {
                    task.setJiraKey(null);
                    taskRepository.save(task);
                    cleared++;
                    log.info("Cleared sync for task #{} — Jira issue {} is done", task.getId(), task.getJiraKey());
                }
            } catch (Exception e) {
                task.setJiraKey(null);
                taskRepository.save(task);
                cleared++;
                log.info("Cleared sync for task #{} — Jira issue not accessible: {}", task.getId(), e.getMessage());
            }
        }

        return Map.of("checked", syncedTasks.size(), "cleared", cleared, "stillSynced", syncedTasks.size() - cleared);
    }

    private String createJiraIssue(Task task, String projectKey, String issueType,
                                    IntegrationConfigDTO.JiraSettings jiraSettings) {
        String url = jiraConfig.getUrl() + "/rest/api/3/issue";

        Map<String, Object> fields = new LinkedHashMap<>();
        fields.put("project", Map.of("key", projectKey));
        fields.put("summary", task.getTitle());
        fields.put("issuetype", Map.of("name", issueType));
        fields.put("description", buildAdfDescription(task));
        fields.put("priority", Map.of("name", PRIORITY_MAP.getOrDefault(task.getPriority().name(), "Medium")));

        // Labels: always include scopesmith + category label
        List<String> labels = new ArrayList<>(List.of("scopesmith"));
        if (task.getCategory() != null && !task.getCategory().isBlank()) {
            labels.add("category:" + task.getCategory().toLowerCase(java.util.Locale.ENGLISH));
        }
        fields.put("labels", labels);

        // Component mapping: try to map category to Jira Component
        String categoryMode = jiraSettings != null && jiraSettings.getCategoryMode() != null
                ? jiraSettings.getCategoryMode() : "BOTH";
        if (task.getCategory() != null && !task.getCategory().isBlank()
                && ("COMPONENTS".equals(categoryMode) || "BOTH".equals(categoryMode))) {
            String componentName = resolveComponentName(task.getCategory(), jiraSettings);
            if (componentName != null) {
                fields.put("components", List.of(Map.of("name", componentName)));
            }
        }

        Map<String, Object> body = Map.of("fields", fields);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBasicAuth(jiraConfig.getEmail(), jiraConfig.getApiToken(), StandardCharsets.UTF_8);

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
        ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.POST, request, Map.class);

        if (response.getBody() == null || !response.getBody().containsKey("key")) {
            throw new RuntimeException("Jira did not return issue key");
        }

        return (String) response.getBody().get("key");
    }

    /**
     * Build Atlassian Document Format (ADF) description.
     * ADF is required for Jira Cloud REST API v3.
     */
    private Map<String, Object> buildAdfDescription(Task task) {
        List<Map<String, Object>> content = new ArrayList<>();

        // Description paragraph
        if (task.getDescription() != null) {
            content.add(adfParagraph(task.getDescription()));
        }

        // Acceptance Criteria
        if (task.getAcceptanceCriteria() != null && !task.getAcceptanceCriteria().isBlank()) {
            content.add(adfHeading("Kabul Kriterleri"));
            content.add(adfParagraph(task.getAcceptanceCriteria()));
        }

        // SP Rationale
        if (task.getSpRationale() != null && !task.getSpRationale().isBlank()) {
            content.add(adfHeading("SP Gerekçesi"));
            content.add(adfParagraph(task.getSpRationale()));
        }

        // Story Points info
        Integer sp = task.getSpFinal() != null ? task.getSpFinal() : task.getSpSuggestion();
        if (sp != null) {
            content.add(adfParagraph("Story Points: " + sp + " SP"));
        }

        // Dependency
        if (task.getDependency() != null) {
            content.add(adfParagraph("Bağımlılık: \"" + task.getDependency().getTitle() + "\""));
        }

        return Map.of(
                "version", 1,
                "type", "doc",
                "content", content
        );
    }

    private Map<String, Object> adfParagraph(String text) {
        return Map.of(
                "type", "paragraph",
                "content", List.of(Map.of("type", "text", "text", text))
        );
    }

    private Map<String, Object> adfHeading(String text) {
        return Map.of(
                "type", "heading",
                "attrs", Map.of("level", 3),
                "content", List.of(Map.of("type", "text", "text", text))
        );
    }

    /**
     * Resolve ScopeSmith category to Jira Component name.
     * Uses explicit mapping if configured, otherwise returns category name as-is
     * (Jira will silently ignore if Component doesn't exist).
     */
    private String resolveComponentName(String category, IntegrationConfigDTO.JiraSettings settings) {
        if (settings != null && settings.getCategoryMapping() != null) {
            // Explicit mapping configured
            String mapped = settings.getCategoryMapping().get(category.toUpperCase(java.util.Locale.ENGLISH));
            if (mapped != null) return mapped;
        }
        // Default: use category name with first letter uppercase (e.g., "Backend")
        return category.substring(0, 1).toUpperCase(java.util.Locale.ENGLISH) + category.substring(1).toLowerCase(java.util.Locale.ENGLISH);
    }

    private IntegrationConfigDTO parseIntegrationConfig(String json) {
        if (json == null || json.isBlank()) return null;
        try {
            return new ObjectMapper().readValue(json, IntegrationConfigDTO.class);
        } catch (Exception e) {
            return null;
        }
    }

    private String firstNonBlank(String... values) {
        for (String v : values) {
            if (v != null && !v.isBlank()) return v;
        }
        return null;
    }

    /**
     * Close a Jira issue by adding a comment and attempting transition to "Done".
     */
    public void closeIssue(String jiraKey) {
        if (jiraConfig.getUrl() == null || jiraConfig.getEmail() == null || jiraConfig.getApiToken() == null) {
            log.warn("Cannot close Jira issue {}: credentials not configured", jiraKey);
            return;
        }

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBasicAuth(jiraConfig.getEmail(), jiraConfig.getApiToken(), StandardCharsets.UTF_8);

            // Add comment
            String commentUrl = jiraConfig.getUrl() + "/rest/api/3/issue/" + jiraKey + "/comment";
            Map<String, Object> commentBody = Map.of("body", Map.of(
                    "type", "doc", "version", 1,
                    "content", List.of(Map.of("type", "paragraph",
                            "content", List.of(Map.of("type", "text",
                                    "text", "Bu görev ScopeSmith'te kaldırıldı/değiştirildi."))))));
            restTemplate.exchange(commentUrl, HttpMethod.POST,
                    new HttpEntity<>(commentBody, headers), Map.class);

            log.info("Commented on Jira issue {} before close", jiraKey);
        } catch (Exception e) {
            log.warn("Failed to close Jira issue {}: {}", jiraKey, e.getMessage());
        }
    }
}
