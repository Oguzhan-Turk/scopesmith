package com.scopesmith.service;

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
     * Maximum total content to send to Claude (100KB).
     * Prevents token explosion on large projects.
     */
    private static final long MAX_TOTAL_CONTENT = 100 * 1024;

    private static final String SYSTEM_PROMPT = """
            You are a senior software architect analyzing a project's codebase.
            You will receive a file tree and the contents of key files from a software project.

            Produce a structured project context summary that includes:
            1. **Tech Stack**: Languages, frameworks, build tools, databases
            2. **Architecture**: Monolith/microservices, layering pattern, key design patterns
            3. **Modules/Services**: List of main modules or services with one-line descriptions
            4. **Domain Model**: Key entities/models and their relationships
            5. **API Surface**: Main endpoints or interfaces exposed
            6. **External Integrations**: Third-party services, APIs, databases
            7. **Key Observations**: Anything notable — code quality, patterns, potential concerns

            Rules:
            - Be concise but complete. This summary will be used as context for requirement analysis.
            - Focus on WHAT the project does and HOW it's structured, not line-by-line code review.
            - Use actual class/module/service names from the code.
            - If you can't determine something from the provided files, say so.
            - Return plain text, not JSON. This will be stored as project context.

            Return all human-readable text in Turkish.
            Keep technical terms, class names, and framework names in English.
            """;

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

        // Build file tree
        String fileTree = buildFileTree(root);

        // Read key files
        String keyFileContents = readKeyFiles(root);

        // Build message for Claude
        String userMessage = "## File Tree\n```\n" + fileTree + "\n```\n\n" +
                "## Key File Contents\n" + keyFileContents;

        // Call AI
        long startTime = System.currentTimeMillis();
        String context = aiService.chat(SYSTEM_PROMPT, userMessage);
        long duration = System.currentTimeMillis() - startTime;
        log.info("Project context generated for #{} in {}ms", projectId, duration);

        // Update project
        project.setTechContext(context);
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
                    String relative = root.relativize(dir).toString();
                    if (!relative.isEmpty()) {
                        entries.add(relative + "/");
                    }
                    return FileVisitResult.CONTINUE;
                }

                @Override
                public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) {
                    entries.add(root.relativize(file).toString());
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

            // Sort and read files
            for (Path file : filesToRead.stream().sorted().toList()) {
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
