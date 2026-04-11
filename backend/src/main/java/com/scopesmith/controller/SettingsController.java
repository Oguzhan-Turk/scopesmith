package com.scopesmith.controller;

import com.scopesmith.dto.AiModelConfigDTO;
import com.scopesmith.entity.ModelTier;
import com.scopesmith.service.AiModelConfigService;
import com.scopesmith.service.CredentialService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/settings")
@RequiredArgsConstructor
public class SettingsController {

    private final CredentialService credentialService;
    private final AiModelConfigService aiModelConfigService;

    @GetMapping("/credentials")
    public Map<String, String> getCredentials() {
        return credentialService.getAllMasked();
    }

    @PutMapping("/credentials")
    public Map<String, String> updateCredentials(@RequestBody Map<String, String> credentials) {
        for (var entry : credentials.entrySet()) {
            String key = entry.getKey();
            String value = entry.getValue();
            if (value != null && !value.isBlank() && !value.contains("••••") && !value.contains("****")) {
                // Only save if value is not masked (user changed it)
                credentialService.save(key, value);
            }
        }
        return credentialService.getAllMasked();
    }

    @GetMapping("/models")
    public List<AiModelConfigDTO> getModels() {
        return aiModelConfigService.findAll();
    }

    @PutMapping("/models/{tier}")
    public AiModelConfigDTO upsertModel(
            @PathVariable String tier,
            @RequestBody AiModelConfigDTO request) {
        ModelTier parsedTier = ModelTier.valueOf(tier.toUpperCase(java.util.Locale.ENGLISH));
        return aiModelConfigService.upsert(parsedTier, request);
    }
}
