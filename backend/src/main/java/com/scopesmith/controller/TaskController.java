package com.scopesmith.controller;

import com.scopesmith.dto.SpDecisionRequest;
import com.scopesmith.dto.SpSuggestionResult;
import com.scopesmith.dto.TaskResponse;
import com.scopesmith.dto.TaskUpdateRequest;
import com.scopesmith.entity.Task;
import com.scopesmith.repository.TaskRepository;
import com.scopesmith.service.ClaudeCodeService;
import com.scopesmith.service.TaskBreakdownService;
import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/tasks")
@RequiredArgsConstructor
public class TaskController {

    private final TaskRepository taskRepository;
    private final TaskBreakdownService taskBreakdownService;
    private final ClaudeCodeService claudeCodeService;

    /**
     * Update task fields — partial update, only non-null fields applied.
     */
    @PutMapping("/{id}")
    public TaskResponse updateTask(
            @PathVariable Long id,
            @RequestBody TaskUpdateRequest request) {
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Task not found with id: " + id));

        if (request.getTitle() != null && !request.getTitle().isBlank()) task.setTitle(request.getTitle());
        if (request.getDescription() != null) task.setDescription(request.getDescription());
        if (request.getAcceptanceCriteria() != null) task.setAcceptanceCriteria(request.getAcceptanceCriteria());
        if (request.getPriority() != null) {
            try { task.setPriority(com.scopesmith.entity.TaskPriority.valueOf(request.getPriority().toUpperCase(java.util.Locale.ENGLISH))); }
            catch (Exception ignored) {}
        }
        if (request.getCategory() != null) {
            task.setCategory(request.getCategory().isBlank() ? null : request.getCategory().toUpperCase(java.util.Locale.ENGLISH));
        }
        if (request.getSpRationale() != null) task.setSpRationale(request.getSpRationale());

        return TaskResponse.from(taskRepository.save(task));
    }

    /**
     * Set the team's final SP decision for a task.
     * This feeds back into the Learning SP system — future estimates
     * will reference this decision for calibration.
     */
    @PutMapping("/{id}/sp-decision")
    public TaskResponse setSpDecision(
            @PathVariable Long id,
            @Valid @RequestBody SpDecisionRequest request) {
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Task not found with id: " + id));

        task.setSpFinal(request.getSpFinal());
        return TaskResponse.from(taskRepository.save(task));
    }

    @PutMapping("/{id}/category")
    public TaskResponse setCategory(
            @PathVariable Long id,
            @RequestBody java.util.Map<String, String> request) {
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Task not found with id: " + id));

        String category = request.get("category");
        if (category == null || category.isBlank()) {
            throw new IllegalArgumentException("category cannot be empty");
        }
        task.setCategory(category.toUpperCase(java.util.Locale.ENGLISH));
        return TaskResponse.from(taskRepository.save(task));
    }

    @PostMapping("/{id}/suggest-sp")
    public SpSuggestionResult suggestSp(@PathVariable Long id) {
        return taskBreakdownService.suggestSpForTask(id);
    }

    @GetMapping("/{id}/claude-code-prompt")
    public java.util.Map<String, String> getClaudeCodePrompt(@PathVariable Long id) {
        String prompt = claudeCodeService.buildPrompt(id);
        return java.util.Map.of("prompt", prompt);
    }
}
