package com.scopesmith.dto;

import lombok.Data;

/**
 * Partial update request for a task — only non-null fields are applied.
 */
@Data
public class TaskUpdateRequest {
    private String title;
    private String description;
    private String acceptanceCriteria;
    private String priority;
    private String category;
    private String spRationale;
    private Long serviceId;
}
