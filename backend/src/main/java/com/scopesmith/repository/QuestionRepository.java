package com.scopesmith.repository;

import com.scopesmith.entity.Question;
import com.scopesmith.entity.QuestionStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface QuestionRepository extends JpaRepository<Question, Long> {
    List<Question> findByAnalysisId(Long analysisId);
    List<Question> findByAnalysisIdAndStatus(Long analysisId, QuestionStatus status);
}
