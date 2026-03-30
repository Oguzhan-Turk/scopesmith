package com.scopesmith.dto;

import com.scopesmith.entity.Requirement;
import com.scopesmith.entity.RequirementStatus;
import com.scopesmith.entity.RequirementType;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class RequirementResponse {

    private Long id;
    private Long projectId;
    private String rawText;
    private RequirementType type;
    private Integer sequenceNumber;
    private Integer version;
    private RequirementStatus status;
    private int analysisCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static RequirementResponse from(Requirement requirement) {
        return RequirementResponse.builder()
                .id(requirement.getId())
                .projectId(requirement.getProject().getId())
                .rawText(requirement.getRawText())
                .type(requirement.getType())
                .sequenceNumber(requirement.getSequenceNumber())
                .version(requirement.getVersion())
                .status(requirement.getStatus())
                .analysisCount(requirement.getAnalyses().size())
                .createdAt(requirement.getCreatedAt())
                .updatedAt(requirement.getUpdatedAt())
                .build();
    }
}
