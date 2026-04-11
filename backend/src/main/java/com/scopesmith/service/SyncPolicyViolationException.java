package com.scopesmith.service;

import com.scopesmith.dto.SyncPolicyCheckResponse;
import lombok.Getter;

@Getter
public class SyncPolicyViolationException extends RuntimeException {
    private final transient SyncPolicyCheckResponse report;

    public SyncPolicyViolationException(SyncPolicyCheckResponse report) {
        super(report != null ? report.getMessage() : "Sync policy validation failed.");
        this.report = report;
    }
}
