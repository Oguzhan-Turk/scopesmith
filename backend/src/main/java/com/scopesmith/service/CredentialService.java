package com.scopesmith.service;

import com.scopesmith.config.EncryptionService;
import com.scopesmith.entity.Credential;
import com.scopesmith.repository.CredentialRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

/**
 * Manages credentials stored encrypted in the database.
 * Values are encrypted at rest, decrypted on read.
 * Frontend always receives masked values.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CredentialService {

    private final CredentialRepository credentialRepository;
    private final EncryptionService encryptionService;

    public Optional<String> get(String key) {
        return credentialRepository.findByKey(key)
                .map(c -> encryptionService.decrypt(c.getValue()));
    }

    public void save(String key, String value) {
        Credential credential = credentialRepository.findByKey(key)
                .orElse(Credential.builder().key(key).build());
        credential.setValue(encryptionService.encrypt(value));
        credentialRepository.save(credential);
        log.info("Credential saved (encrypted): {}", key);
    }

    public void delete(String key) {
        credentialRepository.findByKey(key).ifPresent(credentialRepository::delete);
    }

    /**
     * Returns all credentials with values masked for display.
     * Decrypts first to get actual length for proper masking.
     */
    public Map<String, String> getAllMasked() {
        Map<String, String> result = new LinkedHashMap<>();
        for (Credential c : credentialRepository.findAll()) {
            String decrypted = encryptionService.decrypt(c.getValue());
            result.put(c.getKey(), maskValue(decrypted));
        }
        return result;
    }

    /**
     * Returns all credentials with actual (decrypted) values.
     * For internal use by integration services only.
     */
    public Map<String, String> getAll() {
        Map<String, String> result = new LinkedHashMap<>();
        for (Credential c : credentialRepository.findAll()) {
            result.put(c.getKey(), encryptionService.decrypt(c.getValue()));
        }
        return result;
    }

    private String maskValue(String value) {
        if (value == null || value.length() < 4) return "••••••••";
        // Show first 4 chars + fixed-length mask (prevents credential length leak)
        return value.substring(0, 4) + "••••••••";
    }
}
