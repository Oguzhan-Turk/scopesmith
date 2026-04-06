package com.scopesmith.service.validation;

import com.scopesmith.dto.SpSuggestionResult;
import com.scopesmith.util.FibonacciUtil;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class SpSuggestionResultValidator {

    public SpSuggestionResult validate(SpSuggestionResult result, ValidationContext context) {
        if (result == null || result.getSpSuggestion() == null) return result;

        int original = result.getSpSuggestion();
        if (!FibonacciUtil.isFibonacci(original)) {
            int corrected = FibonacciUtil.nearestFibonacci(original);
            log.info("Auto-corrected SP suggestion from {} to {}", original, corrected);
            result.setSpSuggestion(corrected);
        }

        return result;
    }
}
