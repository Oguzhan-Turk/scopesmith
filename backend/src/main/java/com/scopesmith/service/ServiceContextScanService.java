package com.scopesmith.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.scopesmith.config.PromptLoader;
import com.scopesmith.dto.DependencyInfo;
import com.scopesmith.dto.ProjectContextResult;
import com.scopesmith.dto.ServiceScanResponse;
import com.scopesmith.entity.OperationType;
import com.scopesmith.entity.ProjectServiceNode;
import com.scopesmith.repository.ProjectServiceNodeRepository;
import com.scopesmith.service.validation.AiResultValidationService;
import com.scopesmith.service.validation.ValidationContext;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.*;


@Service
@RequiredArgsConstructor
@Slf4j
public class ServiceContextScanService {

    private final ProjectServiceNodeRepository projectServiceNodeRepository;
    private final ScanSecurityService scanSecurityService;
    private final AiService aiService;
    private final PromptLoader promptLoader;
    private final ObjectMapper objectMapper;
    private final AiResultValidationService validationService;
    private final DependencyParsingService dependencyParsingService;
    private final FileScanHelper fileScanHelper;

    @Transactional
    public ServiceScanResponse scanService(Long projectId, Long serviceId, String folderPath) {
        ProjectServiceNode service = projectServiceNodeRepository.findByIdAndProjectId(serviceId, projectId)
                .orElseThrow(() -> new EntityNotFoundException("Project service not found: " + serviceId));

        String pathInput = (folderPath != null && !folderPath.isBlank()) ? folderPath : service.getLocalPath();
        if (pathInput == null || pathInput.isBlank()) {
            throw new IllegalArgumentException("Service için local path bulunamadı.");
        }

        String safePath = scanSecurityService.validateLocalFolderPath(pathInput);
        Path root = Path.of(safePath);

        String fileTree = fileScanHelper.buildFileTree(root);
        Map<String, String> buildFileContents = new HashMap<>();
        String keyFileContents = fileScanHelper.readKeyFiles(root, buildFileContents);
        String userMessage = "## File Tree\n```\n" + fileTree + "\n```\n\n" +
                "## Key File Contents\n" + keyFileContents;

        String context = aiService.chat(
                promptLoader.load("project-context"),
                userMessage,
                OperationType.PROJECT_CONTEXT,
                projectId
        );

        ProjectContextResult structured = aiService.chatWithStructuredOutput(
                promptLoader.load("project-context-structured"),
                userMessage,
                ProjectContextResult.class,
                OperationType.PROJECT_CONTEXT_STRUCTURED,
                projectId
        );
        structured = validationService.validate(structured, ValidationContext.builder().projectId(projectId).build());

        List<DependencyInfo> allDeps = new ArrayList<>();
        for (Map.Entry<String, String> entry : buildFileContents.entrySet()) {
            String filename = entry.getKey();
            String name = filename.contains("/") ? filename.substring(filename.lastIndexOf('/') + 1) : filename;
            allDeps.addAll(dependencyParsingService.parse(name, entry.getValue()));
        }
        if (!allDeps.isEmpty()) {
            structured.setDependencies(allDeps);
        }

        service.setTechContext(context);
        try {
            service.setStructuredContext(objectMapper.writeValueAsString(structured));
        } catch (Exception e) {
            log.warn("Failed to serialize structured context for service #{}", serviceId, e);
        }
        service.setLocalPath(safePath);
        service.setLastScannedAt(LocalDateTime.now());
        service.setContextVersion((service.getContextVersion() != null ? service.getContextVersion() : 0) + 1);
        service.setLastScannedCommitHash(fileScanHelper.extractCommitHash(root));

        projectServiceNodeRepository.save(service);

        return ServiceScanResponse.builder()
                .serviceId(service.getId())
                .serviceName(service.getName())
                .status("DONE")
                .contextVersion(service.getContextVersion())
                .lastScannedAt(service.getLastScannedAt())
                .lastScannedCommitHash(service.getLastScannedCommitHash())
                .build();
    }

}
