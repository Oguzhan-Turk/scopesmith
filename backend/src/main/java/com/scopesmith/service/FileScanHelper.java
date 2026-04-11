package com.scopesmith.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.FileVisitResult;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.SimpleFileVisitor;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Shared file scanning utilities for project and service context scanning.
 *
 * Extracted from ProjectContextService and ServiceContextScanService to eliminate
 * duplication and ensure consistent behavior (e.g. secret redaction everywhere).
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class FileScanHelper {

    private final SecretRedactionService secretRedactionService;

    // ─── Constants ────────────────────────────────────────────────────────────

    /** Config and manifest files that reveal project structure. */
    public static final Set<String> KEY_FILENAMES = Set.of(
            "pom.xml", "build.gradle", "build.gradle.kts",
            "package.json", "requirements.txt", "go.mod", "Cargo.toml",
            "README.md", "README", "readme.md",
            "docker-compose.yml", "docker-compose.yaml", "Dockerfile",
            "application.yml", "application.yaml", "application.properties"
    );

    /** Source file extensions containing domain/business logic. */
    public static final Set<String> CODE_EXTENSIONS = Set.of(
            ".java", ".kt", ".py", ".ts", ".js", ".go", ".rs", ".cs"
    );

    /** Directories to skip — generated artifacts, IDE state, dependency caches. */
    public static final Set<String> SKIP_DIRS = Set.of(
            "node_modules", "target", "build", "dist", ".git", ".idea",
            ".vscode", "__pycache__", ".gradle", "bin", "obj", ".mvn"
    );

    /** Build files from which dependencies are parsed (token-free, regex-based). */
    public static final Set<String> BUILD_FILENAMES = Set.of(
            "pom.xml", "build.gradle", "build.gradle.kts",
            "package.json", "requirements.txt", "go.mod"
    );

    private static final long MAX_FILE_SIZE    = 50L * 1024;     // 50 KB per file
    private static final long MAX_TOTAL_CONTENT = 150L * 1024;   // 150 KB total
    private static final int  MAX_FILES        = 50;
    private static final int  MAX_TREE_DEPTH   = 8;

    // ─── Public API ──────────────────────────────────────────────────────────

    /**
     * Build a sorted file-tree string suitable for AI context, respecting
     * {@link #SKIP_DIRS} and {@link #MAX_TREE_DEPTH}.
     */
    public String buildFileTree(Path root) {
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

    /**
     * Read key files from the project root:
     * <ul>
     *   <li>Config / manifest files (pom.xml, package.json, Dockerfile, …)</li>
     *   <li>Source files under entity/, model/, domain/, controller/, service/ paths</li>
     * </ul>
     *
     * <p>Secrets are redacted before returning. Build-file contents are also
     * collected into {@code buildFileContents} for dependency parsing.</p>
     *
     * @param root              project / service root directory
     * @param buildFileContents output map: relative path → raw file content
     *                          (populated for dependency parsing by caller)
     * @return formatted markdown string of file contents for AI prompt
     */
    public String readKeyFiles(Path root, Map<String, String> buildFileContents) {
        StringBuilder content = new StringBuilder();
        long totalSize = 0;
        int totalRedactions = 0;

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

                    String extension = getExtension(fileName);
                    if (CODE_EXTENSIONS.contains(extension)) {
                        String pathStr = root.relativize(file).toString()
                                .replace('\\', '/').toLowerCase(java.util.Locale.ENGLISH);
                        if (pathStr.contains("/entity/")
                                || pathStr.contains("/model/")
                                || pathStr.contains("/domain/")
                                || pathStr.contains("/controller/")
                                || (pathStr.contains("/service/") && !pathStr.contains("test"))) {
                            filesToRead.add(file);
                        }
                    }

                    return FileVisitResult.CONTINUE;
                }
            });

            List<Path> sortedFiles = filesToRead.stream()
                    .sorted(Comparator.comparing(p -> root.relativize(p).toString()))
                    .limit(MAX_FILES)
                    .toList();

            log.info("Reading {} key files (of {} found) under {}", sortedFiles.size(), filesToRead.size(), root);

            for (Path file : sortedFiles) {
                if (totalSize >= MAX_TOTAL_CONTENT) {
                    content.append("\n--- (content limit reached, remaining files omitted) ---\n");
                    break;
                }

                try {
                    long fileSize = Files.size(file);
                    if (fileSize > MAX_FILE_SIZE) {
                        content.append("\n### ").append(root.relativize(file))
                               .append(" (skipped — too large)\n");
                        continue;
                    }

                    String raw = Files.readString(file);
                    if (raw.isBlank()) continue;

                    SecretRedactionService.RedactionResult redaction = secretRedactionService.redact(raw);
                    String sanitized = redaction.content();
                    totalRedactions += redaction.redactionCount();

                    content.append("\n### ").append(root.relativize(file)).append("\n```\n");
                    content.append(sanitized);
                    content.append("\n```\n");
                    totalSize += fileSize;

                    String fn = file.getFileName().toString();
                    if (BUILD_FILENAMES.contains(fn)) {
                        buildFileContents.put(root.relativize(file).toString(), raw);
                    }
                } catch (IOException e) {
                    log.debug("Could not read file: {}", file);
                }
            }
        } catch (IOException e) {
            log.error("Error reading key files from {}", root, e);
        }

        if (totalRedactions > 0) {
            log.info("Secret redaction applied during scan of {}: {} replacements", root, totalRedactions);
        }

        return content.toString();
    }

    /**
     * Read CLAUDE.md (or .claude/CLAUDE.md) from the given root, if present.
     * Returns {@code null} if not found.
     */
    public String readClaudeMd(Path root) {
        for (String candidate : List.of("CLAUDE.md", ".claude/CLAUDE.md")) {
            Path path = root.resolve(candidate);
            if (Files.exists(path) && Files.isRegularFile(path)) {
                try {
                    String content = Files.readString(path);
                    if (content.length() > MAX_FILE_SIZE) {
                        content = content.substring(0, (int) MAX_FILE_SIZE);
                        log.warn("CLAUDE.md truncated to {}KB at {}", MAX_FILE_SIZE / 1024, path);
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
     * Extract the current git commit hash from {@code root/.git/HEAD}.
     * Returns {@code null} if the directory is not a git repo or the hash cannot be read.
     */
    public String extractCommitHash(Path root) {
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
            log.debug("Could not read git commit hash for {}", root);
        }
        return null;
    }

    // ─── Private helpers ─────────────────────────────────────────────────────

    private static String getExtension(String filename) {
        int lastDot = filename.lastIndexOf('.');
        return lastDot >= 0 ? filename.substring(lastDot) : "";
    }
}
