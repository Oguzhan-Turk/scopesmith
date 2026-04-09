package com.scopesmith.config;

import com.scopesmith.repository.TaskRepository;
import com.scopesmith.service.ClaudeCodeService;
import com.scopesmith.service.ManagedAgentService;
import com.scopesmith.service.impl.CliAgentService;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ManagedAgentConfig {

    @Bean
    @ConditionalOnProperty(name = "scopesmith.features.managed-agent-enabled", havingValue = "true")
    public ManagedAgentService managedAgentService(TaskRepository taskRepository,
                                                    ClaudeCodeService claudeCodeService) {
        return new CliAgentService(taskRepository, claudeCodeService);
    }
}
