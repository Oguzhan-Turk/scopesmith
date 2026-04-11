package com.scopesmith.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SecretRedactionServiceTest {

    private final SecretRedactionService service = new SecretRedactionService();

    @Test
    void redact_shouldMaskSensitiveAssignmentsAndTokens() {
        String input = """
                db.password=super-secret
                api_key: sk-live-123456
                Authorization: Bearer abc.def.ghi
                """;

        SecretRedactionService.RedactionResult result = service.redact(input);

        assertTrue(result.redactionCount() >= 3);
        assertTrue(result.content().contains("db.password=<REDACTED>"));
        assertTrue(result.content().contains("api_key: <REDACTED>"));
        assertTrue(result.content().contains("Bearer <REDACTED:TOKEN>"));
        assertFalse(result.content().contains("super-secret"));
    }

    @Test
    void redact_shouldMaskPrivateKeyBlocks() {
        String input = """
                -----BEGIN PRIVATE KEY-----
                abc123
                -----END PRIVATE KEY-----
                """;

        SecretRedactionService.RedactionResult result = service.redact(input);

        assertTrue(result.redactionCount() >= 1);
        assertTrue(result.content().contains("<REDACTED:PRIVATE_KEY>"));
        assertFalse(result.content().contains("abc123"));
    }
}
