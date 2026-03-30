package com.scopesmith.service;

import com.scopesmith.config.PromptLoader;
import com.scopesmith.entity.Analysis;
import com.scopesmith.entity.OperationType;
import com.scopesmith.entity.QuestionStatus;
import com.scopesmith.entity.Task;
import com.scopesmith.repository.AnalysisRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class StakeholderSummaryService {

    private final AiService aiService;
    private final AnalysisRepository analysisRepository;
    private final PromptLoader promptLoader;

    /**
     * Generate stakeholder summary. AI call is outside the transaction to avoid
     * holding a DB connection for 15-30s during the API call.
     */
    public String generateSummary(Long analysisId) {
        // Phase 1: Read data (short tx)
        String userMessage = readSummaryData(analysisId);
        Long projectId = getProjectId(analysisId);

        // Phase 2: AI call (no tx — no DB connection held)
        log.info("Generating stakeholder summary for analysis #{}", analysisId);
        String summary = aiService.chat(promptLoader.load("stakeholder-summary"), userMessage,
                OperationType.STAKEHOLDER_SUMMARY, projectId);
        log.info("Stakeholder summary generated for analysis #{}", analysisId);

        // Phase 3: Save result (short tx)
        saveSummary(analysisId, summary);

        return summary;
    }

    /**
     * Refine existing stakeholder summary with user instruction.
     * AI call is outside the transaction.
     */
    public String refineSummary(Long analysisId, String instruction) {
        // Phase 1: Read data (short tx)
        String currentSummary = readCurrentSummary(analysisId);

        String userMessage = "## Current Summary\n" + currentSummary
                + "\n\n## Refinement Instruction\n" + instruction;

        // Phase 2: AI call (no tx)
        Long projectId = getProjectId(analysisId);

        log.info("Refining stakeholder summary for analysis #{}", analysisId);
        String refined = aiService.chat(promptLoader.load("stakeholder-summary-refine"), userMessage,
                OperationType.SUMMARY_REFINEMENT, projectId);
        log.info("Stakeholder summary refined for analysis #{}", analysisId);

        // Phase 3: Save result (short tx)
        saveSummary(analysisId, refined);

        return refined;
    }

    @Transactional(readOnly = true)
    protected String readSummaryData(Long analysisId) {
        Analysis analysis = findAnalysis(analysisId);
        return buildSummaryMessage(analysis);
    }

    @Transactional(readOnly = true)
    protected String readCurrentSummary(Long analysisId) {
        Analysis analysis = findAnalysis(analysisId);
        if (analysis.getPoSummary() == null || analysis.getPoSummary().isBlank()) {
            throw new IllegalStateException("No existing stakeholder summary to refine for analysis: " + analysisId);
        }
        return analysis.getPoSummary();
    }

    @Transactional
    protected void saveSummary(Long analysisId, String summary) {
        Analysis analysis = findAnalysis(analysisId);
        analysis.setPoSummary(summary);
        analysisRepository.save(analysis);
    }

    @Transactional(readOnly = true)
    protected Long getProjectId(Long analysisId) {
        return findAnalysis(analysisId).getRequirement().getProject().getId();
    }

    private Analysis findAnalysis(Long analysisId) {
        return analysisRepository.findById(analysisId)
                .orElseThrow(() -> new EntityNotFoundException("Analysis not found with id: " + analysisId));
    }

    private String buildSummaryMessage(Analysis analysis) {
        StringBuilder message = new StringBuilder();

        // Analysis summary
        message.append("## Analysis\n");
        message.append(analysis.getStructuredSummary());
        message.append("\n\n");

        // Risk
        message.append("## Risk\n");
        message.append("Level: ").append(analysis.getRiskLevel()).append("\n");
        message.append("Reason: ").append(analysis.getRiskReason()).append("\n\n");

        // Tasks if generated
        if (!analysis.getTasks().isEmpty()) {
            message.append("## Tasks\n");
            int totalSp = 0;
            for (Task task : analysis.getTasks()) {
                int sp = task.getSpFinal() != null ? task.getSpFinal() :
                        (task.getSpSuggestion() != null ? task.getSpSuggestion() : 0);
                message.append(String.format("- %s (%d SP)\n", task.getTitle(), sp));
                totalSp += sp;
            }
            message.append(String.format("\nTotal: %d tasks, %d SP estimated\n\n", analysis.getTasks().size(), totalSp));
        }

        // Open questions — fixed: use enum comparison instead of string
        long openQuestions = analysis.getQuestions().stream()
                .filter(q -> q.getStatus() == QuestionStatus.OPEN)
                .count();
        if (openQuestions > 0) {
            message.append("## Open Questions (").append(openQuestions).append(" remaining)\n");
            analysis.getQuestions().stream()
                    .filter(q -> q.getStatus() == QuestionStatus.OPEN)
                    .forEach(q -> message.append("- ").append(q.getQuestionText()).append("\n"));
        }

        // Assumptions
        if (analysis.getAssumptions() != null && !analysis.getAssumptions().isBlank()) {
            message.append("\n## Assumptions\n");
            message.append(analysis.getAssumptions());
        }

        return message.toString();
    }
}
