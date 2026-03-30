package com.scopesmith.config;

import com.scopesmith.entity.Prompt;
import com.scopesmith.repository.PromptRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Loads prompt templates with DB-first, file-fallback strategy.
 * DB prompts enable runtime editing without redeploy.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class PromptLoader {

    private final PromptRepository promptRepository;
    private final Map<String, String> cache = new ConcurrentHashMap<>();

    public String load(String promptName) {
        return cache.computeIfAbsent(promptName, name -> {
            // 1. Try DB first
            Optional<Prompt> dbPrompt = promptRepository.findByName(name);
            if (dbPrompt.isPresent()) {
                log.info("Loaded prompt from DB: {} (v{}, {} chars)",
                        name, dbPrompt.get().getVersion(), dbPrompt.get().getContent().length());
                return dbPrompt.get().getContent();
            }

            // 2. Fall back to classpath file
            try {
                ClassPathResource resource = new ClassPathResource("prompts/" + name + ".txt");
                String content = resource.getContentAsString(StandardCharsets.UTF_8);
                log.info("Loaded prompt from file: {} ({} chars)", name, content.length());
                return content;
            } catch (IOException e) {
                log.error("Failed to load prompt: {}", name, e);
                throw new RuntimeException("Prompt not found: " + name, e);
            }
        });
    }

    /**
     * Clear cache — must be called after prompt update.
     */
    public void clearCache() {
        cache.clear();
        log.info("Prompt cache cleared");
    }

    /**
     * Clear a single prompt from cache.
     */
    public void clearCache(String promptName) {
        cache.remove(promptName);
        log.info("Prompt cache cleared for: {}", promptName);
    }
}
