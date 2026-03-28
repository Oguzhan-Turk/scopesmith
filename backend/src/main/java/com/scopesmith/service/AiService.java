package com.scopesmith.service;

/**
 * Abstraction for AI interactions.
 * Business logic depends on this interface, not on any specific AI provider.
 * <p>
 * Why an interface? (Dependency Inversion Principle)
 * - Our analysis logic shouldn't know or care whether Claude, GPT, or a local model runs behind.
 * - Testing: we can mock this without hitting a real API.
 * - Future: swap providers by changing only the implementation.
 */
public interface AiService {

    /**
     * Sends a prompt to the AI and returns the text response.
     *
     * @param systemPrompt Defines the AI's role and expected output format
     * @param userMessage  The user's input (raw requirement, project context, etc.)
     * @return AI's text response
     */
    String chat(String systemPrompt, String userMessage);

    /**
     * Sends a prompt and maps the response to a Java object.
     * The AI is expected to return valid JSON matching the target class structure.
     *
     * @param systemPrompt Defines the AI's role and expected output format
     * @param userMessage  The user's input
     * @param responseType The class to map the response to
     * @return Parsed response object
     */
    <T> T chatWithStructuredOutput(String systemPrompt, String userMessage, Class<T> responseType);

    /**
     * Simple health check — verifies the AI provider is reachable.
     */
    String healthCheck();
}
