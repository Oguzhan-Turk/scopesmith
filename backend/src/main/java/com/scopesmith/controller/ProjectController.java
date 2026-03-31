package com.scopesmith.controller;

import com.scopesmith.dto.IntegrationConfigDTO;
import com.scopesmith.dto.ProjectRequest;
import com.scopesmith.dto.ProjectResponse;
import com.scopesmith.dto.TaskResponse;
import com.scopesmith.entity.Analysis;
import com.scopesmith.entity.Project;
import com.scopesmith.repository.AnalysisRepository;
import com.scopesmith.dto.FeatureSuggestionResult;
import com.scopesmith.service.FeatureSuggestionService;
import com.scopesmith.service.GitCloneService;
import com.scopesmith.service.InsightService;
import com.scopesmith.service.ProjectContextService;
import com.scopesmith.service.ProjectService;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/projects")
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectService projectService;
    private final ProjectContextService contextService;
    private final GitCloneService gitCloneService;
    private final InsightService insightService;
    private final FeatureSuggestionService featureSuggestionService;
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
            @RequestBody IntegrationConfigDTO config) {
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
            group.put("requirementType", a.getRequirement().getType().name());
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
     * Scan a local folder to generate project context.
     * ScopeSmith reads the code, understands the project structure,
     * and uses this context for all subsequent requirement analyses.
     */
    @PostMapping("/{id}/scan")
    public ProjectResponse scanLocalFolder(
            @PathVariable Long id,
            @RequestBody java.util.Map<String, String> request) {
        String folderPath = request.get("folderPath");
        if (folderPath == null || folderPath.isBlank()) {
            throw new IllegalArgumentException("folderPath is required");
        }
        return ProjectResponse.from(contextService.scanLocalFolder(id, folderPath));
    }

    /**
     * Clone a git repo and scan it for project context.
     */
    @PostMapping("/{id}/scan-git")
    public ProjectResponse scanGitRepo(
            @PathVariable Long id,
            @RequestBody java.util.Map<String, String> request) {
        String gitUrl = request.get("gitUrl");
        String token = request.get("token");
        if (gitUrl == null || gitUrl.isBlank()) {
            throw new IllegalArgumentException("gitUrl is required");
        }

        java.nio.file.Path clonedDir = null;
        try {
            clonedDir = gitCloneService.cloneRepo(gitUrl, token);

            // Update project with git URL
            Project project = projectService.getProjectOrThrow(id);
            project.setRepoUrl(gitUrl);
            projectService.save(project);

            // Scan cloned directory using existing context service
            return ProjectResponse.from(contextService.scanLocalFolder(id, clonedDir.toString()));
        } catch (java.io.IOException e) {
            throw new IllegalStateException("Git clone başarısız: " + e.getMessage());
        } finally {
            if (clonedDir != null) {
                gitCloneService.cleanup(clonedDir);
            }
        }
    }

    @PostMapping("/{id}/suggest-features")
    public FeatureSuggestionResult suggestFeatures(@PathVariable Long id) {
        return featureSuggestionService.suggestFeatures(id);
    }
}
