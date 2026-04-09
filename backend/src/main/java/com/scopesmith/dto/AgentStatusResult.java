package com.scopesmith.dto;

public record AgentStatusResult(
        String sessionId,
        String status,
        String branch,
        String error
) {}
