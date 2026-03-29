package com.scopesmith.service;

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

    private static final String SYSTEM_PROMPT = """
            You are preparing an executive summary for a non-technical stakeholder
            (product owner, project manager, client representative, or director).

            They need to:
            1. Understand WHAT is being requested (in plain language)
            2. Know HOW BIG the work is (scope)
            3. See the RISKS clearly
            4. Make DECISIONS on open items
            5. APPROVE or REQUEST CHANGES

            Rules:
            - No technical jargon. No class names, no API endpoints, no DB tables.
            - Use business language: "feature", "capability", "change", not "entity", "service", "migration"
            - Be concise — this person has 2 minutes to read this
            - Decision points must be phrased as yes/no questions
            - Include total estimated effort and risk level prominently
            - If there are open questions that block progress, highlight them

            Format the summary as follows:
            1. One-paragraph overview
            2. Scope summary (bullet points)
            3. Estimated effort (total SP + task count)
            4. Risk assessment (one sentence)
            5. Decision points (checkboxes)
            6. Open questions (if any remain)

            Return all text in Turkish.
            """;

    @Transactional
    public String generateSummary(Long analysisId) {
        Analysis analysis = analysisRepository.findById(analysisId)
                .orElseThrow(() -> new EntityNotFoundException("Analysis not found with id: " + analysisId));

        String userMessage = buildSummaryMessage(analysis);

        log.info("Generating stakeholder summary for analysis #{}", analysisId);
        String summary = aiService.chat(SYSTEM_PROMPT, userMessage);
        log.info("Stakeholder summary generated for analysis #{}", analysisId);

        // Save to analysis
        analysis.setPoSummary(summary);
        analysisRepository.save(analysis);

        return summary;
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
