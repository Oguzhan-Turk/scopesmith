package com.scopesmith.dto;

import com.fasterxml.jackson.annotation.JsonPropertyOrder;
import com.scopesmith.dto.enums.Complexity;
import com.scopesmith.dto.enums.FeatureCategory;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
@JsonPropertyOrder({"suggestions"})
public class FeatureSuggestionResult {

    private List<Suggestion> suggestions = new ArrayList<>();

    @Data
    @JsonPropertyOrder({"title", "description", "category", "complexity", "rationale"})
    public static class Suggestion {
        private String title;
        private String description;
        private FeatureCategory category;
        private Complexity complexity;
        private String rationale;
    }
}
