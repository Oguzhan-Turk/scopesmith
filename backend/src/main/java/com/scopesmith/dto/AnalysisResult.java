package com.scopesmith.dto;

import com.fasterxml.jackson.annotation.JsonPropertyOrder;
import com.scopesmith.dto.enums.QuestionType;
import com.scopesmith.dto.enums.RiskLevel;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

/**
 * Structured output from Claude's requirement analysis.
 * All list fields default to empty to prevent NullPointerException
 * when AI returns incomplete JSON.
 */
@Data
@JsonPropertyOrder({"structuredSummary", "ambiguities", "missingInfo", "contradictions", "assumptions", "questions", "affectedModules", "riskLevel", "riskReason"})
public class AnalysisResult {

    private String structuredSummary;
    private List<String> ambiguities = new ArrayList<>();
    private List<String> missingInfo = new ArrayList<>();
    private List<String> contradictions = new ArrayList<>();
    private List<String> assumptions = new ArrayList<>();
    private List<QuestionItem> questions = new ArrayList<>();
    private List<String> affectedModules = new ArrayList<>();
    private RiskLevel riskLevel = RiskLevel.MEDIUM;
    private String riskReason;

    @Data
    @JsonPropertyOrder({"question", "suggestedAnswer", "type", "options"})
    public static class QuestionItem {
        private String question;
        private String suggestedAnswer;
        private QuestionType type = QuestionType.OPEN;
        private List<String> options; // choices for SINGLE/MULTIPLE_CHOICE
    }
}
