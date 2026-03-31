package com.scopesmith.service;

import com.scopesmith.config.PromptLoader;
import com.scopesmith.dto.AnalysisResult;
import com.scopesmith.entity.*;
import com.scopesmith.repository.AnalysisRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

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
        return analyze(requirementId, null);
    }

    public Analysis analyze(Long requirementId, ModelTier tierOverride) {
        // 1. Read requirement and build message (short transaction)
        Requirement requirement = requirementService.getRequirementOrThrow(requirementId);
        String userMessage = buildUserMessage(requirement);

        // 2. Call AI — NO transaction held during this long-running call
        String promptName = requirement.getType() == RequirementType.BUG
                ? "bug-analysis" : "requirement-analysis";
        ModelTier effectiveTier = tierOverride != null ? tierOverride : OperationType.REQUIREMENT_ANALYSIS.getDefaultTier();
        log.info("Starting {} analysis for requirement #{} with model tier {}",
                requirement.getType(), requirementId, effectiveTier);
        long startTime = System.currentTimeMillis();
        Long projectId = requirement.getProject().getId();
        AnalysisResult result = aiService.chatWithStructuredOutput(
                promptLoader.load(promptName), userMessage, AnalysisResult.class,
                OperationType.REQUIREMENT_ANALYSIS, projectId, effectiveTier);
        long durationMs = System.currentTimeMillis() - startTime;
        log.info("Analysis complete for requirement #{} in {}ms (tier: {})", requirementId, durationMs, effectiveTier);

        // 3. Save results (short transaction)
        return saveAnalysisResult(requirement, result, durationMs, effectiveTier);
    }

    @Transactional
    protected Analysis saveAnalysisResult(Requirement requirement, AnalysisResult result,
                                           long durationMs, ModelTier modelTier) {
        requirement.setStatus(RequirementStatus.ANALYZING);

        Analysis analysis = Analysis.builder()
                .requirement(requirement)
                .structuredSummary(result.getStructuredSummary())
                .assumptions(result.getAssumptions() != null ? String.join("\n", result.getAssumptions()) : null)
                .riskLevel(result.getRiskLevel())
                .riskReason(result.getRiskReason())
                .affectedModules(result.getAffectedModules() != null ? String.join(", ", result.getAffectedModules()) : null)
                .requirementVersion(requirement.getVersion())
                .contextVersion(requirement.getProject().getContextVersion())
                .durationMs(durationMs)
                .modelTier(modelTier)
                .build();

        Analysis savedAnalysis = analysisRepository.save(analysis);

        List<AnalysisResult.QuestionItem> questions = result.getQuestions() != null ? result.getQuestions() : List.of();
        for (AnalysisResult.QuestionItem qi : questions) {
            String optionsJson = null;
            if (qi.getOptions() != null && !qi.getOptions().isEmpty()) {
                try { optionsJson = new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(qi.getOptions()); }
                catch (Exception ignored) {}
            }
            Question question = Question.builder()
                    .analysis(savedAnalysis)
                    .questionText(qi.getQuestion())
                    .suggestedAnswer(qi.getSuggestedAnswer())
                    .questionType(qi.getType() != null ? qi.getType() : "OPEN")
                    .options(optionsJson)
                    .build();
            savedAnalysis.getQuestions().add(question);
        }

        requirement.setStatus(
                questions.isEmpty() ? RequirementStatus.ANALYZED : RequirementStatus.CLARIFYING
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

        ModelTier effectiveTier = OperationType.REQUIREMENT_ANALYSIS.getDefaultTier();
        String promptName = requirement.getType() == RequirementType.BUG
                ? "bug-analysis" : "requirement-analysis";
        log.info("Starting {} re-analysis for requirement #{} (previous analysis #{})",
                requirement.getType(), requirement.getId(), previousAnalysis.getId());
        long startTime = System.currentTimeMillis();
        AnalysisResult result = aiService.chatWithStructuredOutput(
                promptLoader.load(promptName), userMessage, AnalysisResult.class,
                OperationType.REQUIREMENT_ANALYSIS, requirement.getProject().getId(), effectiveTier);
        long durationMs = System.currentTimeMillis() - startTime;
        log.info("Re-analysis complete for requirement #{} in {}ms", requirement.getId(), durationMs);

        return saveAnalysisResult(requirement, result, durationMs, effectiveTier);
    }

    /**
     * Refine an existing analysis with user instruction.
     * Creates a new analysis record preserving the old one.
     */
    public Analysis refineAnalysis(Long analysisId, String instruction) {
        Analysis previous = analysisRepository.findByIdWithRequirement(analysisId)
                .orElseThrow(() -> new EntityNotFoundException("Analysis not found: " + analysisId));
        Requirement requirement = previous.getRequirement();

        StringBuilder message = new StringBuilder();
        message.append("## Previous Analysis\n");
        message.append("Summary: ").append(previous.getStructuredSummary()).append("\n");
        message.append("Risk: ").append(previous.getRiskLevel()).append(" — ").append(previous.getRiskReason()).append("\n");
        message.append("Affected Modules: ").append(previous.getAffectedModules()).append("\n");
        message.append("Assumptions: ").append(previous.getAssumptions()).append("\n\n");
        message.append("## Original Requirement\n").append(requirement.getRawText()).append("\n\n");
        message.append("## User Instruction\n").append(instruction).append("\n");

        ModelTier tier = OperationType.REQUIREMENT_ANALYSIS.getDefaultTier();
        log.info("Refining analysis #{} with instruction: {}", analysisId, instruction);
        long startTime = System.currentTimeMillis();
        AnalysisResult result = aiService.chatWithStructuredOutput(
                promptLoader.load("analysis-refine"), message.toString(), AnalysisResult.class,
                OperationType.REQUIREMENT_ANALYSIS, requirement.getProject().getId(), tier);
        long durationMs = System.currentTimeMillis() - startTime;

        return saveAnalysisResult(requirement, result, durationMs, tier);
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

        // Add CLAUDE.md content if available (developer notes, conventions)
        String claudeMd = requirement.getProject().getClaudeMdContent();
        if (claudeMd != null && !claudeMd.isBlank()) {
            message.append("## Project Developer Notes (CLAUDE.md)\n");
            message.append(claudeMd);
            message.append("\n\n");
        }

        // Add project-level document context (Feature F)
        String docContext = documentService.getProjectDocumentContext(requirement.getProject().getId());
        if (docContext != null) {
            message.append("## Project Documents\n");
            message.append(docContext);
            message.append("\n\n");
        }

        // Add requirement-specific document context
        String reqDocContext = documentService.getRequirementDocumentContext(requirement.getId());
        if (reqDocContext != null) {
            message.append("## Requirement-Specific Documents\n");
            message.append(reqDocContext);
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
