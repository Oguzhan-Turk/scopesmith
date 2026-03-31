package com.scopesmith.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.scopesmith.config.PromptLoader;
import com.scopesmith.dto.ProjectContextResult;
import com.scopesmith.entity.OperationType;
import com.scopesmith.entity.Project;
import com.scopesmith.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.nio.file.*;
import java.nio.file.attribute.BasicFileAttributes;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProjectContextService {

    private final AiService aiService;
    private final ProjectService projectService;
    private final ProjectRepository projectRepository;
    private final PromptLoader promptLoader;
    private final ObjectMapper objectMapper;

    /**
     * Key files that reveal project structure.
     * We don't send the entire codebase — just the files that matter most.
     */
    private static final Set<String> KEY_FILENAMES = Set.of(
            "pom.xml", "build.gradle", "build.gradle.kts",
            "package.json", "requirements.txt", "go.mod", "Cargo.toml",
            "README.md", "README", "readme.md",
            "docker-compose.yml", "docker-compose.yaml", "Dockerfile",
            "application.yml", "application.yaml", "application.properties"
    );

    /**
     * File extensions that contain domain/business logic we want Claude to understand.
     */
    private static final Set<String> CODE_EXTENSIONS = Set.of(
            ".java", ".kt", ".py", ".ts", ".js", ".go", ".rs", ".cs"
    );

    /**
     * Directories to skip — no value for context understanding.
     */
    private static final Set<String> SKIP_DIRS = Set.of(
            "node_modules", "target", "build", "dist", ".git", ".idea",
            ".vscode", "__pycache__", ".gradle", "bin", "obj", ".mvn"
    );

    /**
     * Maximum file size to read (50KB). Larger files are likely generated or data files.
     */
    private static final long MAX_FILE_SIZE = 50 * 1024;

    /**
     * Maximum total content to send to Claude (150KB).
     * Prevents token explosion on large projects.
     */
    private static final long MAX_TOTAL_CONTENT = 150 * 1024;

    /**
     * Maximum number of files to include in context.
     */
    private static final int MAX_FILES = 50;

    /**
     * Maximum file tree depth to prevent scanning deeply nested directories.
     */
    private static final int MAX_TREE_DEPTH = 8;

    // Prompt loaded from resources/prompts/project-context.txt via PromptLoader

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
        String claudeMd = readClaudeMd(root);
        project.setClaudeMdContent(claudeMd);

        // Build file tree
        String fileTree = buildFileTree(root);

        // Read key files
        String keyFileContents = readKeyFiles(root);

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

        long duration = System.currentTimeMillis() - startTime;
        log.info("Project context generated for #{} in {}ms (text + structured)", projectId, duration);

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
        try {
            Path gitHead = root.resolve(".git/HEAD");
            if (Files.exists(gitHead)) {
                String headContent = Files.readString(gitHead).trim();
                if (headContent.startsWith("ref: ")) {
                    Path refPath = root.resolve(".git/" + headContent.substring(5));
                    if (Files.exists(refPath)) {
                        project.setLastScannedCommitHash(Files.readString(refPath).trim());
                    }
                }
            }
        } catch (IOException e) {
            log.debug("Could not read git commit hash for project #{}", projectId);
        }

        return projectRepository.save(project);
    }

    /**
     * Build a file tree string, respecting skip directories.
     */
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
                    // Depth limit
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
                    if (entries.size() < 500) { // prevent file tree explosion
                        entries.add(root.relativize(file).toString());
                    }
                    return FileVisitResult.CONTINUE;
                }
            });
        } catch (IOException e) {
            log.error("Error building file tree for {}", root, e);
        }

        return entries.stream()
                .sorted()
                .collect(Collectors.joining("\n"));
    }

    /**
     * Read CLAUDE.md from the project root — developer notes, conventions, decisions.
     * Checks: CLAUDE.md, .claude/CLAUDE.md
     */
    private String readClaudeMd(Path root) {
        for (String candidate : List.of("CLAUDE.md", ".claude/CLAUDE.md")) {
            Path path = root.resolve(candidate);
            if (Files.exists(path) && Files.isRegularFile(path)) {
                try {
                    String content = Files.readString(path);
                    if (content.length() > MAX_FILE_SIZE) {
                        content = content.substring(0, (int) MAX_FILE_SIZE);
                        log.warn("CLAUDE.md truncated to {}KB for project at {}", MAX_FILE_SIZE / 1024, root);
                    }
                    log.info("Found CLAUDE.md ({} chars) at {}", content.length(), path);
                    return content;
                } catch (IOException e) {
                    log.warn("Failed to read CLAUDE.md at {}: {}", path, e.getMessage());
                }
            }
        }
        return null;
    }

    /**
     * Read contents of key files — config files, entity/model files, README.
     * Respects MAX_FILE_SIZE per file and MAX_TOTAL_CONTENT total.
     */
    private String readKeyFiles(Path root) {
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

                    // Always read key config files
                    if (KEY_FILENAMES.contains(fileName)) {
                        filesToRead.add(file);
                        return FileVisitResult.CONTINUE;
                    }

                    // Read entity/model/domain files
                    String extension = getExtension(fileName);
                    if (CODE_EXTENSIONS.contains(extension)) {
                        String pathStr = file.toString().toLowerCase();
                        if (pathStr.contains("entity") || pathStr.contains("model") ||
                                pathStr.contains("domain") || pathStr.contains("controller") ||
                                pathStr.contains("service") && !pathStr.contains("test")) {
                            filesToRead.add(file);
                        }
                    }

                    return FileVisitResult.CONTINUE;
                }
            });

            // Sort and limit file count, then read
            List<Path> sortedFiles = filesToRead.stream().sorted().limit(MAX_FILES).toList();
            log.info("Reading {} key files (of {} found)", sortedFiles.size(), filesToRead.size());
            for (Path file : sortedFiles) {
                if (totalSize >= MAX_TOTAL_CONTENT) {
                    content.append("\n--- (content limit reached, remaining files omitted) ---\n");
                    break;
                }

                try {
                    long fileSize = Files.size(file);
                    if (fileSize > MAX_FILE_SIZE) {
                        content.append("\n### ").append(root.relativize(file)).append(" (skipped — too large)\n");
                        continue;
                    }

                    String fileContent = Files.readString(file);
                    content.append("\n### ").append(root.relativize(file)).append("\n```\n");
                    content.append(fileContent);
                    content.append("\n```\n");
                    totalSize += fileSize;
                } catch (IOException e) {
                    log.debug("Could not read file: {}", file);
                }
            }
        } catch (IOException e) {
            log.error("Error reading key files from {}", root, e);
        }

        return content.toString();
    }

    private String getExtension(String filename) {
        int lastDot = filename.lastIndexOf('.');
        return lastDot >= 0 ? filename.substring(lastDot) : "";
    }
}
