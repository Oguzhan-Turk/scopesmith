package com.scopesmith.dto;

import com.fasterxml.jackson.annotation.JsonPropertyOrder;
import com.scopesmith.dto.enums.RiskLevel;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

/**
 * Structured output from Claude's change impact analysis.
 * All list fields default to empty for graceful degradation.
 */
@Data
@JsonPropertyOrder({"changeSummary", "changes", "affectedTasks", "newTasksNeeded", "scopeImpact", "newRiskLevel", "riskReason", "stakeholderSummary"})
public class ChangeImpactResult {

    private String changeSummary;
    private List<String> changes = new ArrayList<>();
    private List<String> affectedTasks = new ArrayList<>();
    private List<String> newTasksNeeded = new ArrayList<>();
    private String scopeImpact;
    private RiskLevel newRiskLevel = RiskLevel.MEDIUM;
    private String riskReason;
    private String stakeholderSummary;
}
