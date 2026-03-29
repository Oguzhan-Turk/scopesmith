package com.scopesmith.service;

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

    private static final long MIN_TASKS_FOR_CALIBRATION = 20;

    private static final String SYSTEM_PROMPT = """
            You are a senior software architect breaking down a requirement analysis into
            actionable development tasks. You have deep expertise in agile task decomposition
            and story point estimation.

            You will receive:
            1. The structured analysis of a requirement
            2. Optionally, project context (tech stack, existing modules)
            3. Optionally, Q&A clarifications
            4. Optionally, historical task data from this project (past tasks with team-decided SP values)

            For each task, provide:
            - **title**: Short, clear, action-oriented (e.g., "Create DiscountCode entity and migration")
            - **description**: What needs to be done, technically specific
            - **acceptanceCriteria**: Bullet points defining "done" — testable, verifiable
            - **spSuggestion**: Story point estimate (Fibonacci: 1, 2, 3, 5, 8, 13)
            - **spRationale**: WHY this SP value — reference affected services, DB changes,
              integration complexity, testing needs. If historical task data is provided,
              REFERENCE similar past tasks by name and their SP values as evidence.
              Example: "Similar to 'Create UserProfile entity' which the team rated at 3 SP."
            - **priority**: LOW, MEDIUM, HIGH, or CRITICAL
            - **dependsOn**: Title of another task this depends on, or null if independent

            Rules:
            - Tasks should be independently deliverable when possible
            - Each task should be completable within one sprint
            - If a task is larger than 8 SP, break it down further
            - SP reflects COMPLEXITY, not time. Consider: number of services affected,
              DB schema changes, external integrations, business logic complexity,
              testing requirements, and requirement clarity
            - Order tasks by dependency and priority
            - Include testing tasks where integration/edge cases warrant separate effort
            - If historical data shows the team consistently rates higher/lower than your
              estimate, ADJUST your suggestion to match the team's calibration and explain why.

            Return all human-readable text (descriptions, acceptance criteria, rationale) in Turkish.
            Keep technical terms, class names, and framework names in English.
            """;

    @Transactional
    public List<TaskResponse> generateTasks(Long analysisId) {
        Analysis analysis = analysisRepository.findById(analysisId)
                .orElseThrow(() -> new EntityNotFoundException("Analysis not found with id: " + analysisId));

        String userMessage = buildTaskBreakdownMessage(analysis);

        log.info("Generating task breakdown for analysis #{}", analysisId);
        TaskBreakdownResult result = aiService.chatWithStructuredOutput(
                SYSTEM_PROMPT, userMessage, TaskBreakdownResult.class);
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
