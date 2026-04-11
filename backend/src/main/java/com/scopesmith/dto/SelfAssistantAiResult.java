package com.scopesmith.dto;

import lombok.Data;

import java.util.List;

@Data
public class SelfAssistantAiResult {
    private String answer;
    private String confidence;
    private List<ActionItem> actions;

    @Data
    public static class ActionItem {
        private String label;
        private String actionType;
        private String target;
    }
}
