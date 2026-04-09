package com.scopesmith.service.impl;

import com.scopesmith.dto.AgentStartResult;
import com.scopesmith.dto.AgentStatusResult;
import com.scopesmith.entity.Task;
import com.scopesmith.repository.TaskRepository;
import com.scopesmith.service.ClaudeCodeService;
import com.scopesmith.service.ManagedAgentService;
import jakarta.persistence.EntityNotFoundException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.transaction.annotation.Transactional;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * CLI-based managed agent implementation.
 * Runs `claude` CLI via ProcessBuilder in a git branch.
 * Designed for on-prem/self-hosted deployments where the server
 * has local access to the git repository.
 */
@Slf4j
public class CliAgentService implements ManagedAgentService {

    private final TaskRepository taskRepository;
    private final ClaudeCodeService claudeCodeService;
    private final Map<Long, Process> runningProcesses = new ConcurrentHashMap<>();

    public CliAgentService(TaskRepository taskRepository, ClaudeCodeService claudeCodeService) {
        this.taskRepository = taskRepository;
        this.claudeCodeService = claudeCodeService;
    }

    @Override
    @Transactional
    public AgentStartResult startAgent(Long taskId) {
        Task task = findTask(taskId);

        if (task.getAgentStatus() != null && "IN_PROGRESS".equals(task.getAgentStatus())) {
            throw new IllegalStateException("Agent already running for task #" + taskId);
        }

        String localPath = task.getAnalysis().getRequirement().getProject().getLocalPath();
        if (localPath == null || localPath.isBlank()) {
            throw new IllegalStateException(
                    "Project has no local path configured. Scan the project context first.");
        }

        String branchName = buildBranchName(task);
        task.setAgentStatus("PENDING");
        task.setAgentBranch(branchName);
        task.setAgentSessionId(null);
        taskRepository.save(task);

        // Fire async execution
        executeAgentAsync(taskId, localPath, branchName);

        log.info("Agent start requested for task #{}, branch: {}", taskId, branchName);
        return new AgentStartResult(null, "PENDING", branchName);
    }

    @Override
    @Transactional(readOnly = true)
    public AgentStatusResult getStatus(Long taskId) {
        Task task = findTask(taskId);
        return new AgentStatusResult(
                task.getAgentSessionId(),
                task.getAgentStatus(),
                task.getAgentBranch(),
                null
        );
    }

    @Override
    @Transactional
    public void cancelAgent(Long taskId) {
        Task task = findTask(taskId);
        Process process = runningProcesses.remove(taskId);
        if (process != null && process.isAlive()) {
            process.destroyForcibly();
            log.info("Agent process cancelled for task #{}", taskId);
        }
        task.setAgentStatus("CANCELLED");
        taskRepository.save(task);
    }

    @Async("agentExecutor")
    public void executeAgentAsync(Long taskId, String localPath, String branchName) {
        try {
            // 1. Build prompt
            String prompt = claudeCodeService.buildPrompt(taskId);

            // 2. Create and checkout branch
            createBranch(localPath, branchName);

            // 3. Update status
            updateStatus(taskId, "IN_PROGRESS", null);

            // 4. Run claude CLI
            log.info("Starting Claude CLI agent for task #{} in {}", taskId, localPath);
            ProcessBuilder pb = new ProcessBuilder(
                    "claude", "-p", prompt,
                    "--output-format", "json",
                    "--max-turns", "50"
            );
            pb.directory(new java.io.File(localPath));
            pb.redirectErrorStream(true);

            Process process = pb.start();
            runningProcesses.put(taskId, process);

            // 5. Read output (blocking, runs in agent thread pool)
            String output;
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                output = reader.lines().collect(Collectors.joining("\n"));
            }

            int exitCode = process.waitFor();
            runningProcesses.remove(taskId);

            // 6. Parse result and update
            if (exitCode == 0) {
                String sessionId = extractSessionId(output);
                updateStatus(taskId, "COMPLETED", sessionId);
                log.info("Agent completed for task #{}, session: {}", taskId, sessionId);
            } else {
                log.warn("Agent failed for task #{}, exit code: {}\nOutput: {}",
                        taskId, exitCode, truncate(output, 500));
                updateStatus(taskId, "FAILED", null);
            }
        } catch (Exception e) {
            log.error("Agent execution error for task #{}: {}", taskId, e.getMessage(), e);
            runningProcesses.remove(taskId);
            updateStatus(taskId, "FAILED", null);
        }
    }

    @Transactional
    protected void updateStatus(Long taskId, String status, String sessionId) {
        Task task = findTask(taskId);
        task.setAgentStatus(status);
        if (sessionId != null) {
            task.setAgentSessionId(sessionId);
        }
        taskRepository.save(task);
    }

    private void createBranch(String localPath, String branchName) {
        try {
            ProcessBuilder pb = new ProcessBuilder("git", "checkout", "-b", branchName);
            pb.directory(new java.io.File(localPath));
            pb.redirectErrorStream(true);
            Process p = pb.start();
            int exit = p.waitFor();
            if (exit != 0) {
                // Branch might already exist — try switching
                pb = new ProcessBuilder("git", "checkout", branchName);
                pb.directory(new java.io.File(localPath));
                pb.redirectErrorStream(true);
                pb.start().waitFor();
            }
            log.info("Git branch ready: {}", branchName);
        } catch (Exception e) {
            log.warn("Could not create git branch {}: {}", branchName, e.getMessage());
        }
    }

    private String buildBranchName(Task task) {
        String slug = task.getTitle()
                .toLowerCase(Locale.ENGLISH)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-|-$", "");
        if (slug.length() > 40) slug = slug.substring(0, 40);
        return "scopesmith/task-" + task.getId() + "-" + slug;
    }

    private String extractSessionId(String output) {
        // Try to parse session_id from JSON output
        // Claude CLI --output-format json returns {"session_id": "..."}
        try {
            if (output.contains("session_id")) {
                int idx = output.indexOf("session_id");
                int start = output.indexOf("\"", idx + 12) + 1;
                int end = output.indexOf("\"", start);
                if (start > 0 && end > start) {
                    return output.substring(start, end);
                }
            }
        } catch (Exception ignored) {}
        return "cli-" + System.currentTimeMillis();
    }

    private Task findTask(Long taskId) {
        return taskRepository.findById(taskId)
                .orElseThrow(() -> new EntityNotFoundException("Task not found: " + taskId));
    }

    private String truncate(String text, int maxLen) {
        return text != null && text.length() > maxLen ? text.substring(0, maxLen) + "..." : text;
    }
}
