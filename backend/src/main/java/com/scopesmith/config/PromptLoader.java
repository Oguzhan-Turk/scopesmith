package com.scopesmith.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Loads prompt templates from classpath resources.
 * Prompts are cached on first load — restart to pick up changes.
 * (DevTools hot reload handles this during development.)
 *
 * Why not hardcoded strings in services?
 * - Prompt engineering requires frequent iteration
 * - Separating prompts from code keeps services clean
 * - Future: load from DB for runtime updates without redeploy
 */
@Component
@Slf4j
public class PromptLoader {

    private final Map<String, String> cache = new ConcurrentHashMap<>();

    public String load(String promptName) {
        return cache.computeIfAbsent(promptName, name -> {
            try {
                ClassPathResource resource = new ClassPathResource("prompts/" + name + ".txt");
                String content = resource.getContentAsString(StandardCharsets.UTF_8);
                log.info("Loaded prompt: {} ({} chars)", name, content.length());
                return content;
            } catch (IOException e) {
                log.error("Failed to load prompt: {}", name, e);
                throw new RuntimeException("Prompt not found: " + name, e);
            }
        });
    }
}
