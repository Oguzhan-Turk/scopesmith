package com.scopesmith.service.validation;

import com.scopesmith.dto.FeatureSuggestionResult;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.*;

@Component
@Slf4j
public class FeatureSuggestionResultValidator {

    public FeatureSuggestionResult validate(FeatureSuggestionResult result, ValidationContext context) {
        if (result == null || result.getSuggestions() == null) return result;

        // Deduplicate by normalized title
        Set<String> seen = new HashSet<>();
        List<FeatureSuggestionResult.Suggestion> deduped = new ArrayList<>();
        for (FeatureSuggestionResult.Suggestion s : result.getSuggestions()) {
            String norm = s.getTitle() != null ? s.getTitle().toLowerCase(Locale.ENGLISH).trim() : "";
            if (seen.add(norm)) {
                deduped.add(s);
            } else {
                log.info("Removed duplicate feature suggestion: '{}'", s.getTitle());
            }
        }
        result.setSuggestions(deduped);

        return result;
    }
}
