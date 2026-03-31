package com.scopesmith.entity;

/**
 * AI model tiers — cost vs capability tradeoff.
 * Model names are configured in application.yml (scopesmith.models.*).
 */
public enum ModelTier {
    LIGHT,     // Haiku — summarization, extraction, simple tasks
    STANDARD,  // Sonnet — requirement analysis, task breakdown
    PREMIUM    // Opus — complex/critical analysis
}
