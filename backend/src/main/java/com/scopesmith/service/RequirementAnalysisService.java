package com.scopesmith.service;

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

    private static final String SYSTEM_PROMPT = """
            You are a senior business analyst and software architect with deep expertise in
            requirement analysis. Your job is to analyze raw, unstructured requirements and
            produce a structured analysis.

            You will receive:
            1. A raw requirement (possibly vague, incomplete, or containing multiple requests)
            2. Optionally, project context (tech stack, existing modules, architecture)

            Your analysis must be thorough but practical. Focus on:
            - What is actually being asked (cut through ambiguity)
            - What information is MISSING that would be needed for implementation
            - What CONTRADICTIONS exist within the requirement
            - What ASSUMPTIONS you had to make
            - What QUESTIONS should be asked to the product owner or stakeholder
            - Which existing modules/services would be AFFECTED
            - What is the RISK level and why

            Rules:
            - Be specific, not generic. "What is the expected behavior?" is too vague.
              "Should the discount code be case-sensitive?" is specific.
            - If project context is provided, reference actual module/service names.
            - Questions should be answerable by a non-technical product owner.
            - Risk assessment should consider: scope clarity, technical complexity,
              integration points, and potential for scope creep.
            """;

    @Transactional
    public Analysis analyze(Long requirementId) {
        Requirement requirement = requirementService.getRequirementOrThrow(requirementId);

        // Update status
        requirement.setStatus(RequirementStatus.ANALYZING);

        // Build user message with optional project context
        String userMessage = buildUserMessage(requirement);

        // Call AI
        log.info("Starting analysis for requirement #{}", requirementId);
        AnalysisResult result = aiService.chatWithStructuredOutput(SYSTEM_PROMPT, userMessage, AnalysisResult.class);
        log.info("Analysis complete for requirement #{}", requirementId);

        // Save analysis
        Analysis analysis = Analysis.builder()
                .requirement(requirement)
                .structuredSummary(result.getStructuredSummary())
                .assumptions(String.join("\n", result.getAssumptions()))
                .riskLevel(result.getRiskLevel())
                .riskReason(result.getRiskReason())
                .affectedModules(String.join(", ", result.getAffectedModules()))
                .requirementVersion(requirement.getVersion())
                .build();

        Analysis savedAnalysis = analysisRepository.save(analysis);

        // Save questions
        for (String questionText : result.getQuestions()) {
            Question question = Question.builder()
                    .analysis(savedAnalysis)
                    .questionText(questionText)
                    .build();
            savedAnalysis.getQuestions().add(question);
        }

        // Update requirement status
        requirement.setStatus(
                result.getQuestions().isEmpty() ? RequirementStatus.ANALYZED : RequirementStatus.CLARIFYING
        );

        analysisRepository.save(savedAnalysis);

        return savedAnalysis;
    }

    /**
     * Re-analyze a requirement using the previous analysis + answers as additional context.
     * Creates a NEW analysis record — the old one is preserved for history.
     */
    @Transactional
    public Analysis reAnalyze(Analysis previousAnalysis) {
        Requirement requirement = previousAnalysis.getRequirement();
        requirement.setStatus(RequirementStatus.ANALYZING);

        String userMessage = buildReAnalysisMessage(requirement, previousAnalysis);

        log.info("Starting re-analysis for requirement #{} (previous analysis #{})",
                requirement.getId(), previousAnalysis.getId());
        AnalysisResult result = aiService.chatWithStructuredOutput(SYSTEM_PROMPT, userMessage, AnalysisResult.class);
        log.info("Re-analysis complete for requirement #{}", requirement.getId());

        Analysis newAnalysis = Analysis.builder()
                .requirement(requirement)
                .structuredSummary(result.getStructuredSummary())
                .assumptions(String.join("\n", result.getAssumptions()))
                .riskLevel(result.getRiskLevel())
                .riskReason(result.getRiskReason())
                .affectedModules(String.join(", ", result.getAffectedModules()))
                .requirementVersion(requirement.getVersion())
                .build();

        Analysis savedAnalysis = analysisRepository.save(newAnalysis);

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

        message.append("## Raw Requirement\n");
        message.append(requirement.getRawText());

        return message.toString();
    }
}
