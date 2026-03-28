package com.scopesmith.entity;

public enum RequirementStatus {
    DRAFT,          // Just created, not analyzed yet
    ANALYZING,      // AI analysis in progress
    ANALYZED,       // Analysis complete, questions may be open
    CLARIFYING,     // Waiting for answers to questions
    READY,          // All questions answered, tasks generated
    APPROVED        // PO approved the analysis
}
