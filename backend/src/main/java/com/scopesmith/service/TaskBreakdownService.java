package com.scopesmith.service;

import com.scopesmith.config.PromptLoader;
import com.scopesmith.dto.TaskBreakdownResult;
import com.scopesmith.dto.TaskResponse;
import com.scopesmith.entity.*;
import com.scopesmith.repository.AnalysisRepository;
import com.scopesmith.repository.TaskRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class TaskBreakdownService {

    private final AiService aiService;
    private final AnalysisRepository analysisRepository;
    private final TaskRepository taskRepository;
    private final PromptLoader promptLoader;

    private static final long MIN_TASKS_FOR_CALIBRATION = 20;

    @Transactional
    public List<TaskResponse> generateTasks(Long analysisId) {
        Analysis analysis = analysisRepository.findById(analysisId)
                .orElseThrow(() -> new EntityNotFoundException("Analysis not found with id: " + analysisId));

        if (!analysis.getTasks().isEmpty()) {
            throw new IllegalStateException("Tasks already exist for analysis #" + analysisId
                    + ". Use the refine endpoint to modify existing tasks.");
        }

        String userMessage = buildTaskBreakdownMessage(analysis);

        log.info("Generating task breakdown for analysis #{}", analysisId);
        TaskBreakdownResult result = aiService.chatWithStructuredOutput(
                promptLoader.load("task-breakdown"), userMessage, TaskBreakdownResult.class);
        log.info("Task breakdown complete for analysis #{}. {} tasks generated.",
                analysisId, result.getTasks().size());

        // Save tasks — handle dependencies by title matching
        Map<String, Task> savedTasks = new HashMap<>();

        for (TaskBreakdownResult.TaskItem item : result.getTasks()) {
            Task task = Task.builder()
                    .analysis(analysis)
                    .title(item.getTitle())
                    .description(item.getDescription())
                    .acceptanceCriteria(item.getAcceptanceCriteria())
                    .spSuggestion(item.getSpSuggestion())
                    .spRationale(item.getSpRationale())
                    .priority(parsePriority(item.getPriority()))
                    .build();

            // Link dependency if specified
            if (item.getDependsOn() != null && savedTasks.containsKey(item.getDependsOn())) {
                task.setDependency(savedTasks.get(item.getDependsOn()));
            }

            Task saved = taskRepository.save(task);
            savedTasks.put(saved.getTitle(), saved);
            analysis.getTasks().add(saved);
        }

        // Update requirement status
        analysis.getRequirement().setStatus(RequirementStatus.READY);

        return analysis.getTasks().stream()
                .map(TaskResponse::from)
                .toList();
    }

    @Transactional
    public List<TaskResponse> refineTasks(Long analysisId, String instruction) {
        Analysis analysis = analysisRepository.findById(analysisId)
                .orElseThrow(() -> new EntityNotFoundException("Analysis not found with id: " + analysisId));

        if (analysis.getTasks().isEmpty()) {
            throw new IllegalStateException("No existing tasks to refine for analysis #" + analysisId);
        }

        // Build message with current tasks + instruction
        StringBuilder userMessage = new StringBuilder();
        userMessage.append("## Current Tasks\n");
        for (Task task : analysis.getTasks()) {
            int sp = task.getSpFinal() != null ? task.getSpFinal() :
                    (task.getSpSuggestion() != null ? task.getSpSuggestion() : 0);
            userMessage.append(String.format("- %s (%d SP, %s priority): %s\n",
                    task.getTitle(), sp, task.getPriority().name(), task.getDescription()));
        }
        userMessage.append("\n## Analysis Context\n");
        userMessage.append(analysis.getStructuredSummary());
        userMessage.append("\n\n## Refinement Instruction\n");
        userMessage.append(instruction);

        log.info("Refining tasks for analysis #{}", analysisId);
        TaskBreakdownResult result = aiService.chatWithStructuredOutput(
                promptLoader.load("task-breakdown-refine"), userMessage.toString(), TaskBreakdownResult.class);
        log.info("Task refinement complete for analysis #{}. {} tasks generated.", analysisId, result.getTasks().size());

        // Delete old tasks
        taskRepository.deleteAll(analysis.getTasks());
        analysis.getTasks().clear();

        // Save new tasks
        Map<String, Task> savedTasks = new HashMap<>();
        for (TaskBreakdownResult.TaskItem item : result.getTasks()) {
            Task task = Task.builder()
                    .analysis(analysis)
                    .title(item.getTitle())
                    .description(item.getDescription())
                    .acceptanceCriteria(item.getAcceptanceCriteria())
                    .spSuggestion(item.getSpSuggestion())
                    .spRationale(item.getSpRationale())
                    .priority(parsePriority(item.getPriority()))
                    .build();

            if (item.getDependsOn() != null && savedTasks.containsKey(item.getDependsOn())) {
                task.setDependency(savedTasks.get(item.getDependsOn()));
            }

            Task saved = taskRepository.save(task);
            savedTasks.put(saved.getTitle(), saved);
            analysis.getTasks().add(saved);
        }

        return analysis.getTasks().stream()
                .map(TaskResponse::from)
                .toList();
    }

    private String buildTaskBreakdownMessage(Analysis analysis) {
        StringBuilder message = new StringBuilder();
        Requirement requirement = analysis.getRequirement();

        // Project context
        String techContext = requirement.getProject().getTechContext();
        if (techContext != null && !techContext.isBlank()) {
            message.append("## Project Context\n");
            message.append(techContext);
            message.append("\n\n");
        }

        // Original requirement
        message.append("## Original Requirement\n");
        message.append(requirement.getRawText());
        message.append("\n\n");

        // Analysis summary
        message.append("## Analysis Summary\n");
        message.append(analysis.getStructuredSummary());
        message.append("\n\n");

        // Assumptions
        if (analysis.getAssumptions() != null && !analysis.getAssumptions().isBlank()) {
            message.append("## Assumptions\n");
            message.append(analysis.getAssumptions());
            message.append("\n\n");
        }

        // Risk
        message.append("## Risk Assessment\n");
        message.append("Level: ").append(analysis.getRiskLevel()).append("\n");
        message.append("Reason: ").append(analysis.getRiskReason()).append("\n\n");

        // Affected modules
        if (analysis.getAffectedModules() != null) {
            message.append("## Affected Modules\n");
            message.append(analysis.getAffectedModules());
            message.append("\n\n");
        }

        // Q&A if available
        if (!analysis.getQuestions().isEmpty()) {
            boolean hasAnswers = analysis.getQuestions().stream()
                    .anyMatch(q -> q.getStatus() == QuestionStatus.ANSWERED);
            if (hasAnswers) {
                message.append("## Clarification Q&A\n");
                for (Question q : analysis.getQuestions()) {
                    if (q.getStatus() == QuestionStatus.ANSWERED) {
                        message.append("**Q:** ").append(q.getQuestionText()).append("\n");
                        message.append("**A:** ").append(q.getAnswer()).append("\n\n");
                    }
                }
            }
        }

        // Historical task data for Learning SP (ADR-003)
        Long projectId = requirement.getProject().getId();
        long finalizedCount = taskRepository.countFinalizedTasksByProjectId(projectId);

        if (finalizedCount > 0) {
            List<Task> historicalTasks = taskRepository.findFinalizedTasksByProjectId(projectId);

            message.append("## Historical Task Data (Learning SP)\n");

            if (finalizedCount >= MIN_TASKS_FOR_CALIBRATION) {
                // Layer 1: Team calibration
                double avgSuggested = historicalTasks.stream()
                        .filter(t -> t.getSpSuggestion() != null)
                        .mapToInt(Task::getSpSuggestion)
                        .average().orElse(0);
                double avgFinal = historicalTasks.stream()
                        .mapToInt(Task::getSpFinal)
                        .average().orElse(0);

                message.append(String.format(
                        "**Team Calibration** (%d completed tasks): AI average suggestion: %.1f SP, " +
                                "Team average decision: %.1f SP. ", finalizedCount, avgSuggested, avgFinal));

                if (avgFinal > avgSuggested * 1.2) {
                    message.append("The team tends to rate tasks HIGHER than AI suggestions. Adjust accordingly.\n\n");
                } else if (avgFinal < avgSuggested * 0.8) {
                    message.append("The team tends to rate tasks LOWER than AI suggestions. Adjust accordingly.\n\n");
                } else {
                    message.append("Team decisions are well-aligned with AI suggestions.\n\n");
                }
            }

            // Layer 3: Similar task reference (always available, even with few tasks)
            message.append("**Past Tasks for Reference** (use these to calibrate your estimates):\n");
            // Send last 30 tasks max to avoid token overflow
            historicalTasks.stream().limit(30).forEach(t ->
                    message.append(String.format("- \"%s\" — AI suggested: %s SP, Team decided: %d SP\n",
                            t.getTitle(),
                            t.getSpSuggestion() != null ? t.getSpSuggestion().toString() : "N/A",
                            t.getSpFinal()))
            );
            message.append("\n");

            log.info("Learning SP: {} historical tasks included for project #{} (calibration: {})",
                    finalizedCount, projectId, finalizedCount >= MIN_TASKS_FOR_CALIBRATION ? "active" : "insufficient data");
        }

        message.append("Break this down into development tasks with story point estimates.");

        return message.toString();
    }

    private TaskPriority parsePriority(String priority) {
        try {
            return TaskPriority.valueOf(priority.toUpperCase());
        } catch (Exception e) {
            return TaskPriority.MEDIUM;
        }
    }
}
