package com.scopesmith.dto;

import com.scopesmith.entity.ServiceType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FederatedContextResponse {
    private Long projectId;
    private LocalDateTime generatedAt;
    private int serviceCount;
    private List<ServiceContextItem> services;
    private String combinedContext;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ServiceContextItem {
        private Long serviceId;
        private String name;
        private ServiceType serviceType;
        private Integer contextVersion;
        private LocalDateTime lastScannedAt;
        private boolean hasContext;
    }
}
