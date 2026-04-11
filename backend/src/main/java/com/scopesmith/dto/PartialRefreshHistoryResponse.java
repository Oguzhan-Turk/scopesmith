package com.scopesmith.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class PartialRefreshHistoryResponse {
    private Integer page;
    private Integer size;
    private Long totalElements;
    private Integer totalPages;
    private List<PartialRefreshStatusResponse> items;
}
