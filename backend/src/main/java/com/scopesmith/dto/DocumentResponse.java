package com.scopesmith.dto;

import com.scopesmith.entity.Document;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class DocumentResponse {

    private Long id;
    private Long projectId;
    private Long requirementId;
    private String filename;
    private String docType;
    private String summary;
    private int contentLength;
    private LocalDateTime createdAt;

    public static DocumentResponse from(Document document) {
        return DocumentResponse.builder()
                .id(document.getId())
                .projectId(document.getProject().getId())
                .requirementId(document.getRequirement() != null ? document.getRequirement().getId() : null)
                .filename(document.getFilename())
                .docType(document.getDocType().name())
                .summary(document.getSummary())
                .contentLength(document.getContent().length())
                .createdAt(document.getCreatedAt())
                .build();
    }
}
