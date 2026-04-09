package com.scopesmith.service;

import com.scopesmith.entity.Task;
import com.scopesmith.repository.TaskRepository;
import com.scopesmith.util.StructuredContextFormatter;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

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
     * Includes: project context, structured modules/entities, sibling tasks,
     * affected modules, "önce oku" guidance, acceptance criteria.
     */
    public String buildPrompt(Long taskId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new EntityNotFoundException("Task not found: " + taskId));

        StringBuilder prompt = new StringBuilder();

        String techContext = task.getAnalysis().getRequirement().getProject().getTechContext();
        String claudeMd = task.getAnalysis().getRequirement().getProject().getClaudeMdContent();
        String projectName = task.getAnalysis().getRequirement().getProject().getName();
        String structuredContextJson = task.getAnalysis().getRequirement().getProject().getStructuredContext();
        String affectedModules = task.getAnalysis().getAffectedModules();

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

        // "Önce Oku" — tell Claude Code which modules to read before coding
        if (affectedModules != null && !affectedModules.isBlank()) {
            prompt.append("## Önce Oku (Before Coding)\n");
            prompt.append("Kodlamaya başlamadan önce şu modülleri ve ilgili dosyaları incele:\n");
            for (String module : affectedModules.split(",\\s*")) {
                prompt.append("- **").append(module.trim()).append("**\n");
            }
            prompt.append("\n");
        }

        // Analysis context
        String analysis = task.getAnalysis().getStructuredSummary();
        if (analysis != null) {
            prompt.append("## Analiz Özeti\n");
            prompt.append(analysis).append("\n\n");
        }

        // Structured context: modules, entities, tech stack
        String structuredSection = StructuredContextFormatter.format(structuredContextJson);
        if (!structuredSection.isEmpty()) {
            prompt.append(structuredSection);
        }

        // Sibling tasks — other tasks in the same analysis
        String siblings = buildSiblingTasksSection(task);
        if (siblings != null) {
            prompt.append(siblings);
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
        prompt.append("- Yukarıdaki \"Önce Oku\" modüllerini incele, sonra kodlamaya başla\n");
        prompt.append("- Sibling task'larla çakışmaktan kaçın — paralel geliştirme yapılıyor\n");
        prompt.append("- Yeni dosyalar oluşturulabilir, mevcut dosyalar düzenlenebilir\n");
        prompt.append("- Test yazılmalı\n");
        prompt.append("- Kabul kriterlerinin hepsini karşıla\n");

        log.info("Claude Code prompt generated for task #{} ({} chars)", taskId, prompt.length());
        return prompt.toString();
    }

    /**
     * Lists sibling tasks (same analysis, different task) as context.
     * Helps Claude Code understand what else is being worked on in parallel.
     */
    private String buildSiblingTasksSection(Task currentTask) {
        List<Task> siblings = taskRepository.findByAnalysisId(currentTask.getAnalysis().getId())
                .stream()
                .filter(t -> !t.getId().equals(currentTask.getId()))
                .toList();

        if (siblings.isEmpty()) return null;

        StringBuilder sb = new StringBuilder();
        sb.append("## Bu Analizdeki Diğer Task'lar\n");
        sb.append("Aynı gereksinim için paralel yürütülen task'lar. Çakışmaktan kaçın:\n");
        for (Task s : siblings) {
            int sp = s.getSpFinal() != null ? s.getSpFinal() : (s.getSpSuggestion() != null ? s.getSpSuggestion() : 0);
            sb.append(String.format("- [%s] %s (%d SP)%s\n",
                    s.getCategory() != null ? s.getCategory() : "—",
                    s.getTitle(),
                    sp,
                    s.getJiraKey() != null ? " → " + s.getJiraKey() : ""));
        }
        sb.append("\n");
        return sb.toString();
    }
}
