package com.scopesmith.service;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class ScanSecurityServiceTest {

    @Test
    void shouldAllowPathUnderConfiguredRoot() throws Exception {
        ScanSecurityService service = new ScanSecurityService();
        Path root = Files.createTempDirectory("scopesmith-allowed-root");
        Path target = Files.createDirectory(root.resolve("project-a"));
        ReflectionTestUtils.setField(service, "allowedRootsRaw", root.toString());

        String validated = service.validateLocalFolderPath(target.toString());

        assertEquals(target.toRealPath().toString(), validated);
    }

    @Test
    void shouldRejectPathOutsideConfiguredRoot() throws Exception {
        ScanSecurityService service = new ScanSecurityService();
        Path allowedRoot = Files.createTempDirectory("scopesmith-allowed-root");
        Path outside = Files.createTempDirectory("scopesmith-outside-root");
        ReflectionTestUtils.setField(service, "allowedRootsRaw", allowedRoot.toString());

        assertThrows(IllegalArgumentException.class,
                () -> service.validateLocalFolderPath(outside.toString()));
    }

    @Test
    void shouldValidateSupportedGitUrls() {
        ScanSecurityService service = new ScanSecurityService();

        assertDoesNotThrow(() -> service.validateGitUrl("https://github.com/acme/repo.git"));
        assertDoesNotThrow(() -> service.validateGitUrl("ssh://git@github.com/acme/repo.git"));
        assertDoesNotThrow(() -> service.validateGitUrl("git@github.com:acme/repo.git"));
    }

    @Test
    void shouldRejectUnsupportedGitUrlSchemes() {
        ScanSecurityService service = new ScanSecurityService();

        assertThrows(IllegalArgumentException.class,
                () -> service.validateGitUrl("http://github.com/acme/repo.git"));
        assertThrows(IllegalArgumentException.class,
                () -> service.validateGitUrl("file:///tmp/repo"));
    }
}
