package com.scopesmith.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class ServiceScanResponse {
    private Long serviceId;
    private String serviceName;
    private String status;
    private Integer contextVersion;
    private LocalDateTime lastScannedAt;
    private String lastScannedCommitHash;
}
