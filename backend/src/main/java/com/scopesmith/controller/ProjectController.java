package com.scopesmith.controller;

import com.scopesmith.dto.IntegrationConfigDTO;
import com.scopesmith.dto.PartialRefreshHistoryResponse;
import com.scopesmith.dto.PartialRefreshStatusResponse;
import com.scopesmith.dto.ProjectRequest;
import com.scopesmith.dto.ProjectResponse;
import com.scopesmith.dto.TaskResponse;
import com.scopesmith.dto.ContextFreshnessResponse;
import com.scopesmith.dto.TraceabilityResponse;
import com.scopesmith.entity.Analysis;
import com.scopesmith.entity.Project;
import com.scopesmith.repository.AnalysisRepository;
import com.scopesmith.dto.FeatureSuggestionResult;
import com.scopesmith.entity.ProjectRole;
import com.scopesmith.service.ContextFreshnessService;
import com.scopesmith.service.FeatureSuggestionService;
import com.scopesmith.service.GitCloneService;
import com.scopesmith.service.ProjectAccessService;
import com.scopesmith.service.InsightService;
import com.scopesmith.service.ProjectContextService;
import com.scopesmith.service.ProjectService;
import com.scopesmith.service.PartialRefreshStatusService;
import com.scopesmith.service.RequirementAnalysisService;
import com.scopesmith.service.ScanSecurityService;
import com.scopesmith.service.ScanStatusService;
import com.scopesmith.service.TraceabilityService;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;
import org.springframework.core.task.TaskRejectedException;

@Slf4j
@RestController
@RequestMapping("/api/v1/projects")
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectService projectService;
    private final ProjectContextService contextService;
    private final RequirementAnalysisService requirementAnalysisService;
    private final GitCloneService gitCloneService;
    private final InsightService insightService;
    private final ContextFreshnessService contextFreshnessService;
    private final PartialRefreshStatusService partialRefreshStatusService;
    private final ScanStatusService scanStatusService;
    private final ScanSecurityService scanSecurityService;
    private final FeatureSuggestionService featureSuggestionService;
    private final TraceabilityService traceabilityService;
    private final ProjectAccessService projectAccessService;
    private final AnalysisRepository analysisRepository;
    private final ObjectMapper objectMapper;
    @Qualifier("scanExecutor")
    private final Executor scanExecutor;
    @Qualifier("partialRefreshExecutor")
    private final Executor partialRefreshExecutor;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ProjectResponse create(@Valid @RequestBody ProjectRequest request) {
        return projectService.create(request);
    }

    @GetMapping
    public List<ProjectResponse> findAll() {
        return projectService.findAll();
    }

    @GetMapping("/{id}")
    public ProjectResponse findById(@PathVariable Long id) {
        Project project = projectService.getProjectOrThrow(id);
        InsightService.StalenessInfo staleness = insightService.getStalenessInfo(project);
        return ProjectResponse.from(project, staleness);
    }

    @PutMapping("/{id}")
    public ProjectResponse update(@PathVariable Long id, @Valid @RequestBody ProjectRequest request) {
        return projectService.update(id, request);
    }

    @GetMapping("/{id}/delete-summary")
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMIN')")
    public Map<String, Long> getDeleteSummary(@PathVariable Long id) {
        return projectService.getDeleteSummary(id);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMIN')")
    public void delete(@PathVariable Long id, @RequestBody(required = false) Map<String, String> body) {
        String confirmName = body != null ? body.get("confirmName") : null;
        if (confirmName == null || confirmName.isBlank()) {
            throw new org.springframework.web.server.ResponseStatusException(
                HttpStatus.BAD_REQUEST, "confirmName zorunludur.");
        }
        projectService.deleteWithConfirmation(id, confirmName);
    }

    @GetMapping("/{id}/integration-config")
    public IntegrationConfigDTO getIntegrationConfig(@PathVariable Long id) {
        Project project = projectService.getProjectOrThrow(id);
        if (project.getIntegrationConfig() == null) {
            return new IntegrationConfigDTO();
        }
        try {
            return objectMapper.readValue(project.getIntegrationConfig(), IntegrationConfigDTO.class);
        } catch (Exception e) {
            return new IntegrationConfigDTO();
        }
    }

    @PutMapping("/{id}/integration-config")
    public IntegrationConfigDTO updateIntegrationConfig(
            @PathVariable Long id,
            @jakarta.validation.Valid @RequestBody IntegrationConfigDTO config) {
        Project project = projectService.getProjectOrThrow(id);
        try {
            project.setIntegrationConfig(objectMapper.writeValueAsString(config));
            projectService.save(project);
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid integration config");
        }
        return config;
    }

    /**
     * Get all task groups for a project — grouped by analysis, ordered by newest first.
     */
    @GetMapping("/{id}/task-groups")
    public List<java.util.Map<String, Object>> getTaskGroups(@PathVariable Long id) {
        List<Analysis> analyses = analysisRepository.findByProjectId(id);
        List<java.util.Map<String, Object>> groups = new java.util.ArrayList<>();

        for (Analysis a : analyses) {
            if (a.getTasks().isEmpty()) continue;

            java.util.Map<String, Object> group = new java.util.LinkedHashMap<>();
            group.put("analysisId", a.getId());
            group.put("requirementId", a.getRequirement().getId());
            group.put("requirementText", truncate(a.getRequirement().getRawText(), 100));
            group.put("requirementType", a.getRequirement().getType() != null ? a.getRequirement().getType().name() : "FEATURE");
            group.put("requirementSeq", a.getRequirement().getSequenceNumber());
            group.put("riskLevel", a.getRiskLevel());
            group.put("createdAt", a.getCreatedAt());
            group.put("taskCount", a.getTasks().size());
            group.put("totalSp", a.getTasks().stream()
                    .mapToInt(t -> t.getSpFinal() != null ? t.getSpFinal() :
                            (t.getSpSuggestion() != null ? t.getSpSuggestion() : 0))
                    .sum());
            group.put("tasks", a.getTasks().stream().map(TaskResponse::from).toList());
            groups.add(group);
        }

        return groups;
    }

    private String truncate(String text, int max) {
        if (text == null) return "";
        return text.length() > max ? text.substring(0, max) + "..." : text;
    }

    /**
     * Returns current scan status for a project.
     */
    @GetMapping("/{id}/scan-status")
    public Map<String, String> getScanStatus(@PathVariable Long id) {
        var state = scanStatusService.getState(id);
        return Map.of(
            "status", state.status().name(),
            "error", state.error() != null ? state.error() : ""
        );
    }

    @GetMapping("/{id}/context-freshness")
    public ContextFreshnessResponse getContextFreshness(@PathVariable Long id) {
        Project project = projectService.getProjectOrThrow(id);
        return contextFreshnessService.evaluate(project);
    }

    @GetMapping("/{id}/traceability")
    public TraceabilityResponse getTraceability(@PathVariable Long id) {
        projectService.getProjectOrThrow(id);
        return traceabilityService.buildProjectTraceability(id);
    }

    @GetMapping("/{id}/context-freshness/partial-refresh-status")
    public PartialRefreshStatusResponse getPartialRefreshStatus(@PathVariable Long id) {
        projectService.getProjectOrThrow(id);
        return partialRefreshStatusService.toResponse(id);
    }

    @GetMapping("/{id}/context-freshness/partial-refresh-jobs")
    public PartialRefreshHistoryResponse getPartialRefreshJobs(
            @PathVariable Long id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "5") int size) {
        projectService.getProjectOrThrow(id);
        return partialRefreshStatusService.toHistory(id, page, size);
    }

    @PostMapping("/{id}/context-freshness/partial-refresh")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public PartialRefreshStatusResponse runPartialRefresh(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, Object> request) {
        Project project = projectService.getProjectOrThrow(id);
        ContextFreshnessResponse freshness = contextFreshnessService.evaluate(project);

        int maxAnalyses = 5;
        boolean force = false;
        if (request != null) {
            Object maxRaw = request.get("maxAnalyses");
            if (maxRaw instanceof Number n) {
                maxAnalyses = Math.max(1, Math.min(n.intValue(), 20));
            }
            Object forceRaw = request.get("force");
            if (forceRaw instanceof Boolean b) {
                force = b;
            }
        }

        if ("NO_ACTION".equals(freshness.getRecommendation())) {
            partialRefreshStatusService.createDoneJob(project, "NO_ACTION", 0, 0, List.of());
            return partialRefreshStatusService.toResponse(id);
        }

        if ("FULL_REFRESH".equals(freshness.getRecommendation()) && !force) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Context confidence düşük. Partial refresh yerine tam tarama öneriliyor.");
        }

        List<Analysis> impacted = contextFreshnessService.findImpactedLatestAnalyses(
                id, freshness.getImpactedModules(), maxAnalyses
        );

        if (impacted.isEmpty()) {
            partialRefreshStatusService.createDoneJob(project, freshness.getRecommendation(), 0, 0, List.of());
            return partialRefreshStatusService.toResponse(id);
        }

        var job = partialRefreshStatusService.tryStart(project, freshness.getRecommendation(), impacted.size());
        if (job == null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Bu proje için partial refresh zaten devam ediyor.");
        }

        try {
            CompletableFuture.runAsync(() -> {
                int processed = 0;
                int refreshed = 0;
                List<Long> refreshedRequirementIds = new java.util.ArrayList<>();
                try {
                    for (Analysis analysis : impacted) {
                        requirementAnalysisService.analyze(analysis.getRequirement().getId());
                        processed++;
                        refreshed++;
                        refreshedRequirementIds.add(analysis.getRequirement().getId());
                        partialRefreshStatusService.setProgress(job.getId(), processed, refreshed, refreshedRequirementIds);
                    }
                    partialRefreshStatusService.setDone(job.getId(), processed, refreshed, refreshedRequirementIds);
                } catch (Exception e) {
                    log.error("Partial refresh failed for project {}: {}", id, e.getMessage(), e);
                    partialRefreshStatusService.setFailed(job.getId(), e.getMessage());
                }
            }, partialRefreshExecutor);
        } catch (TaskRejectedException e) {
            partialRefreshStatusService.setFailed(job.getId(), "Partial refresh queue is full. Please try again shortly.");
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "Sistem yoğun. Partial refresh kuyruğu dolu, lütfen kısa süre sonra tekrar deneyin.");
        }

        return partialRefreshStatusService.toResponse(id);
    }

    /**
     * Scan a local folder to generate project context (async — returns 202 immediately).
     */
    @PostMapping("/{id}/scan")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public Map<String, String> scanLocalFolder(
            @PathVariable Long id,
            @RequestBody java.util.Map<String, String> request) {
        String folderPath = request.get("folderPath");
        String safeFolderPath = scanSecurityService.validateLocalFolderPath(folderPath);
        if (!scanStatusService.trySetScanning(id)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Bu proje için tarama zaten devam ediyor");
        }
        try {
            CompletableFuture.runAsync(() -> {
                try {
                    contextService.scanLocalFolder(id, safeFolderPath);
                    scanStatusService.setDone(id);
                } catch (Exception e) {
                    log.error("Scan failed for project {}: {}", id, e.getMessage());
                    scanStatusService.setFailed(id, e.getMessage());
                }
            }, scanExecutor);
        } catch (TaskRejectedException e) {
            scanStatusService.setFailed(id, "Scan queue is full. Please try again shortly.");
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "Sistem yoğun. Tarama kuyruğu dolu, lütfen kısa süre sonra tekrar deneyin.");
        }
        return Map.of("status", "SCANNING");
    }

    /**
     * Clone a git repo and scan it for project context (async — returns 202 immediately).
     */
    @PostMapping("/{id}/scan-git")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public Map<String, String> scanGitRepo(
            @PathVariable Long id,
            @RequestBody java.util.Map<String, String> request) {
        String gitUrl = request.get("gitUrl");
        String safeGitUrl = scanSecurityService.validateGitUrl(gitUrl);
        String token = request.get("token");
        if (!scanStatusService.trySetScanning(id)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Bu proje için tarama zaten devam ediyor");
        }
        try {
            CompletableFuture.runAsync(() -> {
                java.nio.file.Path clonedDir = null;
                try {
                    clonedDir = gitCloneService.cloneRepo(safeGitUrl, token);
                    Project project = projectService.getProjectOrThrow(id);
                    project.setRepoUrl(safeGitUrl);
                    projectService.save(project);
                    contextService.scanLocalFolder(id, clonedDir.toString());
                    // Clear the temp clone path so it's not used after cleanup
                    Project p2 = projectService.getProjectOrThrow(id);
                    p2.setLocalPath(null);
                    projectService.save(p2);
                    scanStatusService.setDone(id);
                } catch (Exception e) {
                    log.error("Git scan failed for project {}: {}", id, e.getMessage());
                    scanStatusService.setFailed(id, e.getMessage());
                } finally {
                    if (clonedDir != null) gitCloneService.cleanup(clonedDir);
                }
            }, scanExecutor);
        } catch (TaskRejectedException e) {
            scanStatusService.setFailed(id, "Scan queue is full. Please try again shortly.");
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "Sistem yoğun. Tarama kuyruğu dolu, lütfen kısa süre sonra tekrar deneyin.");
        }
        return Map.of("status", "SCANNING");
    }

    @PostMapping("/{id}/suggest-features")
    public FeatureSuggestionResult suggestFeatures(@PathVariable Long id) {
        return featureSuggestionService.suggestFeatures(id);
    }

    @PostMapping("/{id}/members")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, String> addMember(
            @PathVariable Long id,
            @RequestBody Map<String, String> request) {
        String username = request.get("username");
        String role = request.get("role");
        if (username == null || username.isBlank()) {
            throw new IllegalArgumentException("username is required");
        }

        ProjectRole projectRole;
        try {
            projectRole = role != null ? ProjectRole.valueOf(role.toUpperCase(java.util.Locale.ENGLISH)) : ProjectRole.EDITOR;
        } catch (Exception e) {
            projectRole = ProjectRole.EDITOR;
        }

        projectAccessService.addMemberByUsername(username, id, projectRole);
        return Map.of("status", "added", "username", username, "role", projectRole.name());
    }

    @GetMapping("/{id}/members")
    public List<Map<String, String>> getMembers(@PathVariable Long id) {
        return projectAccessService.getProjectMembers(id);
    }
}
