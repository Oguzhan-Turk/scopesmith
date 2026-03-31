package com.scopesmith.service;

import com.scopesmith.config.PromptLoader;
import com.scopesmith.dto.SpSuggestionResult;
import com.scopesmith.dto.TaskBreakdownResult;
import com.scopesmith.dto.TaskRefineResponse;
import com.scopesmith.dto.TaskResponse;
import com.scopesmith.entity.*;
import com.scopesmith.repository.AnalysisRepository;
import com.scopesmith.repository.TaskRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class TaskBreakdownService {

    private final AiService aiService;
    private final AnalysisRepository analysisRepository;
    private final TaskRepository taskRepository;
    private final DocumentService documentService;
    private final CodeIntelligenceService codeIntelligenceService;
    private final JiraService jiraService;
    private final GitHubService gitHubService;
    private final PromptLoader promptLoader;

    private static final long MIN_TASKS_FOR_CALIBRATION = 20;

    /**
     * Suggest SP for a manual task using LIGHT tier AI.
     */
    public SpSuggestionResult suggestSpForTask(Long taskId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new EntityNotFoundException("Task not found: " + taskId));

        Long projectId = task.getAnalysis().getRequirement().getProject().getId();
        String techContext = task.getAnalysis().getRequirement().getProject().getTechContext();

        StringBuilder message = new StringBuilder();
        if (techContext != null) {
            message.append("## Project Context\n").append(techContext).append("\n\n");
        }
        message.append("## Task\n");
        message.append("Title: ").append(task.getTitle()).append("\n");
        if (task.getDescription() != null) {
            message.append("Description: ").append(task.getDescription()).append("\n");
        }

        return aiService.chatWithStructuredOutput(
                promptLoader.load("sp-suggestion"), message.toString(), SpSuggestionResult.class,
                OperationType.SP_SUGGESTION, projectId, ModelTier.LIGHT);
    }

    /**
     * Generate tasks from analysis. AI call is outside the transaction.
     */
    public List<TaskResponse> generateTasks(Long analysisId) {
        // Phase 1: Read + validate (short tx)
        String userMessage = readTaskBreakdownData(analysisId);
        Long projectId = getProjectId(analysisId);

        // Phase 2: AI call (no tx — no DB connection held)
        log.info("Generating task breakdown for analysis #{}", analysisId);
        TaskBreakdownResult result = aiService.chatWithStructuredOutput(
                promptLoader.load("task-breakdown"), userMessage, TaskBreakdownResult.class,
                OperationType.TASK_BREAKDOWN, projectId);
        log.info("Task breakdown complete for analysis #{}. {} tasks generated.",
                analysisId, result.getTasks().size());

        // Phase 3: Save tasks (short tx)
        return saveGeneratedTasks(analysisId, result);
    }

    /**
     * Refine existing tasks with user instruction. AI call is outside the transaction.
     */
    public TaskRefineResponse refineTasks(Long analysisId, String instruction) {
        // Phase 1: Read current tasks (short tx)
        String userMessage = readRefineData(analysisId, instruction);
        Long projectId = getProjectId(analysisId);

        // Phase 2: AI call (no tx)
        log.info("Refining tasks for analysis #{}", analysisId);
        TaskBreakdownResult result = aiService.chatWithStructuredOutput(
                promptLoader.load("task-breakdown-refine"), userMessage, TaskBreakdownResult.class,
                OperationType.TASK_REFINEMENT, projectId);
        log.info("Task refinement complete for analysis #{}. {} tasks generated.", analysisId, result.getTasks().size());

        // Phase 3: Replace tasks (short tx)
        return replaceTasksWithRefined(analysisId, result);
    }

    @Transactional(readOnly = true)
    protected String readTaskBreakdownData(Long analysisId) {
        Analysis analysis = findAnalysis(analysisId);

        if (!analysis.getTasks().isEmpty()) {
            throw new IllegalStateException("Tasks already exist for analysis #" + analysisId
                    + ". Use the refine endpoint to modify existing tasks.");
        }

        return buildTaskBreakdownMessage(analysis);
    }

    @Transactional(readOnly = true)
    protected String readRefineData(Long analysisId, String instruction) {
        Analysis analysis = findAnalysis(analysisId);

        if (analysis.getTasks().isEmpty()) {
            throw new IllegalStateException("No existing tasks to refine for analysis #" + analysisId);
        }

        StringBuilder userMessage = new StringBuilder();
        userMessage.append("## Current Tasks\n");
        for (Task task : analysis.getTasks()) {
            int sp = task.getSpFinal() != null ? task.getSpFinal() :
                    (task.getSpSuggestion() != null ? task.getSpSuggestion() : 0);
            String synced = task.getJiraKey() != null ? ", SYNCED:" + task.getJiraKey() : "";
            String cat = task.getCategory() != null ? ", " + task.getCategory() : "";
            userMessage.append(String.format("- [ID:%d] %s (%d SP, %s priority%s%s): %s\n",
                    task.getId(), task.getTitle(), sp, task.getPriority().name(), cat, synced, task.getDescription()));
        }
        userMessage.append("\n## Analysis Context\n");
        userMessage.append(analysis.getStructuredSummary());
        userMessage.append("\n\n## Refinement Instruction\n");
        userMessage.append(instruction);

        return userMessage.toString();
    }

    @Transactional
    protected List<TaskResponse> saveGeneratedTasks(Long analysisId, TaskBreakdownResult result) {
        Analysis analysis = findAnalysis(analysisId);

        // Double-check: guard against concurrent generation
        if (!analysis.getTasks().isEmpty()) {
            throw new IllegalStateException("Tasks were already generated concurrently for analysis #" + analysisId);
        }

        Map<String, Task> savedTasks = saveTasks(analysis, result);
        analysis.getRequirement().setStatus(RequirementStatus.READY);

        return analysis.getTasks().stream()
                .map(TaskResponse::from)
                .toList();
    }

    @Transactional
    protected TaskRefineResponse replaceTasksWithRefined(Long analysisId, TaskBreakdownResult result) {
        Analysis analysis = findAnalysis(analysisId);

        // Build old task maps for smart merge — ID (primary) + title (fallback)
        Map<Long, Task> oldTasksById = new HashMap<>();
        Map<String, Task> oldTasksByTitle = new HashMap<>();
        for (Task t : analysis.getTasks()) {
            oldTasksById.put(t.getId(), t);
            oldTasksByTitle.put(normalizeTitle(t.getTitle()), t);
        }

        // Track which old task IDs got matched
        Set<Long> matchedOldIds = new HashSet<>();

        // Delete old tasks
        for (Task task : analysis.getTasks()) {
            task.setDependency(null);
        }
        taskRepository.flush();
        taskRepository.deleteAll(analysis.getTasks());
        analysis.getTasks().clear();
        taskRepository.flush();

        // Save new tasks with smart merge — inherit jiraKey + spFinal from matched old tasks
        List<String> preservedIssues = new ArrayList<>();
        Map<String, Task> savedTasks = new HashMap<>();

        for (TaskBreakdownResult.TaskItem item : result.getTasks()) {
            Task.TaskBuilder builder = Task.builder()
                    .analysis(analysis)
                    .title(item.getTitle())
                    .description(item.getDescription())
                    .acceptanceCriteria(item.getAcceptanceCriteria())
                    .spSuggestion(item.getSpSuggestion())
                    .spRationale(item.getSpRationale())
                    .priority(parsePriority(item.getPriority()))
                    .category(item.getCategory());

            // Smart merge: match by previousTaskId first, fall back to title
            Task oldMatch = null;
            if (item.getPreviousTaskId() != null) {
                oldMatch = oldTasksById.get(item.getPreviousTaskId());
            }
            if (oldMatch == null) {
                // Fallback: title matching
                oldMatch = oldTasksByTitle.get(normalizeTitle(item.getTitle()));
            }

            if (oldMatch != null && !matchedOldIds.contains(oldMatch.getId())) {
                matchedOldIds.add(oldMatch.getId());
                if (oldMatch.getJiraKey() != null) {
                    builder.jiraKey(oldMatch.getJiraKey());
                    preservedIssues.add(oldMatch.getJiraKey());
                }
                if (oldMatch.getSpFinal() != null) {
                    builder.spFinal(oldMatch.getSpFinal());
                }
            }

            Task task = builder.build();
            if (item.getDependsOn() != null && savedTasks.containsKey(item.getDependsOn())) {
                task.setDependency(savedTasks.get(item.getDependsOn()));
            }

            Task saved = taskRepository.save(task);
            savedTasks.put(saved.getTitle(), saved);
            analysis.getTasks().add(saved);
        }

        // Find orphaned issues — old tasks with jiraKey that weren't matched
        List<String> orphanedIssues = oldTasksById.values().stream()
                .filter(t -> t.getJiraKey() != null && !matchedOldIds.contains(t.getId()))
                .map(Task::getJiraKey)
                .toList();

        // Auto-close orphaned issues
        if (!orphanedIssues.isEmpty()) {
            String repo = null;
            try { repo = analysis.getRequirement().getProject().getIntegrationConfig(); } catch (Exception ignored) {}
            for (String issueKey : orphanedIssues) {
                try {
                    if (issueKey.startsWith("#")) {
                        gitHubService.closeIssue(repo, issueKey);
                    } else {
                        jiraService.closeIssue(issueKey);
                    }
                } catch (Exception e) {
                    log.warn("Failed to auto-close orphaned issue {}: {}", issueKey, e.getMessage());
                }
            }
            log.info("Auto-closed {} orphaned issues: {}", orphanedIssues.size(), orphanedIssues);
        }

        return TaskRefineResponse.builder()
                .tasks(analysis.getTasks().stream().map(TaskResponse::from).toList())
                .preservedIssues(preservedIssues)
                .orphanedIssues(orphanedIssues)
                .build();
    }

    private String normalizeTitle(String title) {
        return title == null ? "" : title.toLowerCase().trim();
    }

    private Map<String, Task> saveTasks(Analysis analysis, TaskBreakdownResult result) {
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
                    .category(item.getCategory())
                    .build();

            if (item.getDependsOn() != null && savedTasks.containsKey(item.getDependsOn())) {
                task.setDependency(savedTasks.get(item.getDependsOn()));
            }

            Task saved = taskRepository.save(task);
            savedTasks.put(saved.getTitle(), saved);
            analysis.getTasks().add(saved);
        }

        return savedTasks;
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

        // CLAUDE.md content
        String claudeMd = requirement.getProject().getClaudeMdContent();
        if (claudeMd != null && !claudeMd.isBlank()) {
            message.append("## Project Developer Notes (CLAUDE.md)\n");
            message.append(claudeMd);
            message.append("\n\n");
        }

        // Document context
        String docContext = documentService.getProjectDocumentContext(requirement.getProject().getId());
        if (docContext != null) {
            message.append("## Project Documents\n");
            message.append(docContext);
            message.append("\n\n");
        }
        String reqDocContext = documentService.getRequirementDocumentContext(requirement.getId());
        if (reqDocContext != null) {
            message.append("## Requirement-Specific Documents\n");
            message.append(reqDocContext);
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

            // Code intelligence — local regex parsing + git analysis (token-free)
            String projectPath = requirement.getProject().getLocalPath();
            if (projectPath != null) {
                List<String> modules = List.of(analysis.getAffectedModules().split(",\\s*"));
                String codeAnalysis = codeIntelligenceService.analyzeModules(projectPath, modules);
                if (codeAnalysis != null) {
                    message.append(codeAnalysis).append("\n");
                }
            }
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

        // Historical task data for Learning SP — org-level calibration (ADR-003)
        long finalizedCount = taskRepository.countAllFinalizedTasks();

        if (finalizedCount > 0) {
            List<Task> historicalTasks = taskRepository.findAllFinalizedTasks();

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
            historicalTasks.stream().limit(30).forEach(t ->
                    message.append(String.format("- \"%s\" — AI suggested: %s SP, Team decided: %d SP\n",
                            t.getTitle(),
                            t.getSpSuggestion() != null ? t.getSpSuggestion().toString() : "N/A",
                            t.getSpFinal()))
            );
            message.append("\n");

            log.info("Learning SP: {} org-level historical tasks included (calibration: {})",
                    finalizedCount, finalizedCount >= MIN_TASKS_FOR_CALIBRATION ? "active" : "insufficient data");
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

    @Transactional(readOnly = true)
    protected Long getProjectId(Long analysisId) {
        return findAnalysis(analysisId).getRequirement().getProject().getId();
    }

    private Analysis findAnalysis(Long analysisId) {
        return analysisRepository.findById(analysisId)
                .orElseThrow(() -> new EntityNotFoundException("Analysis not found with id: " + analysisId));
    }
}
