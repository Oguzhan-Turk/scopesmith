package com.scopesmith.controller;

import com.scopesmith.dto.AnalysisResponse;
import com.scopesmith.dto.RequirementRequest;
import com.scopesmith.dto.RequirementResponse;
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
@CrossOrigin(origins = "http://localhost:5173")
public class RequirementController {

    private final RequirementService requirementService;
    private final RequirementAnalysisService analysisService;

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

    @PostMapping("/requirements/{id}/analyze")
    public AnalysisResponse analyze(@PathVariable Long id) {
        return AnalysisResponse.from(analysisService.analyze(id));
    }
}
