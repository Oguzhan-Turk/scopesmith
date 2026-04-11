package com.scopesmith.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class SelfAssistantRequest {
    @NotBlank
    private String question;
    private Long projectId;
}
