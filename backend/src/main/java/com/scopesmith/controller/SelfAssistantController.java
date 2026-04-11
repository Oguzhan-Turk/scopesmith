package com.scopesmith.controller;

import com.scopesmith.dto.ContextFreshnessResponse;
import com.scopesmith.dto.SelfAssistantRequest;
import com.scopesmith.dto.SelfAssistantResponse;
import com.scopesmith.entity.Project;
import com.scopesmith.service.ContextFreshnessService;
import com.scopesmith.service.ProjectService;
import com.scopesmith.service.ResourceAccessService;
import com.scopesmith.service.SelfAssistantService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/assistant")
@RequiredArgsConstructor
public class SelfAssistantController {

    @Value("${scopesmith.features.self-assistant-enabled:false}")
    private boolean selfAssistantEnabled;

    private final SelfAssistantService selfAssistantService;
    private final ResourceAccessService resourceAccessService;
    private final ProjectService projectService;
    private final ContextFreshnessService contextFreshnessService;

    @PostMapping("/self-help")
    public SelfAssistantResponse selfHelp(@Valid @RequestBody SelfAssistantRequest request) {
        if (!selfAssistantEnabled) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }
        ContextFreshnessResponse freshness = null;
        if (request.getProjectId() != null) {
            resourceAccessService.assertProjectAccess(request.getProjectId());
            Project project = projectService.getProjectOrThrow(request.getProjectId());
            freshness = contextFreshnessService.evaluate(project);
        }
        return selfAssistantService.answer(request.getQuestion(), freshness);
    }
}
