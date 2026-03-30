package com.scopesmith.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.*;
import java.nio.file.*;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.concurrent.TimeUnit;

@Service
@Slf4j
public class GitCloneService {

    private static final int CLONE_TIMEOUT_SECONDS = 120;

    /**
     * Shallow clone a git repo to a temp directory.
     * Supports HTTPS (with optional token) and SSH URLs.
     */
    public Path cloneRepo(String gitUrl, String token) throws IOException {
        Path tempDir = Files.createTempDirectory("scopesmith-clone-");

        try {
            String cloneUrl = gitUrl;
            // Inject token for HTTPS private repos
            if (token != null && !token.isBlank() && gitUrl.startsWith("https://")) {
                cloneUrl = gitUrl.replace("https://", "https://" + token + "@");
            }

            ProcessBuilder pb = new ProcessBuilder(
                    "git", "clone", "--depth", "1", cloneUrl, tempDir.toString()
            );
            pb.redirectErrorStream(true);

            log.info("Cloning repo: {} → {}", gitUrl, tempDir);
            Process process = pb.start();

            String output = new String(process.getInputStream().readAllBytes());

            boolean finished = process.waitFor(CLONE_TIMEOUT_SECONDS, TimeUnit.SECONDS);
            if (!finished) {
                process.destroyForcibly();
                cleanup(tempDir);
                throw new IOException("Git clone timed out after " + CLONE_TIMEOUT_SECONDS + " seconds");
            }

            if (process.exitValue() != 0) {
                cleanup(tempDir);
                throw new IOException("Git clone failed: " + output);
            }

            log.info("Clone complete: {}", tempDir);
            return tempDir;

        } catch (InterruptedException e) {
            cleanup(tempDir);
            Thread.currentThread().interrupt();
            throw new IOException("Git clone interrupted", e);
        }
    }

    /**
     * Recursively delete a directory.
     */
    public void cleanup(Path directory) {
        try {
            if (directory == null || !Files.exists(directory)) return;
            Files.walkFileTree(directory, new SimpleFileVisitor<>() {
                @Override
                public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) throws IOException {
                    Files.delete(file);
                    return FileVisitResult.CONTINUE;
                }

                @Override
                public FileVisitResult postVisitDirectory(Path dir, IOException exc) throws IOException {
                    Files.delete(dir);
                    return FileVisitResult.CONTINUE;
                }
            });
            log.debug("Cleaned up temp directory: {}", directory);
        } catch (IOException e) {
            log.warn("Failed to cleanup temp directory {}: {}", directory, e.getMessage());
        }
    }
}
