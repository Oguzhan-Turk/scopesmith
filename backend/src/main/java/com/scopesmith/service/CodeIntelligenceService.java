package com.scopesmith.service;

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
}
