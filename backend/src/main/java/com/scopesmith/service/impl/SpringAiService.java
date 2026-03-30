package com.scopesmith.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.scopesmith.entity.OperationType;
import com.scopesmith.service.AiService;
import com.scopesmith.service.UsageTrackingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.metadata.Usage;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class SpringAiService implements AiService {

    private final ChatClient.Builder chatClientBuilder;
    private final UsageTrackingService usageTrackingService;
    private final ObjectMapper objectMapper;

    @Override
    public String chat(String systemPrompt, String userMessage) {
        return chat(systemPrompt, userMessage, null, null);
    }

    @Override
    public String chat(String systemPrompt, String userMessage,
                       OperationType operationType, Long projectId) {
        log.debug("AI request — system: {} chars, user: {} chars", systemPrompt.length(), userMessage.length());

        long startTime = System.currentTimeMillis();
        ChatResponse chatResponse = chatClientBuilder.build()
                .prompt()
                .system(systemPrompt)
                .user(userMessage)
                .call()
                .chatResponse();

        long durationMs = System.currentTimeMillis() - startTime;
        String content = chatResponse.getResult().getOutput().getText();

        log.debug("AI response — {} chars, {}ms", content != null ? content.length() : 0, durationMs);

        if (operationType != null) {
            trackUsage(chatResponse, operationType, projectId, durationMs);
        }

        return content;
    }

    @Override
    public <T> T chatWithStructuredOutput(String systemPrompt, String userMessage, Class<T> responseType) {
        return chatWithStructuredOutput(systemPrompt, userMessage, responseType, null, null);
    }

    @Override
    public <T> T chatWithStructuredOutput(String systemPrompt, String userMessage, Class<T> responseType,
                                           OperationType operationType, Long projectId) {
        log.debug("AI structured request — type: {}, system: {} chars, user: {} chars",
                responseType.getSimpleName(), systemPrompt.length(), userMessage.length());

        long startTime = System.currentTimeMillis();

        // Single API call — get chatResponse for both content and token metadata
        ChatResponse chatResponse = chatClientBuilder.build()
                .prompt()
                .system(systemPrompt)
                .user(userMessage)
                .call()
                .chatResponse();

        long durationMs = System.currentTimeMillis() - startTime;

        if (operationType != null) {
            trackUsage(chatResponse, operationType, projectId, durationMs);
        }

        // Parse JSON response to target type manually
        String content = chatResponse.getResult().getOutput().getText();
        try {
            // Clean potential markdown code block wrapping
            String json = content.trim();
            if (json.startsWith("```")) {
                json = json.replaceFirst("```(?:json)?\\s*", "").replaceFirst("\\s*```$", "");
            }
            T entity = objectMapper.readValue(json, responseType);
            log.debug("AI structured response — parsed to {}, {}ms", responseType.getSimpleName(), durationMs);
            return entity;
        } catch (Exception e) {
            log.error("Failed to parse AI response to {}: {}", responseType.getSimpleName(), e.getMessage());
            throw new RuntimeException("AI response could not be parsed to " + responseType.getSimpleName(), e);
        }
    }

    @Override
    public String healthCheck() {
        return chat(
                "You are a helpful assistant.",
                "Say 'ScopeSmith AI is ready!' in exactly those words.",
                OperationType.HEALTH_CHECK, null
        );
    }

    private void trackUsage(ChatResponse chatResponse, OperationType operationType,
                            Long projectId, long durationMs) {
        try {
            Usage usage = chatResponse.getMetadata().getUsage();
            String model = chatResponse.getMetadata().getModel();

            usageTrackingService.record(
                    operationType,
                    projectId,
                    usage.getPromptTokens(),
                    usage.getCompletionTokens(),
                    model != null ? model : "unknown",
                    durationMs
            );
        } catch (Exception e) {
            log.warn("Failed to track AI usage: {}", e.getMessage());
        }
    }
}
