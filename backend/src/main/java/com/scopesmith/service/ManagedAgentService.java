package com.scopesmith.service;

import com.scopesmith.dto.AgentStartResult;
import com.scopesmith.dto.AgentStatusResult;

/**
 * Interface for managed agent execution.
 * Two implementations planned:
 *   - CliAgentService: runs `claude` CLI via ProcessBuilder (on-prem/self-hosted)
 *   - CloudAgentService: Anthropic Managed Agents REST API (SaaS, future)
 *
 * Bean is only created when feature flag is enabled.
 */
public interface ManagedAgentService {

    AgentStartResult startAgent(Long taskId);

    AgentStatusResult getStatus(Long taskId);

    void cancelAgent(Long taskId);
}
