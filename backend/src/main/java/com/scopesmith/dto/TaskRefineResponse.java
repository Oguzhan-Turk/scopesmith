package com.scopesmith.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class TaskRefineResponse {
    private List<TaskResponse> tasks;
    private List<String> orphanedIssues;   // jiraKeys that lost their mapping
    private List<String> preservedIssues;  // jiraKeys that were carried over
}
