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
    private String filename;
    private String docType;
    private int contentLength;
    private LocalDateTime createdAt;

    public static DocumentResponse from(Document document) {
        return DocumentResponse.builder()
                .id(document.getId())
                .projectId(document.getProject().getId())
                .filename(document.getFilename())
                .docType(document.getDocType().name())
                .contentLength(document.getContent().length())
                .createdAt(document.getCreatedAt())
                .build();
    }
}
