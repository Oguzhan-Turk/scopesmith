package com.scopesmith.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.scopesmith.config.PromptLoader;
import com.scopesmith.dto.DependencyInfo;
import com.scopesmith.dto.ProjectContextResult;
import com.scopesmith.entity.OperationType;
import com.scopesmith.entity.Project;
import com.scopesmith.repository.ProjectRepository;
import com.scopesmith.service.validation.AiResultValidationService;
import com.scopesmith.service.validation.ValidationContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.*;


@Service
@RequiredArgsConstructor
@Slf4j
public class ProjectContextService {

    private final AiService aiService;
    private final ProjectService projectService;
    private final ProjectRepository projectRepository;
    private final PromptLoader promptLoader;
    private final ObjectMapper objectMapper;
    private final AiResultValidationService validationService;
    private final DependencyParsingService dependencyParsingService;
    private final FileScanHelper fileScanHelper;

    /**
     * Scan a local folder and generate project context using AI.
     */
    @Transactional
    public Project scanLocalFolder(Long projectId, String folderPath) {
        Project project = projectService.getProjectOrThrow(projectId);

        Path root = Path.of(folderPath);
        if (!Files.isDirectory(root)) {
            throw new IllegalArgumentException("Path is not a valid directory: " + folderPath);
        }

        log.info("Scanning local folder for project #{}: {}", projectId, folderPath);

        // Read CLAUDE.md if present (developer notes, conventions)
        String claudeMd = fileScanHelper.readClaudeMd(root);
        project.setClaudeMdContent(claudeMd);

        // Build file tree
        String fileTree = fileScanHelper.buildFileTree(root);

        // Read key files (also collects build file contents for dependency parsing)
        Map<String, String> buildFileContents = new HashMap<>();
        String keyFileContents = fileScanHelper.readKeyFiles(root, buildFileContents);

        // Build message for Claude
        String userMessage = "## File Tree\n```\n" + fileTree + "\n```\n\n" +
                "## Key File Contents\n" + keyFileContents;

        // Call AI — two calls: one for free-text summary, one for structured data
        long startTime = System.currentTimeMillis();

        // 1. Free-text context (human-readable, used in analysis prompts)
        String context = aiService.chat(promptLoader.load("project-context"), userMessage,
                OperationType.PROJECT_CONTEXT, projectId);

        // 2. Structured context (queryable, used for precise module/entity matching)
        ProjectContextResult structured = aiService.chatWithStructuredOutput(
                promptLoader.load("project-context-structured"), userMessage, ProjectContextResult.class,
                OperationType.PROJECT_CONTEXT_STRUCTURED, projectId);
        structured = validationService.validate(structured,
                ValidationContext.builder().projectId(projectId).build());

        long duration = System.currentTimeMillis() - startTime;
        log.info("Project context generated for #{} in {}ms (text + structured)", projectId, duration);

        // Parse dependencies from build files (token-free, regex-based)
        List<DependencyInfo> allDeps = new ArrayList<>();
        for (Map.Entry<String, String> entry : buildFileContents.entrySet()) {
            String filename = entry.getKey();
            String name = filename.contains("/") ? filename.substring(filename.lastIndexOf('/') + 1) : filename;
            List<DependencyInfo> parsed = dependencyParsingService.parse(name, entry.getValue());
            allDeps.addAll(parsed);
        }
        if (!allDeps.isEmpty()) {
            structured.setDependencies(allDeps);
            log.info("Parsed {} dependencies from build files", allDeps.size());
        }

        // Update project
        project.setTechContext(context);
        try {
            project.setStructuredContext(objectMapper.writeValueAsString(structured));
        } catch (Exception e) {
            log.warn("Failed to serialize structured context for project #{}", projectId, e);
        }
        project.setLocalPath(folderPath);
        project.setLastScannedAt(LocalDateTime.now());
        project.setContextVersion(project.getContextVersion() + 1);

        // Try to get git commit hash if it's a git repo
        String commitHash = fileScanHelper.extractCommitHash(root);
        if (commitHash != null) {
            project.setLastScannedCommitHash(commitHash);
        }

        return projectRepository.save(project);
    }

}
