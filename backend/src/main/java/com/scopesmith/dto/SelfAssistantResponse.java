package com.scopesmith.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class SelfAssistantResponse {
    private String answer;
    private String confidence;
    private boolean fallbackUsed;
    private List<EvidenceItem> evidence;
    private List<ActionItem> actions;

    @Data
    @Builder
    public static class EvidenceItem {
        private String sourceType;
        private String sourceRef;
        private String detail;
    }

    @Data
    @Builder
    public static class ActionItem {
        private String label;
        private String actionType;
        private String target;
    }
}
