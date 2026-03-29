package com.scopesmith.service;

import com.scopesmith.config.JiraConfig;
import com.scopesmith.entity.Task;
import com.scopesmith.repository.AnalysisRepository;
import com.scopesmith.repository.TaskRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.nio.charset.StandardCharsets;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class JiraService {

    private final JiraConfig jiraConfig;
    private final TaskRepository taskRepository;
    private final AnalysisRepository analysisRepository;
    private final RestTemplate restTemplate = new RestTemplate();

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

        analysisRepository.findById(analysisId)
                .orElseThrow(() -> new EntityNotFoundException("Analysis not found: " + analysisId));

        List<Task> tasks = taskRepository.findByAnalysisId(analysisId);
        if (tasks.isEmpty()) {
            throw new IllegalStateException("No tasks to sync for analysis #" + analysisId);
        }

        String project = (projectKey != null && !projectKey.isBlank()) ? projectKey : jiraConfig.getProjectKey();
        String type = (issueType != null && !issueType.isBlank()) ? issueType : "Task";

        List<Map<String, String>> created = new ArrayList<>();
        List<Map<String, String>> failed = new ArrayList<>();

        for (Task task : tasks) {
            if (task.getJiraKey() != null) {
                // Already synced, skip
                created.add(Map.of("taskId", task.getId().toString(), "jiraKey", task.getJiraKey(), "status", "already_synced"));
                continue;
            }

            try {
                String jiraKey = createJiraIssue(task, project, type);
                task.setJiraKey(jiraKey);
                taskRepository.save(task);
                created.add(Map.of("taskId", task.getId().toString(), "jiraKey", jiraKey, "status", "created"));
                log.info("Created Jira issue {} for task #{} '{}'", jiraKey, task.getId(), task.getTitle());
            } catch (Exception e) {
                log.error("Failed to create Jira issue for task #{}: {}", task.getId(), e.getMessage());
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

    private String createJiraIssue(Task task, String projectKey, String issueType) {
        String url = jiraConfig.getUrl() + "/rest/api/3/issue";

        Map<String, Object> fields = new LinkedHashMap<>();
        fields.put("project", Map.of("key", projectKey));
        fields.put("summary", task.getTitle());
        fields.put("issuetype", Map.of("name", issueType));
        fields.put("description", buildAdfDescription(task));
        fields.put("priority", Map.of("name", PRIORITY_MAP.getOrDefault(task.getPriority().name(), "Medium")));
        fields.put("labels", List.of("scopesmith"));

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
}
