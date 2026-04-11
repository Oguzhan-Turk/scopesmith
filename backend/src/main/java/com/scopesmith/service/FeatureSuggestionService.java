package com.scopesmith.service;

import com.scopesmith.config.PromptLoader;
import com.scopesmith.dto.FeatureSuggestionResult;
import com.scopesmith.entity.ModelTier;
import com.scopesmith.entity.OperationType;
import com.scopesmith.entity.Project;
import com.scopesmith.entity.Requirement;
import com.scopesmith.service.validation.AiResultValidationService;
import com.scopesmith.service.validation.ValidationContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class FeatureSuggestionService {

    private final AiService aiService;
    private final ProjectService projectService;
    private final PromptLoader promptLoader;
    private final AiResultValidationService validationService;
    private final PromptContextBuilder promptContextBuilder;

    public FeatureSuggestionResult suggestFeatures(Long projectId) {
        Project project = projectService.getProjectOrThrow(projectId);

        StringBuilder message = new StringBuilder();

        // Project + service context (single-repo or federated)
        message.append(promptContextBuilder.buildContextBlock(project));

        // Existing requirements
        List<Requirement> requirements = project.getRequirements();
        if (!requirements.isEmpty()) {
            message.append("## Existing Requirements (").append(requirements.size()).append(")\n");
            for (Requirement req : requirements) {
                message.append("- [").append(req.getType()).append("] ")
                        .append(req.getRawText(), 0, Math.min(req.getRawText().length(), 200))
                        .append("\n");
            }
            message.append("\n");
        }

        log.info("Generating feature suggestions for project #{}", projectId);
        FeatureSuggestionResult result = aiService.chatWithStructuredOutput(
                promptLoader.load("feature-suggestion"), message.toString(),
                FeatureSuggestionResult.class,
                OperationType.FEATURE_SUGGESTION, projectId);
        return validationService.validate(result, ValidationContext.builder().projectId(projectId).build());
    }
}
