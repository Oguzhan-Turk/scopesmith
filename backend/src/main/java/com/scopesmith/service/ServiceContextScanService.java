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

import java.io.IOException;
import java.nio.file.FileVisitResult;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.SimpleFileVisitor;
import java.nio.file.attribute.BasicFileAttributes;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

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

    private static final Set<String> KEY_FILENAMES = Set.of(
            "pom.xml", "build.gradle", "build.gradle.kts",
            "package.json", "requirements.txt", "go.mod", "Cargo.toml",
            "README.md", "README", "readme.md",
            "docker-compose.yml", "docker-compose.yaml", "Dockerfile",
            "application.yml", "application.yaml", "application.properties"
    );

    private static final Set<String> CODE_EXTENSIONS = Set.of(
            ".java", ".kt", ".py", ".ts", ".js", ".go", ".rs", ".cs"
    );

    private static final Set<String> SKIP_DIRS = Set.of(
            "node_modules", "target", "build", "dist", ".git", ".idea",
            ".vscode", "__pycache__", ".gradle", "bin", "obj", ".mvn"
    );

    private static final Set<String> BUILD_FILENAMES = Set.of(
            "pom.xml", "build.gradle", "build.gradle.kts",
            "package.json", "requirements.txt", "go.mod"
    );

    private static final long MAX_FILE_SIZE = 50 * 1024;
    private static final long MAX_TOTAL_CONTENT = 150 * 1024;
    private static final int MAX_FILES = 50;
    private static final int MAX_TREE_DEPTH = 8;

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

        String fileTree = buildFileTree(root);
        Map<String, String> buildFileContents = new HashMap<>();
        String keyFileContents = readKeyFiles(root, buildFileContents);
        String userMessage = "## File Tree\n```\n" + fileTree + "\n```\n\n" +
                "## Key File Contents\n" + keyFileContents;

        // TODO: [TECH-DEBT] ProjectContextService ile ortak scan helper'a taşınıp tekrar eden kod azaltılmalı.
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
        service.setLastScannedCommitHash(extractCommitHash(root));

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

    private String extractCommitHash(Path root) {
        try {
            Path gitHead = root.resolve(".git/HEAD");
            if (Files.exists(gitHead)) {
                String headContent = Files.readString(gitHead).trim();
                if (headContent.startsWith("ref: ")) {
                    Path refPath = root.resolve(".git/" + headContent.substring(5));
                    if (Files.exists(refPath)) {
                        return Files.readString(refPath).trim();
                    }
                }
            }
        } catch (IOException e) {
            log.debug("Could not read git commit hash for service path {}", root);
        }
        return null;
    }

    private String buildFileTree(Path root) {
        List<String> entries = new ArrayList<>();
        try {
            Files.walkFileTree(root, new SimpleFileVisitor<>() {
                @Override
                public FileVisitResult preVisitDirectory(Path dir, BasicFileAttributes attrs) {
                    String dirName = dir.getFileName().toString();
                    if (SKIP_DIRS.contains(dirName) && !dir.equals(root)) {
                        return FileVisitResult.SKIP_SUBTREE;
                    }
                    int depth = root.relativize(dir).getNameCount();
                    if (depth > MAX_TREE_DEPTH) {
                        return FileVisitResult.SKIP_SUBTREE;
                    }
                    String relative = root.relativize(dir).toString();
                    if (!relative.isEmpty()) {
                        entries.add(relative + "/");
                    }
                    return FileVisitResult.CONTINUE;
                }

                @Override
                public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) {
                    if (entries.size() < 500) {
                        entries.add(root.relativize(file).toString());
                    }
                    return FileVisitResult.CONTINUE;
                }
            });
        } catch (IOException e) {
            log.error("Error building file tree for {}", root, e);
        }
        return entries.stream().sorted().collect(Collectors.joining("\n"));
    }

    private String readKeyFiles(Path root, Map<String, String> buildFileContents) {
        StringBuilder content = new StringBuilder();
        long totalSize = 0;

        try {
            List<Path> filesToRead = new ArrayList<>();
            Files.walkFileTree(root, new SimpleFileVisitor<>() {
                @Override
                public FileVisitResult preVisitDirectory(Path dir, BasicFileAttributes attrs) {
                    String dirName = dir.getFileName().toString();
                    if (SKIP_DIRS.contains(dirName) && !dir.equals(root)) {
                        return FileVisitResult.SKIP_SUBTREE;
                    }
                    return FileVisitResult.CONTINUE;
                }

                @Override
                public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) {
                    String fileName = file.getFileName().toString();
                    if (KEY_FILENAMES.contains(fileName)) {
                        filesToRead.add(file);
                        return FileVisitResult.CONTINUE;
                    }
                    String lower = fileName.toLowerCase(Locale.ENGLISH);
                    for (String ext : CODE_EXTENSIONS) {
                        if (lower.endsWith(ext)) {
                            Path rel = root.relativize(file);
                            String path = rel.toString().replace('\\', '/');
                            if (path.contains("/entity/")
                                    || path.contains("/model/")
                                    || path.contains("/controller/")
                                    || path.contains("/service/")) {
                                filesToRead.add(file);
                            }
                            break;
                        }
                    }
                    return FileVisitResult.CONTINUE;
                }
            });

            filesToRead.sort(Comparator.comparing(p -> root.relativize(p).toString()));
            int included = 0;
            for (Path file : filesToRead) {
                if (content.length() > MAX_TOTAL_CONTENT || included >= MAX_FILES) break;
                String rel = root.relativize(file).toString();
                long size = Files.size(file);
                if (size > MAX_FILE_SIZE) continue;
                String text = Files.readString(file);
                if (text.isBlank()) continue;
                if (totalSize + text.length() > MAX_TOTAL_CONTENT) break;

                content.append("\n### ").append(rel).append("\n```\n")
                        .append(text.length() > 4000 ? text.substring(0, 4000) : text)
                        .append("\n```\n");
                totalSize += text.length();
                included++;

                if (BUILD_FILENAMES.contains(file.getFileName().toString())) {
                    buildFileContents.put(rel, text);
                }
            }
        } catch (IOException e) {
            log.error("Error reading key files for {}", root, e);
        }

        return content.toString();
    }
}
