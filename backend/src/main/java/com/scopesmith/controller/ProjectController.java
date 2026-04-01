package com.scopesmith.controller;

import com.scopesmith.dto.IntegrationConfigDTO;
import com.scopesmith.dto.ProjectRequest;
import com.scopesmith.dto.ProjectResponse;
import com.scopesmith.dto.TaskResponse;
import com.scopesmith.entity.Analysis;
import com.scopesmith.entity.Project;
import com.scopesmith.repository.AnalysisRepository;
import com.scopesmith.dto.FeatureSuggestionResult;
import com.scopesmith.entity.ProjectRole;
import com.scopesmith.service.FeatureSuggestionService;
import com.scopesmith.service.GitCloneService;
import com.scopesmith.service.ProjectAccessService;
import com.scopesmith.service.InsightService;
import com.scopesmith.service.ProjectContextService;
import com.scopesmith.service.ProjectService;
import com.scopesmith.service.ScanStatusService;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

@Slf4j
@RestController
@RequestMapping("/api/v1/projects")
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectService projectService;
    private final ProjectContextService contextService;
    private final GitCloneService gitCloneService;
    private final InsightService insightService;
    private final ScanStatusService scanStatusService;
    private final FeatureSuggestionService featureSuggestionService;
    private final ProjectAccessService projectAccessService;
    private final AnalysisRepository analysisRepository;
    private final ObjectMapper objectMapper;

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

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        projectService.delete(id);
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

    /**
     * Scan a local folder to generate project context (async — returns 202 immediately).
     */
    @PostMapping("/{id}/scan")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public Map<String, String> scanLocalFolder(
            @PathVariable Long id,
            @RequestBody java.util.Map<String, String> request) {
        String folderPath = request.get("folderPath");
        if (folderPath == null || folderPath.isBlank()) {
            throw new IllegalArgumentException("folderPath is required");
        }
        scanStatusService.setScanning(id);
        CompletableFuture.runAsync(() -> {
            try {
                contextService.scanLocalFolder(id, folderPath);
                scanStatusService.setDone(id);
            } catch (Exception e) {
                log.error("Scan failed for project {}: {}", id, e.getMessage());
                scanStatusService.setFailed(id, e.getMessage());
            }
        });
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
        String token = request.get("token");
        if (gitUrl == null || gitUrl.isBlank()) {
            throw new IllegalArgumentException("gitUrl is required");
        }
        scanStatusService.setScanning(id);
        CompletableFuture.runAsync(() -> {
            java.nio.file.Path clonedDir = null;
            try {
                clonedDir = gitCloneService.cloneRepo(gitUrl, token);
                Project project = projectService.getProjectOrThrow(id);
                project.setRepoUrl(gitUrl);
                projectService.save(project);
                contextService.scanLocalFolder(id, clonedDir.toString());
                scanStatusService.setDone(id);
            } catch (Exception e) {
                log.error("Git scan failed for project {}: {}", id, e.getMessage());
                scanStatusService.setFailed(id, e.getMessage());
            } finally {
                if (clonedDir != null) gitCloneService.cleanup(clonedDir);
            }
        });
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
