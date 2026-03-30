package com.scopesmith.service;

import com.scopesmith.config.PromptLoader;
import com.scopesmith.dto.AnalysisResult;
import com.scopesmith.entity.*;
import com.scopesmith.repository.AnalysisRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class RequirementAnalysisService {

    private final AiService aiService;
    private final RequirementService requirementService;
    private final AnalysisRepository analysisRepository;
    private final DocumentService documentService;
    private final InsightService insightService;
    private final PromptLoader promptLoader;

    /**
     * Analyze a requirement. AI call is made OUTSIDE the transaction
     * to avoid holding a DB connection during the 15-30 second API call.
     */
    public Analysis analyze(Long requirementId) {
        // 1. Read requirement and build message (short transaction)
        Requirement requirement = requirementService.getRequirementOrThrow(requirementId);
        String userMessage = buildUserMessage(requirement);

        // 2. Call AI — NO transaction held during this long-running call
        String promptName = requirement.getType() == RequirementType.BUG
                ? "bug-analysis" : "requirement-analysis";
        log.info("Starting {} analysis for requirement #{}", requirement.getType(), requirementId);
        long startTime = System.currentTimeMillis();
        Long projectId = requirement.getProject().getId();
        AnalysisResult result = aiService.chatWithStructuredOutput(
                promptLoader.load(promptName), userMessage, AnalysisResult.class,
                OperationType.REQUIREMENT_ANALYSIS, projectId);
        long durationMs = System.currentTimeMillis() - startTime;
        log.info("Analysis complete for requirement #{} in {}ms", requirementId, durationMs);

        // 3. Save results (short transaction)
        return saveAnalysisResult(requirement, result, durationMs);
    }

    @Transactional
    protected Analysis saveAnalysisResult(Requirement requirement, AnalysisResult result, long durationMs) {
        requirement.setStatus(RequirementStatus.ANALYZING);

        Analysis analysis = Analysis.builder()
                .requirement(requirement)
                .structuredSummary(result.getStructuredSummary())
                .assumptions(String.join("\n", result.getAssumptions()))
                .riskLevel(result.getRiskLevel())
                .riskReason(result.getRiskReason())
                .affectedModules(String.join(", ", result.getAffectedModules()))
                .requirementVersion(requirement.getVersion())
                .durationMs(durationMs)
                .build();

        Analysis savedAnalysis = analysisRepository.save(analysis);

        for (String questionText : result.getQuestions()) {
            Question question = Question.builder()
                    .analysis(savedAnalysis)
                    .questionText(questionText)
                    .build();
            savedAnalysis.getQuestions().add(question);
        }

        requirement.setStatus(
                result.getQuestions().isEmpty() ? RequirementStatus.ANALYZED : RequirementStatus.CLARIFYING
        );

        analysisRepository.save(savedAnalysis);
        return savedAnalysis;
    }

    /**
     * Re-analyze a requirement using the previous analysis + answers as additional context.
     * Creates a NEW analysis record — the old one is preserved for history.
     * AI call is outside transaction, same pattern as analyze().
     */
    public Analysis reAnalyze(Analysis previousAnalysis) {
        Requirement requirement = previousAnalysis.getRequirement();
        String userMessage = buildReAnalysisMessage(requirement, previousAnalysis);

        String promptName = requirement.getType() == RequirementType.BUG
                ? "bug-analysis" : "requirement-analysis";
        log.info("Starting {} re-analysis for requirement #{} (previous analysis #{})",
                requirement.getType(), requirement.getId(), previousAnalysis.getId());
        long startTime = System.currentTimeMillis();
        AnalysisResult result = aiService.chatWithStructuredOutput(
                promptLoader.load(promptName), userMessage, AnalysisResult.class,
                OperationType.REQUIREMENT_ANALYSIS, requirement.getProject().getId());
        long durationMs = System.currentTimeMillis() - startTime;
        log.info("Re-analysis complete for requirement #{} in {}ms", requirement.getId(), durationMs);

        return saveAnalysisResult(requirement, result, durationMs);
    }

    private String buildReAnalysisMessage(Requirement requirement, Analysis previousAnalysis) {
        StringBuilder message = new StringBuilder();

        // Project context
        String techContext = requirement.getProject().getTechContext();
        if (techContext != null && !techContext.isBlank()) {
            message.append("## Project Context\n");
            message.append(techContext);
            message.append("\n\n");
        }

        message.append("## Raw Requirement\n");
        message.append(requirement.getRawText());
        message.append("\n\n");

        // Previous analysis summary
        message.append("## Previous Analysis\n");
        message.append(previousAnalysis.getStructuredSummary());
        message.append("\n\n");

        // Q&A pairs
        message.append("## Clarification Q&A\n");
        message.append("The following questions were asked and answered. ");
        message.append("Use these answers to produce a MORE PRECISE and COMPLETE analysis.\n\n");

        for (Question q : previousAnalysis.getQuestions()) {
            if (q.getStatus() == QuestionStatus.ANSWERED) {
                message.append("**Q:** ").append(q.getQuestionText()).append("\n");
                message.append("**A:** ").append(q.getAnswer()).append("\n\n");
            } else if (q.getStatus() == QuestionStatus.DISMISSED) {
                message.append("**Q:** ").append(q.getQuestionText()).append("\n");
                message.append("**A:** _(Dismissed — not relevant)_\n\n");
            }
        }

        message.append("Based on these answers, refine your analysis. ");
        message.append("Ask NEW questions only if critical information is still missing. ");
        message.append("Do not repeat already-answered questions.");

        return message.toString();
    }

    private String buildUserMessage(Requirement requirement) {
        StringBuilder message = new StringBuilder();

        // Add project context if available
        String techContext = requirement.getProject().getTechContext();
        if (techContext != null && !techContext.isBlank()) {
            message.append("## Project Context\n");
            message.append(techContext);
            message.append("\n\n");
        }

        // Add document context if available (Feature F)
        String docContext = documentService.getProjectDocumentContext(requirement.getProject().getId());
        if (docContext != null) {
            message.append("## Project Documents\n");
            message.append(docContext);
            message.append("\n\n");
        }

        // Add intelligence insights (Layer 3 — Project Intelligence Insights)
        String insights = insightService.buildInsightsSection(
                requirement.getProject(), requirement.getType());
        if (insights != null) {
            message.append(insights);
            message.append("\n");
        }

        message.append("## Raw Requirement\n");
        message.append(requirement.getRawText());

        return message.toString();
    }
}
