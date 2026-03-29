package com.scopesmith.service;

import com.scopesmith.config.PromptLoader;
import com.scopesmith.entity.Analysis;
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

    // Prompt loaded from resources/prompts/stakeholder-summary.txt via PromptLoader

    @Transactional
    public String generateSummary(Long analysisId) {
        Analysis analysis = analysisRepository.findById(analysisId)
                .orElseThrow(() -> new EntityNotFoundException("Analysis not found with id: " + analysisId));

        String userMessage = buildSummaryMessage(analysis);

        log.info("Generating stakeholder summary for analysis #{}", analysisId);
        String summary = aiService.chat(promptLoader.load("stakeholder-summary"), userMessage);
        log.info("Stakeholder summary generated for analysis #{}", analysisId);

        // Save to analysis
        analysis.setPoSummary(summary);
        analysisRepository.save(analysis);

        return summary;
    }

    @Transactional
    public String refineSummary(Long analysisId, String instruction) {
        Analysis analysis = analysisRepository.findById(analysisId)
                .orElseThrow(() -> new EntityNotFoundException("Analysis not found with id: " + analysisId));

        if (analysis.getPoSummary() == null || analysis.getPoSummary().isBlank()) {
            throw new IllegalStateException("No existing stakeholder summary to refine for analysis: " + analysisId);
        }

        String userMessage = "## Current Summary\n" + analysis.getPoSummary()
                + "\n\n## Refinement Instruction\n" + instruction;

        log.info("Refining stakeholder summary for analysis #{}", analysisId);
        String refined = aiService.chat(promptLoader.load("stakeholder-summary-refine"), userMessage);
        log.info("Stakeholder summary refined for analysis #{}", analysisId);

        analysis.setPoSummary(refined);
        analysisRepository.save(analysis);

        return refined;
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

        // Open questions
        long openQuestions = analysis.getQuestions().stream()
                .filter(q -> q.getStatus().name().equals("OPEN"))
                .count();
        if (openQuestions > 0) {
            message.append("## Open Questions (").append(openQuestions).append(" remaining)\n");
            analysis.getQuestions().stream()
                    .filter(q -> q.getStatus().name().equals("OPEN"))
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
