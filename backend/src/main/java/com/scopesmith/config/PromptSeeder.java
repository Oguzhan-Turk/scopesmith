package com.scopesmith.config;

import com.scopesmith.entity.Prompt;
import com.scopesmith.repository.PromptRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;

/**
 * Seeds prompt templates from classpath files into the database on first run.
 * Only inserts if a prompt with that name doesn't already exist.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class PromptSeeder implements ApplicationRunner {

    private final PromptRepository promptRepository;

    private static final String[] PROMPT_NAMES = {
            "requirement-analysis",
            "bug-analysis",
            "task-breakdown",
            "task-breakdown-refine",
            "stakeholder-summary",
            "stakeholder-summary-refine",
            "change-impact",
            "project-context",
            "project-context-structured"
    };

    @Override
    public void run(ApplicationArguments args) {
        int seeded = 0;
        for (String name : PROMPT_NAMES) {
            if (promptRepository.findByName(name).isEmpty()) {
                try {
                    ClassPathResource resource = new ClassPathResource("prompts/" + name + ".txt");
                    String content = resource.getContentAsString(StandardCharsets.UTF_8);

                    Prompt prompt = Prompt.builder()
                            .name(name)
                            .content(content)
                            .build();
                    promptRepository.save(prompt);
                    seeded++;
                    log.info("Seeded prompt: {}", name);
                } catch (Exception e) {
                    log.warn("Could not seed prompt {}: {}", name, e.getMessage());
                }
            }
        }
        if (seeded > 0) {
            log.info("Seeded {} prompts into database", seeded);
        }
    }
}
