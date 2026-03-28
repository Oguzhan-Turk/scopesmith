package com.scopesmith.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class RequirementRequest {

    @NotBlank(message = "Raw requirement text is required")
    private String rawText;
}
