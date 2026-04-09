package com.scopesmith.service;

import com.scopesmith.entity.*;
import com.scopesmith.repository.AnalysisRepository;
import com.scopesmith.repository.QuestionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Project Intelligence Insights — Layer 3
 *
 * Combines three intelligence features into a single prompt enrichment mechanism:
 * 1. Context Staleness Detection — warns if project context is outdated
 * 2. Pattern Detection — identifies recurring risk patterns, hot modules, common questions
 * 3. Cross-Project Learning — references similar analyses from other projects
 *
 * Zero additional AI calls — all insights are computed via SQL and injected into
 * the existing analysis prompt as an "## Intelligence Insights" section.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class InsightService {

    private final AnalysisRepository analysisRepository;
    private final QuestionRepository questionRepository;
    private final EmbeddingService embeddingService;

    private static final int STALENESS_THRESHOLD_DAYS = 7;
    private static final int MAX_ANSWERED_QUESTIONS = 15;
    private static final int MAX_CROSS_PROJECT_REFS = 3;

    /**
     * Build the complete intelligence insights section for prompt injection.
     * Accepts full Requirement to enable semantic similarity (embedding-based).
     */
    @Transactional(readOnly = true)
    public String buildInsightsSection(Requirement requirement) {
        return buildInsightsSection(requirement.getProject(), requirement.getType(), requirement);
    }

    /**
     * Backward-compatible overload (used by reAnalyze, refine paths without embedding context).
     */
    @Transactional(readOnly = true)
    public String buildInsightsSection(Project project, RequirementType currentType) {
        return buildInsightsSection(project, currentType, null);
    }

    @Transactional(readOnly = true)
    private String buildInsightsSection(Project project, RequirementType currentType, Requirement requirement) {
        StringBuilder insights = new StringBuilder();
        boolean hasContent = false;

        // 1. Context Staleness
        String staleness = buildStalenessInsight(project);
        if (staleness != null) {
            insights.append(staleness);
            hasContent = true;
        }

        // 2. Semantic Similarity (Organizational Memory — requires OPENAI_API_KEY)
        if (requirement != null) {
            String semantic = buildSemanticSimilaritySection(requirement);
            if (semantic != null) {
                insights.append(semantic);
                hasContent = true;
            }
        }

        // 3. Pattern Detection
        String patterns = buildPatternInsight(project.getId());
        if (patterns != null) {
            insights.append(patterns);
            hasContent = true;
        }

        // 4. Previously Answered Questions
        String questions = buildAnsweredQuestionsInsight(project.getId());
        if (questions != null) {
            insights.append(questions);
            hasContent = true;
        }

        // 5. Cross-Project Learning
        String crossProject = buildCrossProjectInsight(project.getId(), currentType);
        if (crossProject != null) {
            insights.append(crossProject);
            hasContent = true;
        }

        if (!hasContent) return null;

        return "## Project Intelligence Insights\n" + insights;
    }

    /**
     * Get staleness info for frontend display.
     */
    public StalenessInfo getStalenessInfo(Project project) {
        if (project.getLastScannedAt() == null) {
            return new StalenessInfo(null, null, false, null);
        }

        long daysSince = ChronoUnit.DAYS.between(project.getLastScannedAt(), LocalDateTime.now());
        long hoursSince = ChronoUnit.HOURS.between(project.getLastScannedAt(), LocalDateTime.now());
        long minutesSince = ChronoUnit.MINUTES.between(project.getLastScannedAt(), LocalDateTime.now());
        Integer commitsBehind = getGitCommitDiff(project);
        boolean isStale = daysSince > STALENESS_THRESHOLD_DAYS || (commitsBehind != null && commitsBehind > 10);

        String warning = null;
        if (isStale) {
            String timeAgo;
            if (minutesSince < 60) timeAgo = minutesSince + " dakika önce";
            else if (hoursSince < 48) timeAgo = hoursSince + " saat önce";
            else timeAgo = daysSince + " gün önce";

            warning = "Context " + timeAgo + " tarandı";
            if (commitsBehind != null && commitsBehind > 0) {
                warning += String.format(", %d commit geride", commitsBehind);
            }
        }

        return new StalenessInfo((int) daysSince, commitsBehind, isStale, warning);
    }

    public record StalenessInfo(
            Integer daysSinceLastScan,
            Integer commitsBehind,
            boolean isStale,
            String warningMessage
    ) {}

    // === Private builders ===

    private String buildSemanticSimilaritySection(Requirement requirement) {
        if (!embeddingService.isEnabled()) return null;

        var similar = embeddingService.findSimilar(
                requirement.getProject().getId(),
                requirement.getId(),
                requirement.getRawText()
        );
        if (similar.isEmpty()) return null;

        log.info("Found {} semantically similar requirements for req #{}", similar.size(), requirement.getId());

        StringBuilder sb = new StringBuilder();
        sb.append("### Benzer Geçmiş Talepler (Semantic Similarity)\n");
        sb.append("Aşağıdaki benzer talepler daha önce analiz edildi. Bunlara dayanarak kalıpları, riskleri ve sık sorulan soruları tahmin edebilirsin:\n\n");

        for (var s : similar) {
            sb.append(String.format("**Benzerlik: %.0f%%**\n", s.similarity() * 100));
            sb.append(String.format("- Talep: %s\n", truncate(s.rawText(), 120)));
            if (s.summary() != null) sb.append(String.format("- Özet: %s\n", truncate(s.summary(), 150)));
            if (s.riskLevel() != null) sb.append(String.format("- Risk: %s\n", s.riskLevel()));
            if (s.affectedModules() != null) sb.append(String.format("- Modüller: %s\n", s.affectedModules()));
            sb.append("\n");
        }
        return sb.toString();
    }

    private String buildStalenessInsight(Project project) {
        if (project.getLastScannedAt() == null) return null;

        long daysSince = ChronoUnit.DAYS.between(project.getLastScannedAt(), LocalDateTime.now());
        Integer commitsBehind = getGitCommitDiff(project);

        if (daysSince <= STALENESS_THRESHOLD_DAYS && (commitsBehind == null || commitsBehind <= 5)) {
            return null; // Context is fresh
        }

        StringBuilder sb = new StringBuilder();
        sb.append("### Context Staleness Warning\n");
        long hoursSince2 = ChronoUnit.HOURS.between(project.getLastScannedAt(), LocalDateTime.now());
        String timeLabel = hoursSince2 < 48 ? hoursSince2 + " saat" : daysSince + " gün";
        sb.append(String.format("Proje context'i %s önce tarandı.", timeLabel));
        if (commitsBehind != null && commitsBehind > 0) {
            sb.append(String.format(" Son taramadan bu yana %d commit yapılmış.", commitsBehind));
        }
        sb.append("\nContext güncel olmayabilir — referans verdiğin modüllerin hâlâ mevcut olduğunu doğrula.\n\n");
        return sb.toString();
    }

    private String buildPatternInsight(Long projectId) {
        List<Object[]> riskDist = analysisRepository.countByRiskLevelForProject(projectId);
        List<Analysis> analyses = analysisRepository.findByProjectId(projectId);

        if (analyses.isEmpty()) return null;

        StringBuilder sb = new StringBuilder();
        sb.append("### Proje Desenleri (Pattern Detection)\n");

        // Risk distribution
        if (!riskDist.isEmpty()) {
            sb.append("Risk dağılımı: ");
            for (Object[] row : riskDist) {
                sb.append(String.format("%s: %d analiz, ", row[0], ((Number) row[1]).intValue()));
            }
            sb.setLength(sb.length() - 2); // remove trailing ", "
            sb.append("\n");
        }

        // Hot modules — most frequently affected
        Map<String, Integer> moduleFrequency = new HashMap<>();
        for (Analysis a : analyses) {
            if (a.getAffectedModules() != null) {
                for (String module : a.getAffectedModules().split(",\\s*")) {
                    moduleFrequency.merge(module.trim(), 1, Integer::sum);
                }
            }
        }
        List<Map.Entry<String, Integer>> hotModules = moduleFrequency.entrySet().stream()
                .filter(e -> e.getValue() >= 2) // at least 2 times
                .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
                .limit(5)
                .toList();

        if (!hotModules.isEmpty()) {
            sb.append("Sık etkilenen modüller (değişim riski yüksek): ");
            for (var entry : hotModules) {
                sb.append(String.format("%s (%dx), ", entry.getKey(), entry.getValue()));
            }
            sb.setLength(sb.length() - 2);
            sb.append("\n");
        }

        sb.append("\n");
        return sb.toString();
    }

    private String buildAnsweredQuestionsInsight(Long projectId) {
        List<Question> answered = questionRepository.findAnsweredByProjectId(projectId);
        if (answered.isEmpty()) return null;

        StringBuilder sb = new StringBuilder();
        sb.append("### Daha Önce Cevaplanan Sorular\n");
        sb.append("Bu proje için daha önce şu sorular soruldu ve cevaplandı. Aynı soruları tekrar sorma:\n");

        int count = 0;
        for (Question q : answered) {
            if (count >= MAX_ANSWERED_QUESTIONS) break;
            sb.append(String.format("- S: \"%s\" → C: \"%s\"\n", q.getQuestionText(), q.getAnswer()));
            count++;
        }
        sb.append("\n");
        return sb.toString();
    }

    private String buildCrossProjectInsight(Long currentProjectId, RequirementType type) {
        List<Analysis> otherAnalyses = analysisRepository.findByOtherProjectsAndType(currentProjectId, type);
        if (otherAnalyses.isEmpty()) return null;

        StringBuilder sb = new StringBuilder();
        sb.append("### Diğer Projelerden Referanslar (Cross-Project Learning)\n");

        int count = 0;
        for (Analysis a : otherAnalyses) {
            if (count >= MAX_CROSS_PROJECT_REFS) break;
            String projectName = a.getRequirement().getProject().getName();
            sb.append(String.format("- [%s] \"%s\" → Risk: %s, Etkilenen: %s\n",
                    projectName,
                    truncate(a.getStructuredSummary(), 80),
                    a.getRiskLevel(),
                    a.getAffectedModules() != null ? a.getAffectedModules() : "—"));
            count++;
        }
        sb.append("\n");
        return sb.toString();
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
            String output = new BufferedReader(new InputStreamReader(process.getInputStream()))
                    .readLine();
            int exitCode = process.waitFor();

            if (exitCode == 0 && output != null) {
                return Integer.parseInt(output.trim());
            }
        } catch (Exception e) {
            log.debug("Could not determine git commit diff for project {}: {}", project.getId(), e.getMessage());
        }
        return null;
    }

    private String truncate(String text, int maxLen) {
        if (text == null) return "";
        return text.length() > maxLen ? text.substring(0, maxLen) + "..." : text;
    }
}
