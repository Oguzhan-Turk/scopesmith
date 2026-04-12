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
import java.io.File;
import java.io.InputStreamReader;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

/**
 * CLI-based managed agent implementation.
 * Runs `claude` CLI in full agent mode (--dangerously-skip-permissions)
 * on the local machine. Designed for on-prem/VPN deployments where
 * the server has local filesystem access to the git repository.
 *
 * Security model: same as Claude Code CLI — code stays on the machine,
 * only relevant context snippets go to Anthropic API (standard API usage).
 */
@Slf4j
public class CliAgentService implements ManagedAgentService {

    private static final long AGENT_TIMEOUT_MINUTES = 30;

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

        if ("IN_PROGRESS".equals(task.getAgentStatus())) {
            throw new IllegalStateException("Agent already running for task #" + taskId);
        }

        String localPath = resolveLocalPath(task);
        String branchName = buildBranchName(task);

        task.setAgentStatus("PENDING");
        task.setAgentBranch(branchName);
        task.setAgentSessionId(null);
        taskRepository.save(task);

        // Fire async execution
        executeAgentAsync(taskId, localPath, branchName);

        log.info("Agent start requested for task #{}, branch: {}, path: {}", taskId, branchName, localPath);
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

            // 4. Run claude CLI in full agent mode
            log.info("Starting Claude agent for task #{} in {}", taskId, localPath);
            ProcessBuilder pb = new ProcessBuilder(
                    "claude",
                    "--dangerously-skip-permissions",
                    "-p", prompt,
                    "--output-format", "json",
                    "--model", "claude-sonnet-4-20250514",
                    "--max-turns", "100"
            );
            pb.directory(new File(localPath));
            pb.redirectErrorStream(true);
            pb.environment().put("CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC", "1");

            Process process = pb.start();
            runningProcesses.put(taskId, process);

            // 5. Read output (blocking, runs in agent thread pool)
            String output;
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                output = reader.lines().collect(Collectors.joining("\n"));
            }

            boolean finished = process.waitFor(AGENT_TIMEOUT_MINUTES, TimeUnit.MINUTES);
            if (!finished) {
                process.destroyForcibly();
                log.warn("Agent timed out for task #{} after {} minutes", taskId, AGENT_TIMEOUT_MINUTES);
                runningProcesses.remove(taskId);
                updateStatus(taskId, "FAILED", null);
                return;
            }

            int exitCode = process.exitValue();
            runningProcesses.remove(taskId);

            // 6. Commit & push
            if (exitCode == 0) {
                commitAndPush(localPath, branchName, taskId);
                String sessionId = extractSessionId(output);
                updateStatus(taskId, "COMPLETED", sessionId);
                log.info("Agent completed for task #{}, session: {}", taskId, sessionId);
            } else {
                log.warn("Agent failed for task #{}, exit code: {}\nOutput: {}",
                        taskId, exitCode, truncate(output, 1000));
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

    /**
     * Resolve the local filesystem path for the project.
     * Uses project.localPath (scan path) — the VPN machine must have access.
     */
    private String resolveLocalPath(Task task) {
        String localPath = task.getAnalysis().getRequirement().getProject().getLocalPath();
        if (localPath == null || localPath.isBlank()) {
            throw new IllegalStateException(
                    "Proje için yerel yol tanımlı değil. Önce Bağlam sekmesinden kaynak kodu taratın.");
        }
        File dir = new File(localPath);
        if (!dir.exists() || !dir.isDirectory()) {
            throw new IllegalStateException(
                    "Proje yolu bulunamadı: " + localPath + ". Yolun doğru olduğundan emin olun.");
        }
        return localPath;
    }

    private void createBranch(String localPath, String branchName) {
        try {
            // Ensure we're on the latest default branch first
            runGit(localPath, "git", "fetch", "origin");
            // Try to create new branch from current HEAD
            int exit = runGit(localPath, "git", "checkout", "-b", branchName);
            if (exit != 0) {
                // Branch might already exist — switch to it
                runGit(localPath, "git", "checkout", branchName);
            }
            log.info("Git branch ready: {}", branchName);
        } catch (Exception e) {
            log.warn("Could not create git branch {}: {}", branchName, e.getMessage());
        }
    }

    private void commitAndPush(String localPath, String branchName, Long taskId) {
        try {
            runGit(localPath, "git", "add", "-A");
            int commitExit = runGit(localPath, "git", "commit", "-m",
                    "scopesmith: task #" + taskId + " implementation\n\nGenerated by ScopeSmith managed agent.");
            if (commitExit == 0) {
                int pushExit = runGit(localPath, "git", "push", "-u", "origin", branchName);
                if (pushExit == 0) {
                    log.info("Pushed branch {} for task #{}", branchName, taskId);
                } else {
                    log.warn("Git push failed for task #{}, branch: {}", taskId, branchName);
                }
            } else {
                log.info("Nothing to commit for task #{} — agent may not have made changes", taskId);
            }
        } catch (Exception e) {
            log.warn("Git commit/push error for task #{}: {}", taskId, e.getMessage());
        }
    }

    private int runGit(String localPath, String... command) throws Exception {
        ProcessBuilder pb = new ProcessBuilder(command);
        pb.directory(new File(localPath));
        pb.redirectErrorStream(true);
        Process p = pb.start();
        // Drain output to avoid blocking
        try (var reader = new BufferedReader(new InputStreamReader(p.getInputStream()))) {
            while (reader.readLine() != null) { /* drain */ }
        }
        return p.waitFor();
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
