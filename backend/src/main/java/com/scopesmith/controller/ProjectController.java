package com.scopesmith.controller;

import com.scopesmith.dto.ProjectRequest;
import com.scopesmith.dto.ProjectResponse;
import com.scopesmith.service.ProjectContextService;
import com.scopesmith.service.ProjectService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/projects")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173") // Vite dev server
public class ProjectController {

    private final ProjectService projectService;
    private final ProjectContextService contextService;

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
        return projectService.findById(id);
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
}
