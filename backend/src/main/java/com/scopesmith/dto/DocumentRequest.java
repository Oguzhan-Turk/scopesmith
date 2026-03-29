package com.scopesmith.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class DocumentRequest {

    @NotBlank(message = "Filename is required")
    private String filename;

    @NotBlank(message = "Content is required")
    private String content;

    private String docType; // MEETING_NOTES, ARCHITECTURE, EMAIL, SPECIFICATION, OTHER
}
