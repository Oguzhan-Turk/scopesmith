package com.scopesmith.entity;

import lombok.Getter;

@Getter
public enum OperationType {
    REQUIREMENT_ANALYSIS(ModelTier.STANDARD),
    TASK_BREAKDOWN(ModelTier.STANDARD),
    TASK_REFINEMENT(ModelTier.STANDARD),
    STAKEHOLDER_SUMMARY(ModelTier.STANDARD),
    SUMMARY_REFINEMENT(ModelTier.STANDARD),
    PROJECT_CONTEXT(ModelTier.STANDARD),
    PROJECT_CONTEXT_STRUCTURED(ModelTier.STANDARD),
    CHANGE_IMPACT(ModelTier.STANDARD),
    HEALTH_CHECK(ModelTier.LIGHT),
    DOCUMENT_SUMMARY(ModelTier.LIGHT),
    SP_SUGGESTION(ModelTier.LIGHT),
    FEATURE_SUGGESTION(ModelTier.STANDARD);

    private final ModelTier defaultTier;

    OperationType(ModelTier defaultTier) {
        this.defaultTier = defaultTier;
    }
}
