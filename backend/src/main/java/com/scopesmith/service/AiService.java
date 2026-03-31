package com.scopesmith.service;

import com.scopesmith.entity.ModelTier;
import com.scopesmith.entity.OperationType;

/**
 * Abstraction for AI interactions.
 * Business logic depends on this interface, not on any specific AI provider.
 * Supports multi-tier model selection (LIGHT/STANDARD/PREMIUM).
 */
public interface AiService {

    String chat(String systemPrompt, String userMessage);

    /**
     * Chat with usage tracking — uses the operation type's default model tier.
     */
    String chat(String systemPrompt, String userMessage, OperationType operationType, Long projectId);

    /**
     * Chat with explicit model tier override.
     */
    String chat(String systemPrompt, String userMessage,
                OperationType operationType, Long projectId, ModelTier modelTier);

    <T> T chatWithStructuredOutput(String systemPrompt, String userMessage, Class<T> responseType);

    /**
     * Structured output with usage tracking — uses the operation type's default model tier.
     */
    <T> T chatWithStructuredOutput(String systemPrompt, String userMessage, Class<T> responseType,
                                    OperationType operationType, Long projectId);

    /**
     * Structured output with explicit model tier override.
     */
    <T> T chatWithStructuredOutput(String systemPrompt, String userMessage, Class<T> responseType,
                                    OperationType operationType, Long projectId, ModelTier modelTier);

    String healthCheck();
}
