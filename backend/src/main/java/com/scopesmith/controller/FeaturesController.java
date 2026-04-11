package com.scopesmith.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/features")
public class FeaturesController {

    @Value("${scopesmith.features.managed-agent-enabled:false}")
    private boolean managedAgentEnabled;

    @Value("${scopesmith.features.self-assistant-enabled:false}")
    private boolean selfAssistantEnabled;

    @GetMapping
    public Map<String, Boolean> getFeatures() {
        return Map.of(
                "managedAgentEnabled", managedAgentEnabled,
                "selfAssistantEnabled", selfAssistantEnabled
        );
    }
}
