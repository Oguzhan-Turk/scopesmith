package com.scopesmith.dto;

import com.scopesmith.entity.Analysis;
import com.scopesmith.entity.Question;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class AnalysisResponse {

    private Long id;
    private Long requirementId;
    private String structuredSummary;
    private String assumptions;
    private String riskLevel;
    private String riskReason;
    private String affectedModules;
    private Integer requirementVersion;
    private List<QuestionResponse> questions;
    private LocalDateTime createdAt;

    @Data
    @Builder
    public static class QuestionResponse {
        private Long id;
        private String questionText;
        private String answer;
        private String status;
    }

    public static AnalysisResponse from(Analysis analysis) {
        List<QuestionResponse> questionResponses = analysis.getQuestions().stream()
                .map(q -> QuestionResponse.builder()
                        .id(q.getId())
                        .questionText(q.getQuestionText())
                        .answer(q.getAnswer())
                        .status(q.getStatus().name())
                        .build())
                .toList();

        return AnalysisResponse.builder()
                .id(analysis.getId())
                .requirementId(analysis.getRequirement().getId())
                .structuredSummary(analysis.getStructuredSummary())
                .assumptions(analysis.getAssumptions())
                .riskLevel(analysis.getRiskLevel())
                .riskReason(analysis.getRiskReason())
                .affectedModules(analysis.getAffectedModules())
                .requirementVersion(analysis.getRequirementVersion())
                .questions(questionResponses)
                .createdAt(analysis.getCreatedAt())
                .build();
    }
}
