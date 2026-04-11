package com.scopesmith.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

@Service
@Slf4j
public class ScanSecurityService {

    @Value("${scopesmith.scan.allowed-roots:${user.home}}")
    private String allowedRootsRaw;

    /**
     * Validates and normalizes local scan path.
     * Rules:
     * - Path must exist and be a directory
     * - Path must be under configured allowlist roots
     */
    public String validateLocalFolderPath(String folderPath) {
        if (folderPath == null || folderPath.isBlank()) {
            throw new IllegalArgumentException("folderPath is required");
        }

        Path target = Path.of(folderPath.trim()).toAbsolutePath().normalize();
        if (!Files.exists(target) || !Files.isDirectory(target)) {
            throw new IllegalArgumentException("Path is not a valid directory: " + folderPath);
        }

        Path targetReal = toRealPathSafe(target);
        List<Path> allowedRoots = resolveAllowedRoots();
        boolean allowed = allowedRoots.stream().anyMatch(targetReal::startsWith);
        if (!allowed) {
            throw new IllegalArgumentException("Path is outside allowed scan roots");
        }

        return targetReal.toString();
    }

    /**
     * Allows only HTTPS/SSH git URLs.
     */
    public String validateGitUrl(String gitUrl) {
        if (gitUrl == null || gitUrl.isBlank()) {
            throw new IllegalArgumentException("gitUrl is required");
        }
        String value = gitUrl.trim();
        boolean https = value.startsWith("https://");
        boolean sshScheme = value.startsWith("ssh://");
        boolean sshScpLike = value.matches("^[A-Za-z0-9._-]+@[^:]+:.+$");

        if (!https && !sshScheme && !sshScpLike) {
            throw new IllegalArgumentException("Only HTTPS or SSH git URLs are allowed");
        }

        return value;
    }

    private List<Path> resolveAllowedRoots() {
        List<Path> roots = new ArrayList<>();
        for (String raw : allowedRootsRaw.split(",")) {
            String value = raw.trim();
            if (value.isEmpty()) continue;
            Path root = Path.of(value).toAbsolutePath().normalize();
            roots.add(toRealPathSafe(root));
        }
        if (roots.isEmpty()) {
            Path fallback = Path.of(System.getProperty("user.home")).toAbsolutePath().normalize();
            roots.add(toRealPathSafe(fallback));
        }
        return roots;
    }

    private Path toRealPathSafe(Path path) {
        try {
            if (Files.exists(path)) {
                return path.toRealPath();
            }
        } catch (IOException e) {
            log.debug("Could not resolve real path for {}", path, e);
        }
        return path;
    }
}
