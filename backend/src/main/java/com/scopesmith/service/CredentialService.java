package com.scopesmith.service;

import com.scopesmith.entity.Credential;
import com.scopesmith.repository.CredentialRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

/**
 * Manages credentials stored in the database.
 * DB credentials take priority over .env values.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CredentialService {

    private final CredentialRepository credentialRepository;

    public Optional<String> get(String key) {
        return credentialRepository.findByKey(key).map(Credential::getValue);
    }

    public void save(String key, String value) {
        Credential credential = credentialRepository.findByKey(key)
                .orElse(Credential.builder().key(key).build());
        credential.setValue(value);
        credentialRepository.save(credential);
        log.info("Credential saved: {}", key);
    }

    public void delete(String key) {
        credentialRepository.findByKey(key).ifPresent(credentialRepository::delete);
    }

    /**
     * Returns all credentials with values masked for display.
     */
    public Map<String, String> getAllMasked() {
        Map<String, String> result = new LinkedHashMap<>();
        for (Credential c : credentialRepository.findAll()) {
            String masked = maskValue(c.getValue());
            result.put(c.getKey(), masked);
        }
        return result;
    }

    /**
     * Returns all credentials with actual values (for internal use by config beans).
     */
    public Map<String, String> getAll() {
        Map<String, String> result = new LinkedHashMap<>();
        for (Credential c : credentialRepository.findAll()) {
            result.put(c.getKey(), c.getValue());
        }
        return result;
    }

    private String maskValue(String value) {
        if (value == null || value.length() < 8) return "****";
        return value.substring(0, 4) + "****" + value.substring(value.length() - 4);
    }
}
