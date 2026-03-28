package com.scopesmith.service;

import com.scopesmith.dto.AnalysisResult;
import com.scopesmith.entity.Analysis;
import com.scopesmith.entity.Question;
import com.scopesmith.entity.Requirement;
import com.scopesmith.entity.RequirementStatus;
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
