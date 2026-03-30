package com.scopesmith.service;

import com.scopesmith.config.PromptLoader;
import com.scopesmith.dto.ChangeImpactResult;
import com.scopesmith.entity.Analysis;
import com.scopesmith.entity.OperationType;
import com.scopesmith.entity.Requirement;
import com.scopesmith.entity.Task;
import com.scopesmith.repository.AnalysisRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ChangeImpactService {

    private final AiService aiService;
    private final RequirementService requirementService;
    private final AnalysisRepository analysisRepository;
    private final PromptLoader promptLoader;

    /**
     * Compare the current requirement text against the latest analysis
     * and produce an impact assessment.
     *
     * Flow:
     * 1. User updates requirement text (version increments)
     * 2. User calls this endpoint to see what changed
     * 3. AI compares old analysis + old text vs new text
     * 4. Returns structured impact report
     */
    public ChangeImpactResult analyzeImpact(Long requirementId) {
        Requirement requirement = requirementService.getRequirementOrThrow(requirementId);

        // Get the latest analysis for this requirement
        List<Analysis> analyses = analysisRepository
                .findByRequirementIdOrderByCreatedAtDesc(requirementId);

        if (analyses.isEmpty()) {
            throw new IllegalStateException(
                    "No previous analysis found for requirement #" + requirementId +
                            ". Run an analysis first before checking change impact.");
        }

        Analysis latestAnalysis = analyses.get(0);

        // Check if the requirement has actually changed since the last analysis
        if (latestAnalysis.getRequirementVersion() != null &&
                latestAnalysis.getRequirementVersion().equals(requirement.getVersion())) {
            throw new IllegalStateException(
                    "Requirement has not changed since the last analysis (version " +
                            requirement.getVersion() + "). Update the requirement first.");
        }

        String userMessage = buildImpactMessage(requirement, latestAnalysis);

        log.info("Analyzing change impact for requirement #{} (v{} → v{})",
                requirementId, latestAnalysis.getRequirementVersion(), requirement.getVersion());

        ChangeImpactResult result = aiService.chatWithStructuredOutput(
                promptLoader.load("change-impact"), userMessage, ChangeImpactResult.class,
                OperationType.CHANGE_IMPACT, requirement.getProject().getId());

        log.info("Change impact analysis complete for requirement #{}", requirementId);
        return result;
    }

    private String buildImpactMessage(Requirement requirement, Analysis latestAnalysis) {
        StringBuilder message = new StringBuilder();

        // Project context
        String techContext = requirement.getProject().getTechContext();
        if (techContext != null && !techContext.isBlank()) {
            message.append("## Project Context\n");
            message.append(techContext);
            message.append("\n\n");
        }

        // Original requirement (from the analysis)
        message.append("## Original Requirement (v").append(latestAnalysis.getRequirementVersion()).append(")\n");
        message.append("_(The text that was analyzed)_\n\n");

        // Previous analysis
        message.append("## Previous Analysis\n");
        message.append(latestAnalysis.getStructuredSummary());
        message.append("\n\n");

        message.append("Risk: ").append(latestAnalysis.getRiskLevel()).append("\n");
        message.append("Affected modules: ").append(latestAnalysis.getAffectedModules()).append("\n\n");

        // Existing tasks
        if (!latestAnalysis.getTasks().isEmpty()) {
            message.append("## Existing Tasks\n");
            for (Task task : latestAnalysis.getTasks().stream()
                    .sorted(Comparator.comparing(Task::getId)).toList()) {
                int sp = task.getSpFinal() != null ? task.getSpFinal() :
                        (task.getSpSuggestion() != null ? task.getSpSuggestion() : 0);
                message.append(String.format("- %s (%d SP)\n", task.getTitle(), sp));
            }
            message.append("\n");
        }

        // Updated requirement
        message.append("## Updated Requirement (v").append(requirement.getVersion()).append(")\n");
        message.append(requirement.getRawText());
        message.append("\n\n");

        message.append("Compare the original and updated requirements. ");
        message.append("Identify all changes and assess their impact on the existing analysis and tasks.");

        return message.toString();
    }
}
