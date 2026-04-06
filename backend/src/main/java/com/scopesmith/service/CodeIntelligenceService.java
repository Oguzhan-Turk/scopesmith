package com.scopesmith.service;

import lombok.Builder;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.eclipse.jgit.api.Git;
import org.eclipse.jgit.api.LogCommand;
import org.eclipse.jgit.diff.DiffEntry;
import org.eclipse.jgit.diff.DiffFormatter;
import org.eclipse.jgit.lib.ObjectReader;
import org.eclipse.jgit.lib.Repository;
import org.eclipse.jgit.revwalk.RevCommit;
import org.eclipse.jgit.treewalk.CanonicalTreeParser;
import org.eclipse.jgit.util.io.DisabledOutputStream;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.*;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Token-free local code intelligence.
 * Uses regex-based parsing for code structure extraction (multi-language)
 * and JGit for git history analysis (co-change, file activity).
 */
@Service
@Slf4j
public class CodeIntelligenceService {

    private static final int MAX_FILES = 30;
    private static final int MAX_FILE_SIZE = 50 * 1024; // 50KB
    private static final int MAX_COMMITS = 200;

    // ── Language Detection ──

    private enum Language {
        JAVA(".java"), KOTLIN(".kt"), PYTHON(".py"),
        TYPESCRIPT(".ts"), JAVASCRIPT(".js"),
        GO(".go"), CSHARP(".cs"), RUBY(".rb"), RUST(".rs"),
        UNKNOWN("");

        final String extension;
        Language(String ext) { this.extension = ext; }

        static Language detect(String filename) {
            String lower = filename.toLowerCase(java.util.Locale.ENGLISH);
            for (Language lang : values()) {
                if (!lang.extension.isEmpty() && lower.endsWith(lang.extension)) return lang;
            }
            return UNKNOWN;
        }
    }

    // ── Public API ──

    /**
     * Analyze code structure for given module names.
     * Returns a compact structural summary suitable for AI prompts.
     */
    public String analyzeModules(String projectPath, List<String> affectedModules) {
        if (projectPath == null || affectedModules == null || affectedModules.isEmpty()) return null;

        Path root = Path.of(projectPath);
        if (!Files.isDirectory(root)) return null;

        try {
            // 1. Find files matching affected modules
            List<Path> matchedFiles = findMatchingFiles(root, affectedModules);
            if (matchedFiles.isEmpty()) return null;

            // 2. Parse each file for structure
            StringBuilder result = new StringBuilder();
            result.append("## Code Structure Analysis (").append(matchedFiles.size()).append(" files)\n\n");

            for (Path file : matchedFiles) {
                String structure = parseFileStructure(file, root);
                if (structure != null) {
                    result.append(structure).append("\n");
                }
            }

            // 3. Git history analysis
            String gitAnalysis = analyzeGitHistory(root, matchedFiles);
            if (gitAnalysis != null) {
                result.append(gitAnalysis);
            }

            log.info("Code intelligence: analyzed {} files for modules {}", matchedFiles.size(), affectedModules);
            return result.toString();
        } catch (Exception e) {
            log.warn("Code intelligence analysis failed: {}", e.getMessage());
            return null;
        }
    }

    // ── File Matching ──

    private List<Path> findMatchingFiles(Path root, List<String> moduleNames) throws IOException {
        Set<Path> matched = new LinkedHashSet<>();

        try (var stream = Files.walk(root, 8)) {
            List<Path> allFiles = stream
                    .filter(Files::isRegularFile)
                    .filter(p -> Language.detect(p.getFileName().toString()) != Language.UNKNOWN)
                    .filter(p -> !isSkippedPath(root.relativize(p).toString()))
                    .collect(Collectors.toList());

            for (String module : moduleNames) {
                String moduleLower = module.toLowerCase(java.util.Locale.ENGLISH);
                for (Path file : allFiles) {
                    String filename = file.getFileName().toString();
                    String filenameLower = filename.toLowerCase(java.util.Locale.ENGLISH);
                    String nameWithoutExt = filenameLower.replaceFirst("\\.[^.]+$", "");

                    // Exact match: "UserService" → "UserService.java"
                    if (nameWithoutExt.equals(moduleLower)) {
                        matched.add(file);
                    }
                    // Contains match: "user" → "UserService.java", "UserRepository.java"
                    else if (nameWithoutExt.contains(moduleLower) || moduleLower.contains(nameWithoutExt)) {
                        matched.add(file);
                    }

                    if (matched.size() >= MAX_FILES) break;
                }
                if (matched.size() >= MAX_FILES) break;
            }
        }

        return new ArrayList<>(matched);
    }

    private boolean isSkippedPath(String relativePath) {
        String lower = relativePath.toLowerCase(java.util.Locale.ENGLISH);
        return lower.contains("node_modules") || lower.contains("target/") || lower.contains("build/")
                || lower.contains("dist/") || lower.contains(".git/") || lower.contains("__pycache__")
                || lower.contains("test/") || lower.contains("spec/");
    }

    // ── Code Structure Parsing (Multi-language Regex) ──

    private String parseFileStructure(Path file, Path root) {
        try {
            long size = Files.size(file);
            if (size > MAX_FILE_SIZE) return null;

            String content = Files.readString(file);
            String filename = file.getFileName().toString();
            Language lang = Language.detect(filename);
            String relativePath = root.relativize(file).toString();

            StringBuilder sb = new StringBuilder();
            sb.append("=== ").append(relativePath).append(" (").append(lang.name()).append(") ===\n");

            List<String> types = extractTypeDeclarations(content, lang);
            List<String> methods = extractMethodSignatures(content, lang);
            List<String> imports = extractImports(content, lang);

            if (!types.isEmpty()) sb.append("  Types: ").append(String.join(", ", types)).append("\n");
            if (!imports.isEmpty()) {
                // Show only unique package/module names, max 10
                List<String> uniqueImports = imports.stream().distinct().limit(10).collect(Collectors.toList());
                sb.append("  Dependencies: ").append(String.join(", ", uniqueImports)).append("\n");
            }
            if (!methods.isEmpty()) {
                sb.append("  Methods:\n");
                methods.stream().limit(15).forEach(m -> sb.append("    - ").append(m).append("\n"));
                if (methods.size() > 15) sb.append("    ... +").append(methods.size() - 15).append(" more\n");
            }

            return sb.toString();
        } catch (Exception e) {
            return null;
        }
    }

    private List<String> extractTypeDeclarations(String content, Language lang) {
        List<Pattern> patterns = switch (lang) {
            case JAVA, KOTLIN -> List.of(
                    Pattern.compile("(?:public |private |protected |abstract |)(?:class|interface|enum|record)\\s+(\\w+)"));
            case PYTHON -> List.of(Pattern.compile("^class\\s+(\\w+)", Pattern.MULTILINE));
            case TYPESCRIPT, JAVASCRIPT -> List.of(
                    Pattern.compile("(?:export\\s+)?(?:abstract\\s+)?(?:class|interface)\\s+(\\w+)"));
            case GO -> List.of(Pattern.compile("type\\s+(\\w+)\\s+(?:struct|interface)"));
            case CSHARP -> List.of(
                    Pattern.compile("(?:public |private |internal |protected |abstract |)(?:class|interface|struct|record)\\s+(\\w+)"));
            case RUBY -> List.of(Pattern.compile("^\\s*class\\s+(\\w+)", Pattern.MULTILINE));
            case RUST -> List.of(Pattern.compile("(?:pub\\s+)?(?:struct|enum|trait)\\s+(\\w+)"));
            default -> List.of();
        };
        return extractMatches(content, patterns, 1);
    }

    private List<String> extractMethodSignatures(String content, Language lang) {
        List<Pattern> patterns = switch (lang) {
            case JAVA -> List.of(
                    Pattern.compile("(?:public|private|protected)\\s+(?:static\\s+)?(?:\\w+(?:<[^>]+>)?\\s+)(\\w+\\s*\\([^)]*\\))"));
            case KOTLIN -> List.of(Pattern.compile("(?:fun|suspend\\s+fun)\\s+(\\w+\\s*\\([^)]*\\))"));
            case PYTHON -> List.of(Pattern.compile("^\\s*def\\s+(\\w+\\s*\\([^)]*\\))", Pattern.MULTILINE));
            case TYPESCRIPT, JAVASCRIPT -> List.of(
                    Pattern.compile("(?:async\\s+)?(?:function\\s+|(?:public|private|protected)\\s+(?:async\\s+)?)(\\w+\\s*\\([^)]*\\))"));
            case GO -> List.of(Pattern.compile("func\\s+(?:\\([^)]+\\)\\s+)?(\\w+\\s*\\([^)]*\\))"));
            case CSHARP -> List.of(
                    Pattern.compile("(?:public|private|protected|internal)\\s+(?:static\\s+)?(?:async\\s+)?(?:\\w+(?:<[^>]+>)?\\s+)(\\w+\\s*\\([^)]*\\))"));
            case RUBY -> List.of(Pattern.compile("^\\s*def\\s+(\\w+(?:\\([^)]*\\))?)", Pattern.MULTILINE));
            case RUST -> List.of(Pattern.compile("(?:pub\\s+)?(?:async\\s+)?fn\\s+(\\w+\\s*\\([^)]*\\))"));
            default -> List.of();
        };
        return extractMatches(content, patterns, 1);
    }

    private List<String> extractImports(String content, Language lang) {
        List<Pattern> patterns = switch (lang) {
            case JAVA, KOTLIN -> List.of(Pattern.compile("^import\\s+([\\w.]+)", Pattern.MULTILINE));
            case PYTHON -> List.of(
                    Pattern.compile("^(?:from\\s+(\\S+)\\s+import|import\\s+(\\S+))", Pattern.MULTILINE));
            case TYPESCRIPT, JAVASCRIPT -> List.of(
                    Pattern.compile("import\\s+.*?from\\s+['\"]([^'\"]+)['\"]"));
            case GO -> List.of(Pattern.compile("\"([^\"]+)\""));
            case CSHARP -> List.of(Pattern.compile("^using\\s+([\\w.]+)", Pattern.MULTILINE));
            case RUBY -> List.of(Pattern.compile("^require\\s+['\"]([^'\"]+)['\"]", Pattern.MULTILINE));
            case RUST -> List.of(Pattern.compile("^use\\s+([\\w:]+)", Pattern.MULTILINE));
            default -> List.of();
        };

        List<String> results = new ArrayList<>();
        for (Pattern p : patterns) {
            Matcher m = p.matcher(content);
            while (m.find()) {
                for (int i = 1; i <= m.groupCount(); i++) {
                    if (m.group(i) != null) {
                        // Simplify: take last segment of package name
                        String imp = m.group(i);
                        String[] parts = imp.split("[./:]");
                        results.add(parts[parts.length - 1]);
                        break;
                    }
                }
            }
        }
        return results;
    }

    private List<String> extractMatches(String content, List<Pattern> patterns, int group) {
        List<String> results = new ArrayList<>();
        for (Pattern p : patterns) {
            Matcher m = p.matcher(content);
            while (m.find()) {
                results.add(m.group(group).trim());
            }
        }
        return results;
    }

    // ── Git History Analysis (JGit) ──

    private String analyzeGitHistory(Path root, List<Path> files) {
        Path gitDir = root.resolve(".git");
        if (!Files.isDirectory(gitDir)) return null;

        try (Git git = Git.open(root.toFile())) {
            Repository repo = git.getRepository();
            StringBuilder sb = new StringBuilder();
            sb.append("## Git History Analysis\n\n");

            // Collect file change counts
            Map<String, Integer> fileChangeCounts = new HashMap<>();
            Map<String, Set<String>> coChanges = new HashMap<>();
            Instant thirtyDaysAgo = Instant.now().minus(30, ChronoUnit.DAYS);

            LogCommand logCmd = git.log().setMaxCount(MAX_COMMITS);
            Iterable<RevCommit> commits = logCmd.call();

            RevCommit prev = null;
            for (RevCommit commit : commits) {
                if (prev != null) {
                    try (ObjectReader reader = repo.newObjectReader()) {
                        CanonicalTreeParser oldTree = new CanonicalTreeParser();
                        oldTree.reset(reader, prev.getTree());
                        CanonicalTreeParser newTree = new CanonicalTreeParser();
                        newTree.reset(reader, commit.getTree());

                        try (DiffFormatter df = new DiffFormatter(DisabledOutputStream.INSTANCE)) {
                            df.setRepository(repo);
                            List<DiffEntry> diffs = df.scan(oldTree, newTree);
                            Set<String> changedInCommit = new HashSet<>();

                            for (DiffEntry diff : diffs) {
                                String path = diff.getNewPath().equals("/dev/null") ? diff.getOldPath() : diff.getNewPath();
                                String filename = Path.of(path).getFileName().toString();
                                changedInCommit.add(filename);
                                fileChangeCounts.merge(filename, 1, Integer::sum);
                            }

                            // Co-change detection
                            for (String f1 : changedInCommit) {
                                for (String f2 : changedInCommit) {
                                    if (!f1.equals(f2)) {
                                        coChanges.computeIfAbsent(f1, k -> new HashSet<>()).add(f2);
                                    }
                                }
                            }
                        }
                    }
                }
                prev = commit;
            }

            // Report for matched files
            Set<String> matchedNames = new HashSet<>();
            for (Path f : files) matchedNames.add(f.getFileName().toString());

            for (String name : matchedNames) {
                int changes = fileChangeCounts.getOrDefault(name, 0);
                if (changes > 0) {
                    String activity = changes > 10 ? "çok aktif" : changes > 5 ? "aktif" : "stabil";
                    sb.append("- **").append(name).append("**: ").append(changes)
                            .append(" commit (").append(activity).append(")\n");
                }
            }

            // Top co-changes
            sb.append("\nBirlikte değişen dosyalar:\n");
            for (String name : matchedNames) {
                Set<String> partners = coChanges.getOrDefault(name, Set.of());
                if (!partners.isEmpty()) {
                    List<String> top = partners.stream().limit(3).collect(Collectors.toList());
                    sb.append("- ").append(name).append(" ↔ ").append(String.join(", ", top)).append("\n");
                }
            }

            return sb.toString();
        } catch (Exception e) {
            log.warn("Git history analysis failed: {}", e.getMessage());
            return null;
        }
    }

    // ── Module Dependency Graph ──

    @Data
    @Builder
    public static class ModuleMetrics {
        private String moduleName;
        private String packagePath;
        private int fileCount;
        private int publicClassCount;
        private int methodCount;
        @Builder.Default
        private Set<String> dependsOn = new TreeSet<>();
        @Builder.Default
        private Set<String> consumedBy = new TreeSet<>();
        private int gitChangeCount;
    }

    /**
     * Analyze cross-module dependency graph from import statements.
     * Entirely regex-based, no AI tokens spent.
     */
    public Map<String, ModuleMetrics> analyzeModuleGraph(Path projectRoot) {
        if (!Files.isDirectory(projectRoot)) return Map.of();

        try {
            // 1. Detect base package (for Java projects)
            String basePackage = detectBasePackage(projectRoot);

            // 2. Scan all source files
            List<Path> sourceFiles;
            try (var stream = Files.walk(projectRoot, 10)) {
                sourceFiles = stream
                        .filter(Files::isRegularFile)
                        .filter(p -> Language.detect(p.getFileName().toString()) != Language.UNKNOWN)
                        .filter(p -> !isSkippedPath(projectRoot.relativize(p).toString()))
                        .collect(Collectors.toList());
            }

            if (sourceFiles.isEmpty()) return Map.of();

            // 3. Build module metrics
            Map<String, ModuleMetrics> metrics = new TreeMap<>();

            for (Path file : sourceFiles) {
                try {
                    long size = Files.size(file);
                    if (size > MAX_FILE_SIZE) continue;

                    String content = Files.readString(file);
                    String filename = file.getFileName().toString();
                    Language lang = Language.detect(filename);
                    String relativePath = projectRoot.relativize(file).toString();

                    // Determine this file's module
                    String module = resolveModule(content, relativePath, lang, basePackage);
                    if (module == null || module.isBlank()) continue;

                    ModuleMetrics m = metrics.computeIfAbsent(module, k ->
                            ModuleMetrics.builder().moduleName(k).dependsOn(new TreeSet<>()).consumedBy(new TreeSet<>()).build());

                    m.setFileCount(m.getFileCount() + 1);

                    // Count public classes and methods
                    List<String> types = extractTypeDeclarations(content, lang);
                    m.setPublicClassCount(m.getPublicClassCount() + types.size());

                    List<String> methods = extractMethodSignatures(content, lang);
                    m.setMethodCount(m.getMethodCount() + methods.size());

                    // Extract package path from first type declaration context
                    if (m.getPackagePath() == null) {
                        String pkgPath = extractPackagePath(content, lang);
                        if (pkgPath != null) m.setPackagePath(pkgPath);
                    }

                    // Resolve import targets to module names
                    List<String> fullImports = extractFullImports(content, lang);
                    for (String imp : fullImports) {
                        String targetModule = resolveImportToModule(imp, lang, basePackage);
                        if (targetModule != null && !targetModule.equals(module)) {
                            m.getDependsOn().add(targetModule);
                        }
                    }
                } catch (Exception e) {
                    // Skip problematic files silently
                }
            }

            // 4. Build reverse graph (consumedBy)
            for (var entry : metrics.entrySet()) {
                String moduleName = entry.getKey();
                for (String dep : entry.getValue().getDependsOn()) {
                    ModuleMetrics target = metrics.get(dep);
                    if (target != null) {
                        target.getConsumedBy().add(moduleName);
                    }
                }
            }

            // 5. Git change counts per module
            enrichWithGitChangeCounts(projectRoot, metrics, sourceFiles, basePackage);

            log.info("Module graph analysis: {} modules found in {}", metrics.size(), projectRoot);
            return metrics;
        } catch (Exception e) {
            log.warn("Module graph analysis failed: {}", e.getMessage());
            return Map.of();
        }
    }

    /**
     * Format module dependency graph as markdown for AI prompt context.
     */
    public String formatModuleGraph(Map<String, ModuleMetrics> metrics) {
        if (metrics == null || metrics.isEmpty()) return "";

        StringBuilder sb = new StringBuilder();
        sb.append("## Module Dependency Graph\n\n");

        for (var entry : metrics.entrySet().stream()
                .sorted(Comparator.comparing(Map.Entry::getKey))
                .toList()) {
            ModuleMetrics m = entry.getValue();
            sb.append("### ").append(m.getModuleName()).append("\n");
            if (m.getPackagePath() != null) {
                sb.append("  Package: ").append(m.getPackagePath()).append("\n");
            }
            sb.append("  Files: ").append(m.getFileCount());
            sb.append(" | Classes: ").append(m.getPublicClassCount());
            sb.append(" | Methods: ").append(m.getMethodCount()).append("\n");

            if (!m.getDependsOn().isEmpty()) {
                sb.append("  Depends on: ").append(String.join(", ", m.getDependsOn())).append("\n");
            }
            if (!m.getConsumedBy().isEmpty()) {
                sb.append("  Consumed by: ").append(String.join(", ", m.getConsumedBy())).append("\n");
            }
            if (m.getGitChangeCount() > 0) {
                sb.append("  Git activity: ").append(m.getGitChangeCount()).append(" changes\n");
            }
            sb.append("\n");
        }

        return sb.toString();
    }

    // ── Module Graph Helpers ──

    /**
     * Detect the base package for Java/Kotlin projects by looking for the main class or
     * the most common root package across source files.
     */
    private String detectBasePackage(Path projectRoot) {
        // Strategy: find src/main/java and take the common prefix of package declarations
        Path srcMain = projectRoot.resolve("src/main/java");
        if (!Files.isDirectory(srcMain)) return null;

        try (var stream = Files.walk(srcMain, 6)) {
            List<String> packages = stream
                    .filter(Files::isRegularFile)
                    .filter(p -> p.toString().endsWith(".java") || p.toString().endsWith(".kt"))
                    .limit(20)
                    .map(p -> {
                        try {
                            String content = Files.readString(p);
                            Matcher m = Pattern.compile("^package\\s+([\\w.]+)", Pattern.MULTILINE).matcher(content);
                            return m.find() ? m.group(1) : null;
                        } catch (Exception e) { return null; }
                    })
                    .filter(Objects::nonNull)
                    .collect(Collectors.toList());

            if (packages.isEmpty()) return null;

            // Find common prefix
            String first = packages.get(0);
            String[] parts = first.split("\\.");
            int commonLen = parts.length;

            for (String pkg : packages) {
                String[] pp = pkg.split("\\.");
                int len = Math.min(commonLen, pp.length);
                int match = 0;
                for (int i = 0; i < len; i++) {
                    if (parts[i].equals(pp[i])) match++;
                    else break;
                }
                commonLen = match;
            }

            if (commonLen == 0) return null;
            return String.join(".", Arrays.copyOf(parts, commonLen));
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * Resolve a file to its module name based on language and package.
     */
    private String resolveModule(String content, String relativePath, Language lang, String basePackage) {
        return switch (lang) {
            case JAVA, KOTLIN -> {
                Matcher m = Pattern.compile("^package\\s+([\\w.]+)", Pattern.MULTILINE).matcher(content);
                if (m.find()) {
                    String pkg = m.group(1);
                    if (basePackage != null && pkg.startsWith(basePackage + ".")) {
                        String sub = pkg.substring(basePackage.length() + 1);
                        // Take first segment: "service.impl" → "service"
                        int dot = sub.indexOf('.');
                        yield dot > 0 ? sub.substring(0, dot) : sub;
                    }
                    // Fallback: last meaningful segment
                    String[] parts = pkg.split("\\.");
                    yield parts.length > 1 ? parts[parts.length - 1] : pkg;
                }
                yield null;
            }
            case TYPESCRIPT, JAVASCRIPT -> {
                // Use directory structure: src/components/auth/Login.tsx → "components/auth" or "auth"
                String normalized = relativePath.replace('\\', '/');
                // Strip src/ prefix if present
                if (normalized.startsWith("src/")) normalized = normalized.substring(4);
                String[] parts = normalized.split("/");
                if (parts.length >= 2) {
                    // Take first meaningful directory (skip "app", "pages", "lib" as they're common roots)
                    yield parts[0];
                }
                yield null;
            }
            case PYTHON -> {
                // from app.models.user → "models"
                String normalized = relativePath.replace('\\', '/');
                String[] parts = normalized.split("/");
                if (parts.length >= 2) {
                    yield parts[parts.length - 2]; // parent directory as module
                }
                yield null;
            }
            case GO -> {
                Matcher m = Pattern.compile("^package\\s+(\\w+)", Pattern.MULTILINE).matcher(content);
                yield m.find() ? m.group(1) : null;
            }
            default -> null;
        };
    }

    /**
     * Extract full import paths (not simplified like extractImports).
     */
    private List<String> extractFullImports(String content, Language lang) {
        List<String> results = new ArrayList<>();
        List<Pattern> patterns = switch (lang) {
            case JAVA, KOTLIN -> List.of(Pattern.compile("^import\\s+(?:static\\s+)?([\\w.]+)", Pattern.MULTILINE));
            case PYTHON -> List.of(
                    Pattern.compile("^from\\s+(\\S+)\\s+import", Pattern.MULTILINE),
                    Pattern.compile("^import\\s+(\\S+)", Pattern.MULTILINE));
            case TYPESCRIPT, JAVASCRIPT -> List.of(
                    Pattern.compile("import\\s+.*?from\\s+['\"]([^'\"]+)['\"]"),
                    Pattern.compile("require\\s*\\(\\s*['\"]([^'\"]+)['\"]\\s*\\)"));
            case GO -> List.of(Pattern.compile("\"([^\"]+)\""));
            default -> List.of();
        };

        for (Pattern p : patterns) {
            Matcher m = p.matcher(content);
            while (m.find()) {
                String imp = m.group(1);
                if (imp != null && !imp.isBlank()) {
                    results.add(imp);
                }
            }
        }
        return results;
    }

    /**
     * Map an import path to a module name.
     */
    private String resolveImportToModule(String importPath, Language lang, String basePackage) {
        return switch (lang) {
            case JAVA, KOTLIN -> {
                // com.scopesmith.service.UserService → "service"
                if (basePackage != null && importPath.startsWith(basePackage + ".")) {
                    String sub = importPath.substring(basePackage.length() + 1);
                    int dot = sub.indexOf('.');
                    yield dot > 0 ? sub.substring(0, dot) : sub;
                }
                // External dependency — skip
                yield null;
            }
            case TYPESCRIPT, JAVASCRIPT -> {
                // Relative imports: ./components/auth → "components"
                // Alias imports: @/components/auth → "components"
                String normalized = importPath.replace('\\', '/');
                if (normalized.startsWith("./") || normalized.startsWith("../")) {
                    // Relative — hard to resolve without knowing full path context
                    yield null;
                }
                if (normalized.startsWith("@/") || normalized.startsWith("~/")) {
                    normalized = normalized.substring(2);
                }
                // Skip node_modules / external packages
                if (!normalized.contains("/")) yield null;
                String[] parts = normalized.split("/");
                yield parts[0];
            }
            case PYTHON -> {
                // from app.models.user → "models"
                String[] parts = importPath.split("\\.");
                if (parts.length >= 2) {
                    // Skip the root package (e.g., "app"), take next segment
                    yield parts[1];
                }
                yield null;
            }
            case GO -> {
                // "github.com/example/pkg/auth" → "auth"
                String[] parts = importPath.split("/");
                yield parts.length > 0 ? parts[parts.length - 1] : null;
            }
            default -> null;
        };
    }

    /**
     * Extract the package/namespace path from file content.
     */
    private String extractPackagePath(String content, Language lang) {
        return switch (lang) {
            case JAVA, KOTLIN -> {
                Matcher m = Pattern.compile("^package\\s+([\\w.]+)", Pattern.MULTILINE).matcher(content);
                yield m.find() ? m.group(1) : null;
            }
            case CSHARP -> {
                Matcher m = Pattern.compile("^namespace\\s+([\\w.]+)", Pattern.MULTILINE).matcher(content);
                yield m.find() ? m.group(1) : null;
            }
            case GO -> {
                Matcher m = Pattern.compile("^package\\s+(\\w+)", Pattern.MULTILINE).matcher(content);
                yield m.find() ? m.group(1) : null;
            }
            default -> null;
        };
    }

    /**
     * Enrich module metrics with git change counts.
     */
    private void enrichWithGitChangeCounts(Path projectRoot, Map<String, ModuleMetrics> metrics,
                                           List<Path> sourceFiles, String basePackage) {
        Path gitDir = projectRoot.resolve(".git");
        if (!Files.isDirectory(gitDir)) return;

        try (Git git = Git.open(projectRoot.toFile())) {
            Repository repo = git.getRepository();
            Map<String, Integer> moduleChangeCounts = new HashMap<>();

            LogCommand logCmd = git.log().setMaxCount(MAX_COMMITS);
            Iterable<RevCommit> commits = logCmd.call();

            RevCommit prev = null;
            for (RevCommit commit : commits) {
                if (prev != null) {
                    try (ObjectReader reader = repo.newObjectReader()) {
                        CanonicalTreeParser oldTree = new CanonicalTreeParser();
                        oldTree.reset(reader, prev.getTree());
                        CanonicalTreeParser newTree = new CanonicalTreeParser();
                        newTree.reset(reader, commit.getTree());

                        try (DiffFormatter df = new DiffFormatter(DisabledOutputStream.INSTANCE)) {
                            df.setRepository(repo);
                            List<DiffEntry> diffs = df.scan(oldTree, newTree);

                            for (DiffEntry diff : diffs) {
                                String path = diff.getNewPath().equals("/dev/null") ? diff.getOldPath() : diff.getNewPath();
                                String module = resolvePathToModule(path, basePackage);
                                if (module != null) {
                                    moduleChangeCounts.merge(module, 1, Integer::sum);
                                }
                            }
                        }
                    }
                }
                prev = commit;
            }

            // Apply counts to metrics
            for (var entry : moduleChangeCounts.entrySet()) {
                ModuleMetrics m = metrics.get(entry.getKey());
                if (m != null) {
                    m.setGitChangeCount(entry.getValue());
                }
            }
        } catch (Exception e) {
            log.warn("Git enrichment for module graph failed: {}", e.getMessage());
        }
    }

    /**
     * Resolve a git diff file path to a module name (lightweight, path-based only).
     */
    private String resolvePathToModule(String filePath, String basePackage) {
        if (filePath == null) return null;
        String normalized = filePath.replace('\\', '/');

        // Java/Kotlin: src/main/java/com/scopesmith/service/Foo.java → "service"
        if (normalized.contains("src/main/java/") || normalized.contains("src/main/kotlin/")) {
            String after = normalized.contains("src/main/java/")
                    ? normalized.substring(normalized.indexOf("src/main/java/") + 14)
                    : normalized.substring(normalized.indexOf("src/main/kotlin/") + 16);
            // Convert path to package: com/scopesmith/service/Foo.java → com.scopesmith.service
            String[] parts = after.split("/");
            if (parts.length >= 2) {
                // Build package path (minus filename)
                String pkg = String.join(".", Arrays.copyOf(parts, parts.length - 1));
                if (basePackage != null && pkg.startsWith(basePackage + ".")) {
                    String sub = pkg.substring(basePackage.length() + 1);
                    int dot = sub.indexOf('.');
                    return dot > 0 ? sub.substring(0, dot) : sub;
                }
            }
            return null;
        }

        // JS/TS: src/components/auth/Login.tsx → "components"
        if (normalized.startsWith("src/") && (normalized.endsWith(".ts") || normalized.endsWith(".tsx")
                || normalized.endsWith(".js") || normalized.endsWith(".jsx"))) {
            String after = normalized.substring(4);
            String[] parts = after.split("/");
            if (parts.length >= 2) {
                return parts[0];
            }
        }

        // Python: app/models/user.py → "models"
        if (normalized.endsWith(".py")) {
            String[] parts = normalized.split("/");
            if (parts.length >= 2) {
                return parts[parts.length - 2];
            }
        }

        return null;
    }
}
