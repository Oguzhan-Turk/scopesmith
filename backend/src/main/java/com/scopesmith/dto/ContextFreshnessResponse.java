package com.scopesmith.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class ContextFreshnessResponse {
    private String status;
    private Integer commitsBehind;
    private Integer changedFiles;
    private List<String> impactedModules;
    private Integer analysisFreshnessScore;
    private Integer contextConfidence;
    private String recommendation;
    private String reason;
}
