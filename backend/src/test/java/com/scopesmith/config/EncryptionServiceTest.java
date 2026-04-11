package com.scopesmith.config;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

class EncryptionServiceTest {

    @Test
    void shouldFailFastWithDefaultKeyInProdProfile() {
        assertThrows(IllegalStateException.class, () ->
                new EncryptionService("scopesmith-default-key-change-in-production", "prod"));
    }

    @Test
    void shouldFailFastWithDefaultKeyInProductionProfile() {
        assertThrows(IllegalStateException.class, () ->
                new EncryptionService("scopesmith-default-key-change-in-production", "production"));
    }

    @Test
    void shouldNotFailFastWithDefaultKeyInNonProdProfile() {
        assertDoesNotThrow(() ->
                new EncryptionService("scopesmith-default-key-change-in-production", "nonprod"));
    }

    @Test
    void shouldNotFailWhenCustomKeyUsedInProd() {
        assertDoesNotThrow(() ->
                new EncryptionService("my-super-custom-encryption-key", "prod"));
    }
}
