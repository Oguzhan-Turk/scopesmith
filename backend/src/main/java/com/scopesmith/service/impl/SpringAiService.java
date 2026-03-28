package com.scopesmith.service.impl;

import com.scopesmith.service.AiService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Service;

/**
 * Spring AI implementation of AiService.
 * Uses ChatClient (Spring AI's high-level abstraction) backed by Anthropic Claude.
 * <p>
 * If we ever switch to OpenAI or another provider, only this class changes.
 * All business logic depends on the AiService interface, not this implementation.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SpringAiService implements AiService {

    private final ChatClient.Builder chatClientBuilder;

    @Override
    public String chat(String systemPrompt, String userMessage) {
        log.debug("AI request — system prompt: {} chars, user message: {} chars",
                systemPrompt.length(), userMessage.length());

        String response = chatClientBuilder.build()
                .prompt()
                .system(systemPrompt)
                .user(userMessage)
                .call()
                .content();

        log.debug("AI response — {} chars", response != null ? response.length() : 0);
        return response;
    }

    @Override
    public <T> T chatWithStructuredOutput(String systemPrompt, String userMessage, Class<T> responseType) {
        log.debug("AI structured request — type: {}, system: {} chars, user: {} chars",
                responseType.getSimpleName(), systemPrompt.length(), userMessage.length());

        T response = chatClientBuilder.build()
                .prompt()
                .system(systemPrompt)
                .user(userMessage)
                .call()
                .entity(responseType);

        log.debug("AI structured response — parsed to {}", responseType.getSimpleName());
        return response;
    }

    @Override
    public String healthCheck() {
        return chat(
                "You are a helpful assistant.",
                "Say 'ScopeSmith AI is ready!' in exactly those words."
        );
    }
}
