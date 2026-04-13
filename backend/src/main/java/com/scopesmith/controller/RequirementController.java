package com.scopesmith.controller;

import com.scopesmith.dto.AnalysisResponse;
import com.scopesmith.dto.ChangeImpactResult;
import com.scopesmith.dto.RequirementRequest;
import com.scopesmith.dto.RequirementResponse;
import com.scopesmith.entity.Analysis;
import com.scopesmith.entity.ModelTier;
import com.scopesmith.repository.AnalysisRepository;
import com.scopesmith.service.ChangeImpactService;
import com.scopesmith.service.EmbeddingService;
import com.scopesmith.service.ResourceAccessService;
import com.scopesmith.service.RequirementAnalysisService;
import com.scopesmith.service.RequirementService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class RequirementController {

    private final RequirementService requirementService;
    private final RequirementAnalysisService analysisService;
    private final ChangeImpactService changeImpactService;
    private final EmbeddingService embeddingService;
    private final AnalysisRepository analysisRepository;
    private final ResourceAccessService resourceAccessService;

    @PostMapping("/projects/{projectId}/requirements")
    @ResponseStatus(HttpStatus.CREATED)
    public RequirementResponse create(
            @PathVariable Long projectId,
            @Valid @RequestBody RequirementRequest request) {
        return requirementService.create(projectId, request);
    }

    @GetMapping("/projects/{projectId}/requirements")
    public List<RequirementResponse> findByProject(@PathVariable Long projectId) {
        return requirementService.findByProject(projectId);
    }

    @GetMapping("/requirements/{id}")
    public RequirementResponse findById(@PathVariable Long id) {
        resourceAccessService.assertRequirementAccess(id);
        return requirementService.findById(id);
    }

    @PutMapping("/requirements/{id}")
    public RequirementResponse update(
            @PathVariable Long id,
            @Valid @RequestBody RequirementRequest request) {
        resourceAccessService.assertRequirementEdit(id);
        return requirementService.update(id, request);
    }

    @GetMapping("/requirements/{id}/analyses")
    public List<AnalysisResponse> getAnalyses(@PathVariable Long id) {
        resourceAccessService.assertRequirementAccess(id);
        List<Analysis> analyses = analysisRepository.findByRequirementIdOrderByCreatedAtDesc(id);
        return analyses.stream().map(AnalysisResponse::from).toList();
    }

    @DeleteMapping("/requirements/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        resourceAccessService.assertRequirementEdit(id);
        requirementService.delete(id);
    }

    @PostMapping("/requirements/{id}/analyze")
    public AnalysisResponse analyze(@PathVariable Long id,
                                     @RequestParam(required = false) String modelTier) {
        resourceAccessService.assertRequirementEdit(id);
        ModelTier tier = modelTier != null ? ModelTier.valueOf(modelTier.toUpperCase(java.util.Locale.ENGLISH)) : null;
        return AnalysisResponse.from(analysisService.analyze(id, tier));
    }

    @PostMapping("/requirements/{id}/change-impact")
    public ChangeImpactResult changeImpact(@PathVariable Long id) {
        resourceAccessService.assertRequirementAccess(id);
        return changeImpactService.analyzeImpact(id);
    }

    @GetMapping("/requirements/{id}/similar")
    public List<SimilarRequirementResponse> findSimilar(
            @PathVariable Long id,
            @RequestParam(defaultValue = "3") int limit) {
        resourceAccessService.assertRequirementAccess(id);
        var req = requirementService.getRequirementOrThrow(id);
        var similar = embeddingService.findSimilar(req.getProject().getId(), id, req.getRawText());
        return similar.stream()
                .limit(limit)
                .map(s -> new SimilarRequirementResponse(
                        s.requirementId(),
                        s.rawText() != null && s.rawText().length() > 120
                                ? s.rawText().substring(0, 120) + "..."
                                : s.rawText(),
                        s.summary(),
                        s.riskLevel(),
                        s.affectedModules(),
                        Math.round(s.similarity() * 100)
                ))
                .toList();
    }

    public record SimilarRequirementResponse(
            Long requirementId,
            String text,
            String summary,
            String riskLevel,
            String affectedModules,
            int similarityPercent
    ) {}
}
