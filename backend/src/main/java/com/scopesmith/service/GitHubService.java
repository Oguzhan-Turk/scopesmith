package com.scopesmith.service;

import com.scopesmith.config.GitHubConfig;
import com.scopesmith.service.ClaudeCodeService;
import com.scopesmith.dto.IntegrationConfigDTO;
import com.scopesmith.entity.Analysis;
import com.scopesmith.entity.RequirementType;
import com.scopesmith.entity.SyncProviderType;
import com.scopesmith.entity.Task;
import com.scopesmith.entity.TaskSyncRef;
import com.scopesmith.repository.AnalysisRepository;
import com.scopesmith.repository.TaskRepository;
import com.scopesmith.repository.TaskSyncRefRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.util.*;

@Service
@Slf4j
public class GitHubService {

    private final GitHubConfig gitHubConfig;
    private final TaskRepository taskRepository;
    private final AnalysisRepository analysisRepository;
    private final TaskSyncRefRepository taskSyncRefRepository;
    private final TaskSyncRefService taskSyncRefService;
    private final ClaudeCodeService claudeCodeService;
    private final RestTemplate restTemplate;

    public GitHubService(GitHubConfig gitHubConfig, TaskRepository taskRepository,
                         AnalysisRepository analysisRepository,
                         TaskSyncRefRepository taskSyncRefRepository,
                         TaskSyncRefService taskSyncRefService,
                         ClaudeCodeService claudeCodeService,
                         RestTemplateBuilder restTemplateBuilder) {
        this.gitHubConfig = gitHubConfig;
        this.taskRepository = taskRepository;
        this.analysisRepository = analysisRepository;
        this.taskSyncRefRepository = taskSyncRefRepository;
        this.taskSyncRefService = taskSyncRefService;
        this.claudeCodeService = claudeCodeService;
        this.restTemplate = restTemplateBuilder
                .connectTimeout(Duration.ofSeconds(10))
                .readTimeout(Duration.ofSeconds(30))
                .build();
    }

    private static final Map<String, String> PRIORITY_LABELS = Map.of(
            "LOW", "priority: low",
            "MEDIUM", "priority: medium",
            "HIGH", "priority: high",
            "CRITICAL", "priority: critical"
    );

    @Transactional
    public Map<String, Object> syncTasksToGitHub(Long analysisId, String repo, List<Long> taskIds) {
        if (!gitHubConfig.isConfigured()) {
            throw new IllegalStateException("GitHub is not configured. Set GITHUB_TOKEN and GITHUB_REPO.");
        }

        Analysis analysis = analysisRepository.findById(analysisId)
                .orElseThrow(() -> new EntityNotFoundException("Analysis not found: " + analysisId));

        List<Task> allTasks = taskRepository.findByAnalysisId(analysisId);
        // Filter: only SP-approved tasks. If taskIds specified, further restrict to those.
        java.util.Set<Long> requestedIds = taskIds != null && !taskIds.isEmpty()
                ? new java.util.HashSet<>(taskIds) : null;
        List<Task> tasks = allTasks.stream()
                .filter(t -> t.getSpFinal() != null)
                .filter(t -> requestedIds == null || requestedIds.contains(t.getId()))
                .toList();
        if (tasks.isEmpty()) {
            throw new IllegalStateException("No SP-approved tasks to sync for analysis #" + analysisId
                    + ". Approve story points before syncing.");
        }

        // Resolve config: request param → project integration config → server config (.env)
        IntegrationConfigDTO projectConfig = parseIntegrationConfig(analysis.getRequirement().getProject().getIntegrationConfig());
        String configRepo = projectConfig != null && projectConfig.getGithub() != null
                ? projectConfig.getGithub().getRepo() : null;
        boolean isBug = analysis.getRequirement().getType() == RequirementType.BUG;

        List<Map<String, String>> created = new ArrayList<>();
        List<Map<String, String>> failed = new ArrayList<>();
        Set<String> preparedRepos = new HashSet<>();

        for (Task task : tasks) {
            if (task.getJiraKey() != null && task.getJiraKey().startsWith("#")) {
                // Already synced to GitHub (we store as #123)
                created.add(Map.of("taskId", task.getId().toString(), "issueNumber", task.getJiraKey(), "status", "already_synced"));
                continue;
            }

            try {
                String targetRepo = resolveTargetRepo(task, projectConfig, repo, configRepo, gitHubConfig.getRepo());
                if (targetRepo == null || targetRepo.isBlank()) {
                    throw new IllegalStateException("GitHub target repo could not be resolved for task #" + task.getId());
                }
                if (preparedRepos.add(targetRepo)) {
                    ensureLabelsExist(targetRepo, isBug);
                }

                String issueNumber = createGitHubIssue(task, targetRepo, isBug);
                task.setJiraKey(issueNumber); // Reuse jiraKey field for GitHub issue number
                taskRepository.save(task);
                taskSyncRefService.upsert(task, SyncProviderType.GITHUB, targetRepo, issueNumber);
                created.add(Map.of(
                        "taskId", task.getId().toString(),
                        "issueNumber", issueNumber,
                        "targetRepo", targetRepo,
                        "status", "created"));
                log.info("Created GitHub issue {} for task #{} '{}' on {}", issueNumber, task.getId(), task.getTitle(), targetRepo);
            } catch (Exception e) {
                log.error("Failed to create GitHub issue for task #{}: {}", task.getId(), e.getMessage(), e);
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
     * Verify sync status — check if GitHub issues still exist and are open.
     * Clears jiraKey for closed/deleted issues.
     */
    @Transactional
    public Map<String, Object> verifySyncStatus(Long analysisId) {
        List<TaskSyncRef> syncedRefs = taskSyncRefRepository.findByAnalysisIdAndProvider(analysisId, SyncProviderType.GITHUB).stream()
                .filter(r -> "SYNCED".equalsIgnoreCase(r.getSyncState()))
                .toList();

        if (syncedRefs.isEmpty()) {
            return Map.of("checked", 0, "cleared", 0);
        }

        Analysis analysis = analysisRepository.findById(analysisId)
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("Analysis not found"));

        IntegrationConfigDTO config = parseIntegrationConfig(analysis.getRequirement().getProject().getIntegrationConfig());
        String repo = firstNonBlank(
                config != null && config.getGithub() != null ? config.getGithub().getRepo() : null,
                gitHubConfig.getRepo()
        );

        int cleared = 0;
        for (TaskSyncRef ref : syncedRefs) {
            Task task = ref.getTask();
            String issueNumber = ref.getExternalRef().replace("#", "");
            try {
                String effectiveRepo = firstNonBlank(ref.getTarget(), repo);
                String url = "https://api.github.com/repos/" + effectiveRepo + "/issues/" + issueNumber;
                HttpHeaders headers = new HttpHeaders();
                headers.setBearerAuth(gitHubConfig.getToken());
                headers.set("Accept", "application/vnd.github+json");

                ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, new HttpEntity<>(headers), Map.class);
                String state = (String) response.getBody().get("state");

                if ("closed".equals(state)) {
                    taskSyncRefService.markCleared(ref);
                    if (task.getJiraKey() != null && task.getJiraKey().equals(ref.getExternalRef())) {
                        task.setJiraKey(null);
                        taskRepository.save(task);
                    }
                    cleared++;
                    log.info("Cleared sync for task #{} — GitHub issue {} is closed", task.getId(), ref.getExternalRef());
                }
            } catch (Exception e) {
                // Issue not found (404) or other error — clear sync
                taskSyncRefService.markCleared(ref);
                if (task.getJiraKey() != null && task.getJiraKey().equals(ref.getExternalRef())) {
                    task.setJiraKey(null);
                    taskRepository.save(task);
                }
                cleared++;
                log.info("Cleared sync for task #{} — GitHub issue not accessible: {}", task.getId(), e.getMessage());
            }
        }

        return Map.of("checked", syncedRefs.size(), "cleared", cleared, "stillSynced", syncedRefs.size() - cleared);
    }

    private String createGitHubIssue(Task task, String repo, boolean isBug) {
        String url = "https://api.github.com/repos/" + repo + "/issues";

        List<String> labels = new ArrayList<>();
        labels.add("scopesmith");
        labels.add(isBug ? "bug" : "enhancement");
        String priorityLabel = PRIORITY_LABELS.get(task.getPriority().name());
        if (priorityLabel != null) {
            labels.add(priorityLabel);
        }
        if (task.getCategory() != null && !task.getCategory().isBlank()) {
            labels.add("category: " + task.getCategory().toLowerCase(java.util.Locale.ENGLISH));
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("title", task.getTitle());
        body.put("body", buildMarkdownBody(task));
        body.put("labels", labels);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(gitHubConfig.getToken());
        headers.set("Accept", "application/vnd.github+json");

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
        ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.POST, request, Map.class);

        if (response.getBody() == null || !response.getBody().containsKey("number")) {
            throw new RuntimeException("GitHub did not return issue number");
        }

        return "#" + response.getBody().get("number");
    }

    private String buildMarkdownBody(Task task) {
        StringBuilder md = new StringBuilder();

        if (task.getDescription() != null) {
            md.append(task.getDescription()).append("\n\n");
        }

        if (task.getAcceptanceCriteria() != null && !task.getAcceptanceCriteria().isBlank()) {
            md.append("### Kabul Kriterleri\n");
            md.append(task.getAcceptanceCriteria()).append("\n\n");
        }

        Integer sp = task.getSpFinal() != null ? task.getSpFinal() : task.getSpSuggestion();
        if (sp != null) {
            md.append("**Story Points:** ").append(sp).append(" SP\n\n");
        }

        if (task.getSpRationale() != null && !task.getSpRationale().isBlank()) {
            md.append("### SP Gerekçesi\n");
            md.append(task.getSpRationale()).append("\n\n");
        }

        if (task.getDependency() != null) {
            md.append("**Bağımlılık:** ").append(task.getDependency().getTitle()).append("\n\n");
        }

        // Claude Code implementation prompt
        try {
            String prompt = claudeCodeService.buildPrompt(task.getId());
            if (prompt != null && !prompt.isBlank()) {
                md.append("### Claude Code Geliştirme Promptu\n\n");
                md.append("```\n").append(prompt).append("\n```\n\n");
            }
        } catch (Exception e) {
            log.warn("Could not build Claude Code prompt for task #{}: {}", task.getId(), e.getMessage());
        }

        md.append("---\n_Bu issue [ScopeSmith](https://github.com/Oguzhan-Turk/scopesmith) tarafından otomatik oluşturulmuştur._");

        return md.toString();
    }

    private void ensureLabelsExist(String repo, boolean isBug) {
        String[] labels = {"scopesmith", isBug ? "bug" : "enhancement",
                "priority: low", "priority: medium", "priority: high", "priority: critical",
                "category: backend", "category: frontend", "category: mobile",
                "category: database", "category: devops", "category: testing", "category: fullstack"};

        for (String label : labels) {
            try {
                createLabel(repo, label);
            } catch (Exception e) {
                // Label already exists, ignore
            }
        }
    }

    private void createLabel(String repo, String name) {
        String url = "https://api.github.com/repos/" + repo + "/labels";

        String color = switch (name) {
            case "scopesmith" -> "7C3AED";
            case "bug" -> "d73a4a";
            case "enhancement" -> "a2eeef";
            case "priority: critical" -> "B60205";
            case "priority: high" -> "D93F0B";
            case "priority: medium" -> "FBCA04";
            case "priority: low" -> "0E8A16";
            case "category: backend" -> "0052CC";
            case "category: frontend" -> "00875A";
            case "category: mobile" -> "6554C0";
            case "category: database" -> "FF991F";
            case "category: devops" -> "403294";
            case "category: testing" -> "00B8D9";
            case "category: fullstack" -> "36B37E";
            default -> "CCCCCC";
        };

        Map<String, String> body = Map.of("name", name, "color", color);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(gitHubConfig.getToken());
        headers.set("Accept", "application/vnd.github+json");

        restTemplate.exchange(url, HttpMethod.POST, new HttpEntity<>(body, headers), Map.class);
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

    private String resolveTargetRepo(
            Task task,
            IntegrationConfigDTO projectConfig,
            String requestRepo,
            String globalConfigRepo,
            String envDefaultRepo) {
        if (requestRepo != null && !requestRepo.isBlank()) {
            return requestRepo;
        }
        IntegrationConfigDTO.ServiceRouting route = findServiceRouting(projectConfig, task);
        if (route != null && route.getGithubRepo() != null && !route.getGithubRepo().isBlank()) {
            return route.getGithubRepo();
        }
        return firstNonBlank(globalConfigRepo, envDefaultRepo);
    }

    private IntegrationConfigDTO.ServiceRouting findServiceRouting(IntegrationConfigDTO projectConfig, Task task) {
        if (projectConfig == null || projectConfig.getServiceRouting() == null
                || task.getService() == null || task.getService().getName() == null) {
            return null;
        }
        String serviceName = task.getService().getName();
        IntegrationConfigDTO.ServiceRouting exact = projectConfig.getServiceRouting().get(serviceName);
        if (exact != null) return exact;
        for (var entry : projectConfig.getServiceRouting().entrySet()) {
            if (entry.getKey() != null && entry.getKey().equalsIgnoreCase(serviceName)) {
                return entry.getValue();
            }
        }
        return null;
    }

    /**
     * Close a GitHub issue with a comment.
     */
    public void closeIssue(String repo, String issueRef) {
        String token = gitHubConfig.getToken();
        String targetRepo = firstNonBlank(repo, gitHubConfig.getRepo());
        if (token == null || token.isBlank() || targetRepo == null) {
            log.warn("Cannot close GitHub issue {}: credentials not configured", issueRef);
            return;
        }

        try {
            String number = issueRef.replace("#", "");
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(token);
            headers.setContentType(MediaType.APPLICATION_JSON);

            // Add comment
            String commentUrl = "https://api.github.com/repos/" + targetRepo + "/issues/" + number + "/comments";
            restTemplate.exchange(commentUrl, HttpMethod.POST,
                    new HttpEntity<>(Map.of("body", "Bu görev ScopeSmith'te kaldırıldı/değiştirildi."), headers), Map.class);

            // Close issue
            String closeUrl = "https://api.github.com/repos/" + targetRepo + "/issues/" + number;
            restTemplate.exchange(closeUrl, HttpMethod.PATCH,
                    new HttpEntity<>(Map.of("state", "closed"), headers), Map.class);

            log.info("Closed GitHub issue {} on {}", issueRef, targetRepo);
        } catch (Exception e) {
            log.warn("Failed to close GitHub issue {}: {}", issueRef, e.getMessage());
        }
    }
}
