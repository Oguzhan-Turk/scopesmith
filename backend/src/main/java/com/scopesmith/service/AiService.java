package com.scopesmith.service;

import com.scopesmith.entity.OperationType;

/**
 * Abstraction for AI interactions.
 * Business logic depends on this interface, not on any specific AI provider.
 */
public interface AiService {

    String chat(String systemPrompt, String userMessage);

    /**
     * Chat with usage tracking — records token usage and cost.
     */
    String chat(String systemPrompt, String userMessage, OperationType operationType, Long projectId);

    <T> T chatWithStructuredOutput(String systemPrompt, String userMessage, Class<T> responseType);

    /**
     * Structured output with usage tracking.
     */
    <T> T chatWithStructuredOutput(String systemPrompt, String userMessage, Class<T> responseType,
                                    OperationType operationType, Long projectId);

    String healthCheck();
}
