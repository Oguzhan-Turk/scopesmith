package com.scopesmith.service.validation;

import com.scopesmith.dto.AnalysisResult;
import com.scopesmith.entity.Question;
import com.scopesmith.repository.QuestionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class QuestionDeduplicationService {

    private final QuestionRepository questionRepository;

    /**
     * Removes questions that have already been asked in previous analyses
     * for the same requirement (cross-analysis deduplication).
     */
    public List<AnalysisResult.QuestionItem> deduplicate(
            List<AnalysisResult.QuestionItem> newQuestions, Long requirementId) {
        if (newQuestions == null || newQuestions.isEmpty() || requirementId == null) {
            return newQuestions;
        }

        // Get all existing questions for this requirement (across all analyses)
        List<Question> existing = questionRepository.findByAnalysis_Requirement_Id(requirementId);
        Set<String> existingNormalized = existing.stream()
            .map(q -> normalize(q.getQuestionText()))
            .collect(Collectors.toSet());

        List<AnalysisResult.QuestionItem> result = new ArrayList<>();
        for (AnalysisResult.QuestionItem qi : newQuestions) {
            String norm = normalize(qi.getQuestion());
            if (!existingNormalized.contains(norm)) {
                result.add(qi);
                existingNormalized.add(norm); // dedup within batch too
            } else {
                log.info("Cross-analysis dedup: removed previously asked question '{}'", qi.getQuestion());
            }
        }

        if (result.size() < newQuestions.size()) {
            log.info("Question deduplication removed {} of {} questions for requirement #{}",
                newQuestions.size() - result.size(), newQuestions.size(), requirementId);
        }

        return result;
    }

    private String normalize(String text) {
        if (text == null) return "";
        return text.toLowerCase(Locale.ENGLISH)
            .replaceAll("[^a-z0-9\\s]", "")
            .replaceAll("\\s+", " ")
            .trim();
    }
}
