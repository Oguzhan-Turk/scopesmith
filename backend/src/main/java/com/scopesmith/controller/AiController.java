package com.scopesmith.controller;

import com.scopesmith.service.AiService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/ai")
@RequiredArgsConstructor
public class AiController {

    private final AiService aiService;

    @GetMapping("/health")
    public Map<String, String> healthCheck() {
        String response = aiService.healthCheck();
        return Map.of("status", "connected", "response", response);
    }
}
