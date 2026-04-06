package com.scopesmith.service.validation;

import com.scopesmith.dto.AnalysisResult;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.*;

@Component
@Slf4j
public class AnalysisResultValidator {

    public AnalysisResult validate(AnalysisResult result, ValidationContext context) {
        if (result == null) return result;

        // Deduplicate lists
        deduplicateList(result.getAmbiguities());
        deduplicateList(result.getMissingInfo());
        deduplicateList(result.getContradictions());
        deduplicateList(result.getAssumptions());

        // Deduplicate questions within result (by normalized text)
        if (result.getQuestions() != null && result.getQuestions().size() > 1) {
            Set<String> seen = new HashSet<>();
            List<AnalysisResult.QuestionItem> deduped = new ArrayList<>();
            for (AnalysisResult.QuestionItem q : result.getQuestions()) {
                String norm = normalize(q.getQuestion());
                if (seen.add(norm)) {
                    deduped.add(q);
                } else {
                    log.info("Removed duplicate question: '{}'", q.getQuestion());
                }
            }
            result.setQuestions(deduped);
        }

        // Verify affected modules against known modules
        if (result.getAffectedModules() != null && !context.getKnownModules().isEmpty()) {
            List<String> verified = new ArrayList<>();
            List<String> unverified = new ArrayList<>();
            for (String module : result.getAffectedModules()) {
                boolean matched = context.getKnownModules().stream()
                    .anyMatch(known -> containsIgnoreCase(known, module) || containsIgnoreCase(module, known));
                if (matched) {
                    verified.add(module);
                } else {
                    unverified.add(module);
                }
            }
            // Only remove if SOME matched — if none matched, AI may know something context doesn't
            if (!verified.isEmpty() && !unverified.isEmpty()) {
                log.warn("Removed {} unverified affected modules: {}", unverified.size(), unverified);
                result.setAffectedModules(verified);
            } else if (verified.isEmpty() && !unverified.isEmpty()) {
                log.info("No affected modules matched project context, keeping AI suggestions: {}", unverified);
            }
        }

        return result;
    }

    private void deduplicateList(List<String> list) {
        if (list == null || list.size() <= 1) return;
        Set<String> seen = new LinkedHashSet<>();
        list.removeIf(item -> !seen.add(item));
    }

    private String normalize(String text) {
        if (text == null) return "";
        return text.toLowerCase(Locale.ENGLISH)
            .replaceAll("[^a-z0-9\\s]", "")
            .replaceAll("\\s+", " ")
            .trim();
    }

    private boolean containsIgnoreCase(String a, String b) {
        return a != null && b != null && a.toLowerCase(Locale.ENGLISH).contains(b.toLowerCase(Locale.ENGLISH));
    }
}
