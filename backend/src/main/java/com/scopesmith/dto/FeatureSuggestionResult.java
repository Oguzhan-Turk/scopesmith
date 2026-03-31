package com.scopesmith.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class FeatureSuggestionResult {

    private List<Suggestion> suggestions = new ArrayList<>();

    @Data
    public static class Suggestion {
        private String title;
        private String description;
        private String category; // ENHANCEMENT, NEW_FEATURE, PERFORMANCE, SECURITY, UX, INTEGRATION
        private String complexity; // LOW, MEDIUM, HIGH
        private String rationale;
    }
}
