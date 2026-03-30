package com.scopesmith.controller;

import com.scopesmith.dto.AnalysisResponse;
import com.scopesmith.dto.ChangeImpactResult;
import com.scopesmith.dto.RequirementRequest;
import com.scopesmith.dto.RequirementResponse;
import com.scopesmith.entity.Analysis;
import com.scopesmith.repository.AnalysisRepository;
import com.scopesmith.service.ChangeImpactService;
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
    private final AnalysisRepository analysisRepository;

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
        return requirementService.findById(id);
    }

    @PutMapping("/requirements/{id}")
    public RequirementResponse update(
            @PathVariable Long id,
            @Valid @RequestBody RequirementRequest request) {
        return requirementService.update(id, request);
    }

    @GetMapping("/requirements/{id}/analyses")
    public List<AnalysisResponse> getAnalyses(@PathVariable Long id) {
        List<Analysis> analyses = analysisRepository.findByRequirementIdOrderByCreatedAtDesc(id);
        return analyses.stream().map(AnalysisResponse::from).toList();
    }

    @DeleteMapping("/requirements/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        requirementService.delete(id);
    }

    @PostMapping("/requirements/{id}/analyze")
    public AnalysisResponse analyze(@PathVariable Long id) {
        return AnalysisResponse.from(analysisService.analyze(id));
    }

    @PostMapping("/requirements/{id}/change-impact")
    public ChangeImpactResult changeImpact(@PathVariable Long id) {
        return changeImpactService.analyzeImpact(id);
    }
}
