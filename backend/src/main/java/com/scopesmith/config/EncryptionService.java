package com.scopesmith.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.Base64;

/**
 * AES encryption for sensitive data (credentials).
 * Key is derived from a configurable secret or falls back to a default.
 */
@Component
@Slf4j
public class EncryptionService {

    private static final String ALGORITHM = "AES";
    private final SecretKeySpec keySpec;

    private static final String DEFAULT_KEY = "scopesmith-default-key-change-in-production";

    public EncryptionService(
            @Value("${scopesmith.encryption-key:" + DEFAULT_KEY + "}") String secret,
            @Value("${spring.profiles.active:default}") String activeProfile) {
        if (DEFAULT_KEY.equals(secret)) {
            if (activeProfile.contains("prod")) {
                throw new IllegalStateException(
                        "CRITICAL: Default encryption key cannot be used in production. " +
                        "Set 'scopesmith.encryption-key' environment variable.");
            }
            log.warn("⚠️  DEFAULT ENCRYPTION KEY IN USE. Set 'scopesmith.encryption-key' for production.");
        }
        try {
            byte[] keyBytes = MessageDigest.getInstance("SHA-256")
                    .digest(secret.getBytes(StandardCharsets.UTF_8));
            this.keySpec = new SecretKeySpec(Arrays.copyOf(keyBytes, 16), ALGORITHM);
        } catch (Exception e) {
            throw new RuntimeException("Failed to initialize encryption", e);
        }
    }

    public String encrypt(String plainText) {
        try {
            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.ENCRYPT_MODE, keySpec);
            byte[] encrypted = cipher.doFinal(plainText.getBytes(StandardCharsets.UTF_8));
            return "ENC:" + Base64.getEncoder().encodeToString(encrypted);
        } catch (Exception e) {
            log.error("Encryption failed", e);
            throw new RuntimeException("Encryption failed", e);
        }
    }

    public String decrypt(String encryptedText) {
        try {
            if (!encryptedText.startsWith("ENC:")) {
                // Legacy unencrypted value — return as-is
                return encryptedText;
            }
            String base64 = encryptedText.substring(4);
            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.DECRYPT_MODE, keySpec);
            byte[] decrypted = cipher.doFinal(Base64.getDecoder().decode(base64));
            return new String(decrypted, StandardCharsets.UTF_8);
        } catch (Exception e) {
            log.error("Decryption failed — returning raw value", e);
            return encryptedText; // Fallback for corrupted data
        }
    }
}
