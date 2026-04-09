package com.scopesmith.dto;

public record AgentStartResult(
        String sessionId,
        String status,
        String branch
) {}
