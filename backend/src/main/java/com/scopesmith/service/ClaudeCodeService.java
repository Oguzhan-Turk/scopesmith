package com.scopesmith.service;

import com.scopesmith.entity.Task;
import com.scopesmith.repository.TaskRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * Generates Claude Code-compatible prompts from tasks.
 * Level A: Export prompt (user copies to CLI)
 * Level B: SDK integration (programmatic CLI invocation) — future
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ClaudeCodeService {

    private final TaskRepository taskRepository;

    /**
     * Build a Claude Code prompt from a task.
     * Includes project context, task details, acceptance criteria, and coding guidelines.
     */
    public String buildPrompt(Long taskId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new EntityNotFoundException("Task not found: " + taskId));

        StringBuilder prompt = new StringBuilder();

        // Project context
        String techContext = task.getAnalysis().getRequirement().getProject().getTechContext();
        String claudeMd = task.getAnalysis().getRequirement().getProject().getClaudeMdContent();
        String projectName = task.getAnalysis().getRequirement().getProject().getName();

        prompt.append("# Task Implementation\n\n");
        prompt.append("**Proje:** ").append(projectName).append("\n\n");

        // Task details
        prompt.append("## Görev\n");
        prompt.append("**Başlık:** ").append(task.getTitle()).append("\n\n");

        if (task.getDescription() != null && !task.getDescription().isBlank()) {
            prompt.append("**Açıklama:**\n").append(task.getDescription()).append("\n\n");
        }

        if (task.getAcceptanceCriteria() != null && !task.getAcceptanceCriteria().isBlank()) {
            prompt.append("**Kabul Kriterleri:**\n").append(task.getAcceptanceCriteria()).append("\n\n");
        }

        // SP and priority context
        int sp = task.getSpFinal() != null ? task.getSpFinal() : (task.getSpSuggestion() != null ? task.getSpSuggestion() : 0);
        prompt.append("**Story Points:** ").append(sp).append("\n");
        prompt.append("**Öncelik:** ").append(task.getPriority()).append("\n");
        if (task.getCategory() != null) {
            prompt.append("**Kategori:** ").append(task.getCategory()).append("\n");
        }
        if (task.getDependency() != null) {
            prompt.append("**Bağımlılık:** ").append(task.getDependency().getTitle()).append("\n");
        }
        prompt.append("\n");

        // Analysis context
        String analysis = task.getAnalysis().getStructuredSummary();
        if (analysis != null) {
            prompt.append("## Analiz Özeti\n");
            prompt.append(analysis).append("\n\n");
        }

        // CLAUDE.md context
        if (claudeMd != null && !claudeMd.isBlank()) {
            prompt.append("## Proje Kuralları (CLAUDE.md)\n");
            prompt.append(claudeMd).append("\n\n");
        }

        // Project tech context (truncated for prompt size)
        if (techContext != null) {
            String truncated = techContext.length() > 3000
                    ? techContext.substring(0, 3000) + "\n... (truncated)"
                    : techContext;
            prompt.append("## Proje Yapısı\n");
            prompt.append(truncated).append("\n\n");
        }

        // Instructions
        prompt.append("## Talimatlar\n");
        prompt.append("Bu görevi implement et. Mevcut kod yapısına ve proje kurallarına uy.\n");
        prompt.append("- Yeni dosyalar oluşturulabilir, mevcut dosyalar düzenlenebilir\n");
        prompt.append("- Test yazılmalı\n");
        prompt.append("- Kabul kriterlerinin hepsini karşıla\n");

        log.info("Claude Code prompt generated for task #{} ({} chars)", taskId, prompt.length());
        return prompt.toString();
    }
}
