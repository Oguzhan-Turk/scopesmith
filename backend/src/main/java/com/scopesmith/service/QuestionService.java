package com.scopesmith.service;

import com.scopesmith.dto.AnalysisResponse;
import com.scopesmith.entity.Analysis;
import com.scopesmith.entity.Question;
import com.scopesmith.entity.QuestionStatus;
import com.scopesmith.repository.QuestionRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class QuestionService {

    private final QuestionRepository questionRepository;
    private final RequirementAnalysisService analysisService;

    /**
     * Answer a question and check if all questions are answered.
     * If all questions are answered, triggers a re-analysis with the new context.
     *
     * @return Updated analysis (new one if re-analysis triggered, existing otherwise)
     */
    @Transactional
    public AnalysisResponse answer(Long questionId, String answerText) {
        Question question = questionRepository.findById(questionId)
                .orElseThrow(() -> new EntityNotFoundException("Question not found with id: " + questionId));

        // Update question
        question.setAnswer(answerText);
        question.setStatus(QuestionStatus.ANSWERED);
        question.setAnsweredAt(LocalDateTime.now());
        questionRepository.save(question);

        Analysis currentAnalysis = question.getAnalysis();
        log.info("Question #{} answered for analysis #{}", questionId, currentAnalysis.getId());

        // Check if all questions in this analysis are answered
        List<Question> openQuestions = questionRepository
                .findByAnalysisIdAndStatus(currentAnalysis.getId(), QuestionStatus.OPEN);

        if (openQuestions.isEmpty()) {
            log.info("All questions answered for analysis #{}. Triggering re-analysis.", currentAnalysis.getId());
            Analysis newAnalysis = analysisService.reAnalyze(currentAnalysis);
            return AnalysisResponse.from(newAnalysis);
        }

        log.info("{} questions still open for analysis #{}", openQuestions.size(), currentAnalysis.getId());
        return AnalysisResponse.from(currentAnalysis);
    }

    /**
     * Dismiss a question — marks it as not relevant.
     */
    @Transactional
    public AnalysisResponse dismiss(Long questionId) {
        Question question = questionRepository.findById(questionId)
                .orElseThrow(() -> new EntityNotFoundException("Question not found with id: " + questionId));

        question.setStatus(QuestionStatus.DISMISSED);
        questionRepository.save(question);

        Analysis currentAnalysis = question.getAnalysis();

        // Check if all remaining questions are answered/dismissed
        List<Question> openQuestions = questionRepository
                .findByAnalysisIdAndStatus(currentAnalysis.getId(), QuestionStatus.OPEN);

        if (openQuestions.isEmpty()) {
            log.info("All questions resolved for analysis #{}. Triggering re-analysis.", currentAnalysis.getId());
            Analysis newAnalysis = analysisService.reAnalyze(currentAnalysis);
            return AnalysisResponse.from(newAnalysis);
        }

        return AnalysisResponse.from(currentAnalysis);
    }
}
