package com.scopesmith.controller;

import com.scopesmith.dto.AnalysisResponse;
import com.scopesmith.dto.SyncPolicyCheckResponse;
import com.scopesmith.dto.TaskRefineResponse;
import com.scopesmith.dto.TaskResponse;
import com.scopesmith.entity.Analysis;
import com.scopesmith.entity.Task;
import com.scopesmith.repository.AnalysisRepository;
import com.scopesmith.repository.TaskRepository;
import com.scopesmith.service.GitHubService;
import com.scopesmith.service.JiraExportService;
import com.scopesmith.service.JiraService;
import com.scopesmith.service.ResourceAccessService;
import com.scopesmith.service.RequirementAnalysisService;
import com.scopesmith.service.StakeholderSummaryService;
import com.scopesmith.service.SyncPolicyGateService;
import com.scopesmith.service.TaskBreakdownService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/analyses")
@RequiredArgsConstructor
public class AnalysisController {

    private final TaskBreakdownService taskBreakdownService;
    private final RequirementAnalysisService requirementAnalysisService;
    private final StakeholderSummaryService stakeholderSummaryService;
    private final GitHubService gitHubService;
    private final JiraExportService jiraExportService;
    private final JiraService jiraService;
    private final SyncPolicyGateService syncPolicyGateService;
    private final AnalysisRepository analysisRepository;
    private final TaskRepository taskRepository;
    private final ResourceAccessService resourceAccessService;

    @GetMapping("/{id}")
    public AnalysisResponse getAnalysis(@PathVariable Long id) {
        resourceAccessService.assertAnalysisAccess(id);
        Analysis analysis = analysisRepository.findByIdWithRequirement(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Analysis not found"));
        return AnalysisResponse.from(analysis);
    }

    @GetMapping("/{id}/tasks")
    public List<TaskResponse> getTasks(@PathVariable Long id) {
        resourceAccessService.assertAnalysisAccess(id);
        List<Task> tasks = taskRepository.findByAnalysisId(id);
        return tasks.stream().map(TaskResponse::from).toList();
    }

    @PostMapping("/{id}/tasks")
    public List<TaskResponse> generateTasks(@PathVariable Long id) {
        resourceAccessService.assertAnalysisEdit(id);
        return taskBreakdownService.generateTasks(id);
    }

    @PostMapping("/{id}/tasks/manual")
    public TaskResponse createManualTask(
            @PathVariable Long id,
            @RequestBody Map<String, String> request) {
        resourceAccessService.assertAnalysisEdit(id);
        Analysis analysis = analysisRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Analysis not found"));

        String title = request.get("title");
        if (title == null || title.isBlank()) {
            throw new IllegalArgumentException("title cannot be empty");
        }

        com.scopesmith.entity.TaskPriority priority;
        try {
            String p = request.get("priority");
            priority = (p != null && !p.isBlank())
                    ? com.scopesmith.entity.TaskPriority.valueOf(p.toUpperCase(java.util.Locale.ENGLISH))
                    : com.scopesmith.entity.TaskPriority.MEDIUM;
        } catch (IllegalArgumentException e) {
            priority = com.scopesmith.entity.TaskPriority.MEDIUM;
        }

        com.scopesmith.entity.Task task = com.scopesmith.entity.Task.builder()
                .analysis(analysis)
                .title(title.trim())
                .description(request.get("description"))
                .category(request.get("category"))
                .priority(priority)
                .build();

        task = taskRepository.save(task);
        return TaskResponse.from(task);
    }

    @PostMapping("/{id}/tasks/refine")
    public TaskRefineResponse refineTasks(
            @PathVariable Long id,
            @RequestBody Map<String, String> request) {
        resourceAccessService.assertAnalysisEdit(id);
        String instruction = extractInstruction(request);
        return taskBreakdownService.refineTasks(id, instruction);
    }

    @PostMapping("/{id}/refine")
    public AnalysisResponse refineAnalysis(
            @PathVariable Long id,
            @RequestBody Map<String, String> request) {
        resourceAccessService.assertAnalysisEdit(id);
        String instruction = extractInstruction(request);
        Analysis refined = requirementAnalysisService.refineAnalysis(id, instruction);
        return AnalysisResponse.from(refined);
    }

    @PostMapping("/{id}/stakeholder-summary")
    public Map<String, String> generateStakeholderSummary(@PathVariable Long id) {
        resourceAccessService.assertAnalysisEdit(id);
        String summary = stakeholderSummaryService.generateSummary(id);
        return Map.of("summary", summary);
    }

    @PostMapping("/{id}/stakeholder-summary/refine")
    public Map<String, String> refineStakeholderSummary(
            @PathVariable Long id,
            @RequestBody Map<String, String> request) {
        resourceAccessService.assertAnalysisEdit(id);
        String instruction = extractInstruction(request);
        String refined = stakeholderSummaryService.refineSummary(id, instruction);
        return Map.of("summary", refined);
    }

    @PostMapping("/{id}/sync/jira")
    public Map<String, Object> syncToJira(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, Object> request) {
        resourceAccessService.assertAnalysisEdit(id);
        String projectKey = request != null ? (String) request.get("projectKey") : null;
        String issueType = request != null ? (String) request.get("issueType") : null;
        List<Long> taskIds = extractTaskIds(request);
        syncPolicyGateService.assertCanSyncForProvider(
                id, taskIds, SyncPolicyGateService.SyncProvider.JIRA, projectKey);
        return jiraService.syncTasksToJira(id, projectKey, issueType != null ? issueType : "Task", taskIds);
    }

    @PostMapping("/{id}/sync/github")
    public Map<String, Object> syncToGitHub(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, Object> request) {
        resourceAccessService.assertAnalysisEdit(id);
        String repo = request != null ? (String) request.get("repo") : null;
        List<Long> taskIds = extractTaskIds(request);
        syncPolicyGateService.assertCanSyncForProvider(
                id, taskIds, SyncPolicyGateService.SyncProvider.GITHUB, repo);
        return gitHubService.syncTasksToGitHub(id, repo, taskIds);
    }

    @GetMapping("/{id}/sync/policy-check")
    public SyncPolicyCheckResponse checkSyncPolicy(
            @PathVariable Long id,
            @RequestParam(required = false) List<Long> taskIds,
            @RequestParam(required = false) String provider,
            @RequestParam(required = false) String target) {
        resourceAccessService.assertAnalysisEdit(id);
        if (provider == null || provider.isBlank()) {
            return syncPolicyGateService.evaluate(id, taskIds);
        }
        SyncPolicyGateService.SyncProvider syncProvider = SyncPolicyGateService.SyncProvider.valueOf(
                provider.trim().toUpperCase(java.util.Locale.ENGLISH)
        );
        return syncPolicyGateService.evaluateForProvider(id, taskIds, syncProvider, target);
    }

    @PostMapping("/{id}/sync/verify")
    public Map<String, Object> verifySyncStatus(@PathVariable Long id) {
        resourceAccessService.assertAnalysisEdit(id);
        Map<String, Object> result = new LinkedHashMap<>();
        try {
            Map<String, Object> jiraResult = jiraService.verifySyncStatus(id);
            result.put("jira", jiraResult);
        } catch (Exception e) {
            result.put("jira", Map.of("error", e.getMessage()));
        }
        try {
            Map<String, Object> githubResult = gitHubService.verifySyncStatus(id);
            result.put("github", githubResult);
        } catch (Exception e) {
            result.put("github", Map.of("error", e.getMessage()));
        }
        return result;
    }

    @GetMapping("/{id}/export/jira-csv")
    public ResponseEntity<byte[]> exportJiraCsv(
            @PathVariable Long id,
            @RequestParam String projectKey,
            @RequestParam(defaultValue = "Story") String issueType) {
        resourceAccessService.assertAnalysisAccess(id);
        if (projectKey == null || projectKey.isBlank()) {
            throw new IllegalArgumentException("projectKey cannot be empty");
        }

        byte[] csv = jiraExportService.exportTasksAsCsv(id, projectKey.trim(), issueType.trim());
        String filename = String.format("scopesmith-%s-%d.csv", projectKey.trim(), id);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(new MediaType("text", "csv", java.nio.charset.StandardCharsets.UTF_8))
                .body(csv);
    }

    private String extractInstruction(Map<String, String> request) {
        String instruction = request.get("instruction");
        if (instruction == null || instruction.isBlank()) {
            throw new IllegalArgumentException("instruction cannot be empty");
        }
        if (instruction.length() > 1000) {
            throw new IllegalArgumentException("instruction too long (max 1000 characters)");
        }
        return instruction.trim();
    }

    private List<Long> extractTaskIds(Map<String, Object> request) {
        if (request == null || !(request.get("taskIds") instanceof java.util.List<?> raw)) {
            return null;
        }
        return raw.stream()
                .filter(Number.class::isInstance)
                .map(Number.class::cast)
                .map(Number::longValue)
                .toList();
    }
}
