package com.scopesmith.dto;

import com.fasterxml.jackson.annotation.JsonPropertyOrder;
import lombok.Data;

@Data
@JsonPropertyOrder({"spSuggestion", "spRationale"})
public class SpSuggestionResult {
    private Integer spSuggestion;
    private String spRationale;
}
