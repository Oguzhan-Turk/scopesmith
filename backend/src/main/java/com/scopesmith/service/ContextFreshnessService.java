package com.scopesmith.service;

import com.scopesmith.dto.ContextFreshnessResponse;
import com.scopesmith.entity.Analysis;
import com.scopesmith.entity.Project;
import com.scopesmith.repository.AnalysisRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class ContextFreshnessService {

    private final AnalysisRepository analysisRepository;

    @Transactional(readOnly = true)
    public ContextFreshnessResponse evaluate(Project project) {
        Integer commitsBehind = getGitCommitDiff(project);
        List<String> changedFiles = getChangedFiles(project);
        List<String> impactedModules = deriveImpactedModules(changedFiles);
        long daysSinceScan = project.getLastScannedAt() == null
                ? 999
                : ChronoUnit.DAYS.between(project.getLastScannedAt(), LocalDateTime.now());

        int freshnessScore = calculateFreshnessScore(daysSinceScan, commitsBehind, changedFiles.size());
        int confidence = calculateContextConfidence(commitsBehind, changedFiles.size(), impactedModules.size());

        String status = freshnessScore >= 80 ? "FRESH" : "STALE";
        if (project.getLastScannedAt() == null || project.getLastScannedCommitHash() == null || project.getLocalPath() == null) {
            status = "NO_BASELINE";
        }

        String recommendation;
        String reason;
        if ("NO_BASELINE".equals(status)) {
            recommendation = "FULL_REFRESH";
            reason = "Commit bazlı kıyas için baseline yok. Tam tarama önerilir.";
        } else if (commitsBehind != null && commitsBehind <= 0) {
            recommendation = "NO_ACTION";
            reason = "Son taramadan beri yeni commit görünmüyor.";
        } else if (confidence >= 60 && !impactedModules.isEmpty()) {
            recommendation = "PARTIAL_REFRESH";
            reason = "Etkilenen modüller belirlenebildi. Kısmi yeniden analiz yapılabilir.";
        } else {
            recommendation = "FULL_REFRESH";
            reason = "Değişiklik dağılımı geniş veya güven düşük. Tam tarama daha güvenli.";
        }

        return ContextFreshnessResponse.builder()
                .status(status)
                .commitsBehind(commitsBehind)
                .changedFiles(changedFiles.size())
                .impactedModules(impactedModules)
                .analysisFreshnessScore(freshnessScore)
                .contextConfidence(confidence)
                .recommendation(recommendation)
                .reason(reason)
                .build();
    }

    @Transactional(readOnly = true)
    public List<Analysis> findImpactedLatestAnalyses(Long projectId, List<String> impactedModules, int limit) {
        if (impactedModules == null || impactedModules.isEmpty()) {
            return List.of();
        }
        Set<String> lowered = impactedModules.stream()
                .map(s -> s.toLowerCase(Locale.ENGLISH))
                .collect(java.util.stream.Collectors.toSet());

        return analysisRepository.findLatestByProjectId(projectId).stream()
                .filter(a -> intersectsModules(a.getAffectedModules(), lowered))
                .limit(Math.max(1, limit))
                .toList();
    }

    public List<String> deriveImpactedModules(List<String> changedFiles) {
        if (changedFiles == null || changedFiles.isEmpty()) {
            return List.of();
        }
        Set<String> modules = new LinkedHashSet<>();
        for (String path : changedFiles) {
            if (path == null || path.isBlank()) continue;
            String normalized = path.replace('\\', '/');
            String[] parts = normalized.split("/");
            List<String> candidates = new ArrayList<>();
            for (String part : parts) {
                if (part == null || part.isBlank()) continue;
                String token = part.toLowerCase(Locale.ENGLISH);
                if (Set.of("src", "main", "test", "java", "com", "scopesmith", "resources", "backend", "frontend").contains(token)) {
                    continue;
                }
                if (token.endsWith(".java") || token.endsWith(".ts") || token.endsWith(".tsx") || token.endsWith(".js")) {
                    continue;
                }
                candidates.add(part);
            }
            if (!candidates.isEmpty()) {
                modules.add(candidates.get(0));
            }
        }
        return modules.stream().limit(8).toList();
    }

    private boolean intersectsModules(String affectedModules, Set<String> impactedLower) {
        if (affectedModules == null || affectedModules.isBlank()) {
            return false;
        }
        String[] parts = affectedModules.split(",\\s*");
        for (String p : parts) {
            String candidate = p.toLowerCase(Locale.ENGLISH);
            if (impactedLower.contains(candidate)) {
                return true;
            }
            for (String impacted : impactedLower) {
                if (candidate.contains(impacted) || impacted.contains(candidate)) {
                    return true;
                }
            }
        }
        return false;
    }

    private int calculateFreshnessScore(long daysSinceScan, Integer commitsBehind, int changedFiles) {
        int score = 100;
        score -= Math.min((int) daysSinceScan * 5, 35);
        if (commitsBehind != null) score -= Math.min(commitsBehind * 4, 45);
        score -= Math.min(changedFiles * 2, 20);
        return clamp(score);
    }

    private int calculateContextConfidence(Integer commitsBehind, int changedFiles, int impactedModules) {
        int score = 100;
        if (commitsBehind != null) score -= Math.min(commitsBehind * 3, 45);
        score -= Math.min(changedFiles * 2, 30);
        if (impactedModules > 6) score -= 10;
        return clamp(score);
    }

    private int clamp(int value) {
        return Math.max(5, Math.min(100, value));
    }

    private Integer getGitCommitDiff(Project project) {
        if (project.getLocalPath() == null || project.getLastScannedCommitHash() == null) {
            return null;
        }

        try {
            ProcessBuilder pb = new ProcessBuilder(
                    "git", "rev-list", "--count",
                    project.getLastScannedCommitHash() + "..HEAD"
            );
            pb.directory(new java.io.File(project.getLocalPath()));
            pb.redirectErrorStream(true);

            Process process = pb.start();
            String output = new BufferedReader(new InputStreamReader(process.getInputStream())).readLine();
            int exitCode = process.waitFor();
            if (exitCode == 0 && output != null) {
                return Integer.parseInt(output.trim());
            }
        } catch (Exception e) {
            log.debug("Could not determine git commit diff for project {}: {}", project.getId(), e.getMessage());
        }
        return null;
    }

    private List<String> getChangedFiles(Project project) {
        if (project.getLocalPath() == null || project.getLastScannedCommitHash() == null) {
            return List.of();
        }

        try {
            ProcessBuilder pb = new ProcessBuilder(
                    "git", "diff", "--name-only",
                    project.getLastScannedCommitHash(), "HEAD"
            );
            pb.directory(new java.io.File(project.getLocalPath()));
            pb.redirectErrorStream(true);

            Process process = pb.start();
            List<String> lines = new BufferedReader(new InputStreamReader(process.getInputStream()))
                    .lines()
                    .filter(line -> line != null && !line.isBlank())
                    .toList();
            int exitCode = process.waitFor();
            if (exitCode == 0) {
                return lines;
            }
        } catch (Exception e) {
            log.debug("Could not read changed files for project {}: {}", project.getId(), e.getMessage());
        }
        return List.of();
    }
}
