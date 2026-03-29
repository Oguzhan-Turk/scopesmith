package com.scopesmith.dto;

import lombok.Data;

import java.util.List;

/**
 * Structured output from Claude's change impact analysis.
 */
@Data
public class ChangeImpactResult {

    /** Summary of what changed between versions */
    private String changeSummary;

    /** List of specific changes identified */
    private List<String> changes;

    /** Existing tasks that are affected by the change */
    private List<String> affectedTasks;

    /** New tasks that might be needed */
    private List<String> newTasksNeeded;

    /** Scope change description (e.g., "grew by ~30%") */
    private String scopeImpact;

    /** Updated risk level after the change */
    private String newRiskLevel;

    /** Why the risk level changed (or stayed the same) */
    private String riskReason;

    /** Stakeholder-friendly impact summary */
    private String stakeholderSummary;
}
