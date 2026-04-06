package com.scopesmith.service.validation;

import com.scopesmith.dto.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class AiResultValidationService {

    private final AnalysisResultValidator analysisValidator;
    private final TaskBreakdownResultValidator taskValidator;
    private final SpSuggestionResultValidator spValidator;
    private final ChangeImpactResultValidator changeImpactValidator;
    private final FeatureSuggestionResultValidator featureValidator;
    private final ProjectContextResultValidator contextValidator;

    @SuppressWarnings("unchecked")
    public <T> T validate(T result, ValidationContext context) {
        if (result instanceof AnalysisResult ar) return (T) analysisValidator.validate(ar, context);
        if (result instanceof TaskBreakdownResult tbr) return (T) taskValidator.validate(tbr, context);
        if (result instanceof SpSuggestionResult spr) return (T) spValidator.validate(spr, context);
        if (result instanceof ChangeImpactResult cir) return (T) changeImpactValidator.validate(cir, context);
        if (result instanceof FeatureSuggestionResult fsr) return (T) featureValidator.validate(fsr, context);
        if (result instanceof ProjectContextResult pcr) return (T) contextValidator.validate(pcr, context);
        return result; // no validator — pass through
    }
}
