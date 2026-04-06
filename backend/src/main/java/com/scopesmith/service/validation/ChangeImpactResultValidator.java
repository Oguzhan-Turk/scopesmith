package com.scopesmith.service.validation;

import com.scopesmith.dto.ChangeImpactResult;
import com.scopesmith.dto.enums.RiskLevel;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class ChangeImpactResultValidator {

    public ChangeImpactResult validate(ChangeImpactResult result, ValidationContext context) {
        if (result == null) return result;
        if (result.getNewRiskLevel() == null) {
            log.warn("ChangeImpact missing newRiskLevel, defaulting to MEDIUM");
            result.setNewRiskLevel(RiskLevel.MEDIUM);
        }
        return result;
    }
}
