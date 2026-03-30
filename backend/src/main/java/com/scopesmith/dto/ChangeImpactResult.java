package com.scopesmith.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

/**
 * Structured output from Claude's change impact analysis.
 * All list fields default to empty for graceful degradation.
 */
@Data
public class ChangeImpactResult {

    private String changeSummary;
    private List<String> changes = new ArrayList<>();
    private List<String> affectedTasks = new ArrayList<>();
    private List<String> newTasksNeeded = new ArrayList<>();
    private String scopeImpact;
    private String newRiskLevel = "MEDIUM";
    private String riskReason;
    private String stakeholderSummary;
}
