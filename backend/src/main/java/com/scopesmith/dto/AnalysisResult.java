package com.scopesmith.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

/**
 * Structured output from Claude's requirement analysis.
 * All list fields default to empty to prevent NullPointerException
 * when AI returns incomplete JSON.
 */
@Data
public class AnalysisResult {

    private String structuredSummary;
    private List<String> ambiguities = new ArrayList<>();
    private List<String> missingInfo = new ArrayList<>();
    private List<String> contradictions = new ArrayList<>();
    private List<String> assumptions = new ArrayList<>();
    private List<QuestionItem> questions = new ArrayList<>();
    private List<String> affectedModules = new ArrayList<>();
    private String riskLevel = "MEDIUM";
    private String riskReason;

    @Data
    public static class QuestionItem {
        private String question;
        private String suggestedAnswer;
    }
}
