package com.scopesmith.controller;

import com.scopesmith.config.PromptLoader;
import com.scopesmith.entity.Prompt;
import com.scopesmith.repository.PromptRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ClassPathResource;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/prompts")
@RequiredArgsConstructor
public class PromptController {

    private final PromptRepository promptRepository;
    private final PromptLoader promptLoader;

    @GetMapping
    public List<Prompt> listAll() {
        return promptRepository.findAll();
    }

    @GetMapping("/{name}")
    public Prompt getByName(@PathVariable String name) {
        return promptRepository.findByName(name)
                .orElseThrow(() -> new EntityNotFoundException("Prompt not found: " + name));
    }

    @PutMapping("/{name}")
    public Prompt update(@PathVariable String name, @RequestBody Map<String, String> request) {
        String content = request.get("content");
        if (content == null || content.isBlank()) {
            throw new IllegalArgumentException("content cannot be empty");
        }

        Prompt prompt = promptRepository.findByName(name)
                .orElseThrow(() -> new EntityNotFoundException("Prompt not found: " + name));

        prompt.setContent(content);
        prompt.setVersion(prompt.getVersion() + 1);

        promptLoader.clearCache(name);

        return promptRepository.save(prompt);
    }

    @PostMapping("/{name}/reset")
    public Prompt resetToDefault(@PathVariable String name) {
        Prompt prompt = promptRepository.findByName(name)
                .orElseThrow(() -> new EntityNotFoundException("Prompt not found: " + name));

        try {
            ClassPathResource resource = new ClassPathResource("prompts/" + name + ".txt");
            String defaultContent = resource.getContentAsString(StandardCharsets.UTF_8);
            prompt.setContent(defaultContent);
            prompt.setVersion(prompt.getVersion() + 1);
            promptLoader.clearCache(name);
            return promptRepository.save(prompt);
        } catch (Exception e) {
            throw new IllegalStateException("Default prompt file not found: " + name);
        }
    }
}
