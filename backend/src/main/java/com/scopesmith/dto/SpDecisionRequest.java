package com.scopesmith.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class SpDecisionRequest {

    @NotNull(message = "Story point value is required")
    @Min(value = 1, message = "Story point must be at least 1")
    private Integer spFinal;

    private String divergenceReason;
}
