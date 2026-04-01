package com.scopesmith.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.scopesmith.config.ModelProperties;
import com.scopesmith.entity.ModelTier;
import com.scopesmith.entity.OperationType;
import com.scopesmith.service.AiService;
import com.scopesmith.service.UsageTrackingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.anthropic.AnthropicChatOptions;
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
    private final ModelProperties modelProperties;

    @Override
    public String chat(String systemPrompt, String userMessage) {
        return chat(systemPrompt, userMessage, null, null, null);
    }

    @Override
    public String chat(String systemPrompt, String userMessage,
                       OperationType operationType, Long projectId) {
        return chat(systemPrompt, userMessage, operationType, projectId, null);
    }

    @Override
    public String chat(String systemPrompt, String userMessage,
                       OperationType operationType, Long projectId, ModelTier modelTier) {
        ModelTier effectiveTier = resolveEffectiveTier(operationType, modelTier);
        String modelName = modelProperties.getModelName(effectiveTier);

        log.debug("AI request [{}] — model: {}, system: {} chars, user: {} chars",
                effectiveTier, modelName, systemPrompt.length(), userMessage.length());

        long startTime = System.currentTimeMillis();
        ChatResponse chatResponse = chatClientBuilder.build()
                .prompt()
                .system(systemPrompt)
                .user(userMessage)
                .options(AnthropicChatOptions.builder().model(modelName).build())
                .call()
                .chatResponse();

        long durationMs = System.currentTimeMillis() - startTime;
        String content = chatResponse.getResult().getOutput().getText();

        log.debug("AI response [{}] — {} chars, {}ms", effectiveTier,
                content != null ? content.length() : 0, durationMs);

        if (operationType != null) {
            trackUsage(chatResponse, operationType, projectId, durationMs);
        }

        if (content == null || content.isBlank()) {
            throw new RuntimeException("AI returned empty response for " + effectiveTier + " tier");
        }

        return content;
    }

    @Override
    public <T> T chatWithStructuredOutput(String systemPrompt, String userMessage, Class<T> responseType) {
        return chatWithStructuredOutput(systemPrompt, userMessage, responseType, null, null, null);
    }

    @Override
    public <T> T chatWithStructuredOutput(String systemPrompt, String userMessage, Class<T> responseType,
                                           OperationType operationType, Long projectId) {
        return chatWithStructuredOutput(systemPrompt, userMessage, responseType, operationType, projectId, null);
    }

    @Override
    public <T> T chatWithStructuredOutput(String systemPrompt, String userMessage, Class<T> responseType,
                                           OperationType operationType, Long projectId, ModelTier modelTier) {
        ModelTier effectiveTier = resolveEffectiveTier(operationType, modelTier);
        String modelName = modelProperties.getModelName(effectiveTier);

        log.debug("AI structured request [{}] — model: {}, type: {}, system: {} chars, user: {} chars",
                effectiveTier, modelName, responseType.getSimpleName(),
                systemPrompt.length(), userMessage.length());

        long startTime = System.currentTimeMillis();

        String jsonSystemPrompt = systemPrompt + "\n\nIMPORTANT: Return your response as a valid JSON object only. " +
                "Do not include any text, markdown, or explanation before or after the JSON. " +
                "The JSON must match the structure of " + responseType.getSimpleName() + ".";

        ChatResponse chatResponse = chatClientBuilder.build()
                .prompt()
                .system(jsonSystemPrompt)
                .user(userMessage)
                .options(AnthropicChatOptions.builder().model(modelName).build())
                .call()
                .chatResponse();

        long durationMs = System.currentTimeMillis() - startTime;

        if (operationType != null) {
            trackUsage(chatResponse, operationType, projectId, durationMs);
        }

        String content = chatResponse.getResult().getOutput().getText();
        try {
            String json = extractJson(content);
            T entity = objectMapper.readValue(json, responseType);
            log.debug("AI structured response [{}] — parsed to {}, {}ms",
                    effectiveTier, responseType.getSimpleName(), durationMs);
            return entity;
        } catch (Exception e) {
            log.error("Failed to parse AI response to {}: {}", responseType.getSimpleName(), e.getMessage());
            log.debug("Raw AI response: {}", content);
            throw new RuntimeException("AI response could not be parsed to " + responseType.getSimpleName(), e);
        }
    }

    @Override
    public String healthCheck() {
        return chat(
                "You are a helpful assistant.",
                "Say 'ScopeSmith AI is ready!' in exactly those words.",
                OperationType.HEALTH_CHECK, null, ModelTier.LIGHT
        );
    }

    /**
     * Resolve effective tier: explicit override > operation default > STANDARD fallback.
     */
    private ModelTier resolveEffectiveTier(OperationType operationType, ModelTier modelTier) {
        if (modelTier != null) return modelTier;
        if (operationType != null) return operationType.getDefaultTier();
        return ModelTier.STANDARD;
    }

    /**
     * Extract JSON from AI response — handles markdown code blocks and leading text.
     */
    private String extractJson(String content) {
        if (content == null) throw new RuntimeException("AI returned null response");
        String text = content.trim();

        if (text.contains("```")) {
            int start = text.indexOf("```");
            int contentStart = text.indexOf('\n', start);
            int end = text.lastIndexOf("```");
            if (contentStart > 0 && end > contentStart) {
                text = text.substring(contentStart + 1, end).trim();
            }
        }

        int braceIdx = text.indexOf('{');
        int bracketIdx = text.indexOf('[');
        int startIdx = -1;
        if (braceIdx >= 0 && bracketIdx >= 0) startIdx = Math.min(braceIdx, bracketIdx);
        else if (braceIdx >= 0) startIdx = braceIdx;
        else if (bracketIdx >= 0) startIdx = bracketIdx;

        if (startIdx > 0) text = text.substring(startIdx);

        int lastBrace = text.lastIndexOf('}');
        int lastBracket = text.lastIndexOf(']');
        int endIdx = Math.max(lastBrace, lastBracket);
        if (endIdx > 0 && endIdx < text.length() - 1) text = text.substring(0, endIdx + 1);

        return text;
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
