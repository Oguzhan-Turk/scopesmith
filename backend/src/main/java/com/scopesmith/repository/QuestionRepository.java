package com.scopesmith.repository;

import com.scopesmith.entity.Question;
import com.scopesmith.entity.QuestionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface QuestionRepository extends JpaRepository<Question, Long> {
    List<Question> findByAnalysisId(Long analysisId);
    List<Question> findByAnalysisIdAndStatus(Long analysisId, QuestionStatus status);
    List<Question> findByAnalysis_Requirement_Id(Long requirementId);

    /**
     * Find answered questions for a project — used by InsightService to prevent re-asking.
     */
    @Query("SELECT q FROM Question q JOIN q.analysis a JOIN a.requirement r " +
            "WHERE r.project.id = :projectId AND q.status = 'ANSWERED' " +
            "ORDER BY q.id DESC")
    List<Question> findAnsweredByProjectId(@Param("projectId") Long projectId);
}
