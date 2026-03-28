package com.scopesmith.dto;

import lombok.Data;

import java.util.List;

/**
 * Structured output from Claude's requirement analysis.
 * Spring AI maps Claude's JSON response directly to this class.
 */
@Data
public class AnalysisResult {

    /** Structured, clear summary of what is being requested */
    private String structuredSummary;

    /** Points that are unclear or ambiguous in the requirement */
    private List<String> ambiguities;

    /** Information that is missing and needed for implementation */
    private List<String> missingInfo;

    /** Contradictions found within the requirement */
    private List<String> contradictions;

    /** Assumptions the AI made to fill gaps */
    private List<String> assumptions;

    /** Questions to ask the PO/stakeholder */
    private List<String> questions;

    /** Existing modules/services that would be affected */
    private List<String> affectedModules;

    /** Overall risk level: LOW, MEDIUM, HIGH */
    private String riskLevel;

    /** Explanation of why this risk level was assigned */
    private String riskReason;
}
