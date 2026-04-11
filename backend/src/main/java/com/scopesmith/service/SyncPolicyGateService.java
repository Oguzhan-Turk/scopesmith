package com.scopesmith.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.scopesmith.dto.IntegrationConfigDTO;
import com.scopesmith.dto.SyncPolicyCheckResponse;
import com.scopesmith.entity.Analysis;
import com.scopesmith.entity.Task;
import com.scopesmith.repository.AnalysisRepository;
import com.scopesmith.repository.TaskRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class SyncPolicyGateService {

    private static final String ERROR = "ERROR";
    private static final String WARNING = "WARNING";

    private final AnalysisRepository analysisRepository;
    private final TaskRepository taskRepository;
    private final ObjectMapper objectMapper;

    public enum SyncProvider {
        JIRA,
        GITHUB
    }

    public SyncPolicyCheckResponse evaluate(Long analysisId, List<Long> taskIds) {
        return evaluate(analysisId, taskIds, null, null);
    }

    public SyncPolicyCheckResponse evaluateForProvider(
            Long analysisId, List<Long> taskIds, SyncProvider provider, String overrideTarget) {
        return evaluate(analysisId, taskIds, provider, overrideTarget);
    }

    public SyncPolicyCheckResponse evaluate(Long analysisId, List<Long> taskIds, SyncProvider provider, String overrideTarget) {
        Analysis analysis = analysisRepository.findByIdWithRequirement(analysisId)
                .orElseThrow(() -> new EntityNotFoundException("Analysis not found: " + analysisId));

        List<Task> allTasks = taskRepository.findByAnalysisId(analysisId);
        List<SyncPolicyCheckResponse.Violation> violations = new ArrayList<>();
        Set<Long> taskErrorIds = new HashSet<>();

        Set<Long> requestedIds = (taskIds != null && !taskIds.isEmpty()) ? new HashSet<>(taskIds) : null;
        Set<Long> existingIds = allTasks.stream().map(Task::getId).collect(java.util.stream.Collectors.toSet());

        if (allTasks.isEmpty()) {
            violations.add(violation(null, null, "NO_TASKS", ERROR, "Analizde senkronize edilecek task bulunmuyor."));
        }

        List<Task> scopedTasks = allTasks;
        if (requestedIds != null) {
            for (Long requestedId : requestedIds) {
                if (!existingIds.contains(requestedId)) {
                    violations.add(violation(
                            requestedId,
                            null,
                            "TASK_NOT_IN_ANALYSIS",
                            ERROR,
                            "Seçilen task bu analize ait değil veya bulunamadı."
                    ));
                }
            }
            scopedTasks = allTasks.stream().filter(t -> requestedIds.contains(t.getId())).toList();
        }

        if (scopedTasks.isEmpty()) {
            violations.add(violation(null, null, "NO_SELECTED_TASKS", ERROR, "Seçili kapsamda senkronize edilecek task yok."));
        }

        for (Task task : scopedTasks) {
            if (task.getSpFinal() == null) {
                violations.add(violation(task.getId(), task.getTitle(), "MISSING_SP_FINAL", ERROR,
                        "Story point kararı olmadan sync yapılamaz."));
                taskErrorIds.add(task.getId());
            }
            if (task.getAcceptanceCriteria() == null || task.getAcceptanceCriteria().isBlank()) {
                violations.add(violation(task.getId(), task.getTitle(), "MISSING_ACCEPTANCE_CRITERIA", ERROR,
                        "Acceptance criteria boş olamaz."));
                taskErrorIds.add(task.getId());
            }
        }

        if (analysis.getPoSummary() == null || analysis.getPoSummary().isBlank()) {
            violations.add(violation(
                    null,
                    null,
                    "MISSING_STAKEHOLDER_SUMMARY",
                    WARNING,
                    "Stakeholder summary boş. Sync yapılabilir ama kalite için özet üretilmesi önerilir."
            ));
        }

        if (provider != null) {
            IntegrationConfigDTO config = parseIntegrationConfig(analysis.getRequirement().getProject().getIntegrationConfig());
            for (Task task : scopedTasks) {
                String serviceName = task.getService() != null ? task.getService().getName() : null;
                if (provider == SyncProvider.JIRA) {
                    String target = resolveJiraTarget(config, serviceName, overrideTarget);
                    if (target == null || target.isBlank()) {
                        violations.add(violation(
                                task.getId(),
                                task.getTitle(),
                                "MISSING_JIRA_ROUTE",
                                ERROR,
                                "Task için Jira hedefi bulunamadı. Service routing veya global Jira project key tanımlayın."
                        ));
                        taskErrorIds.add(task.getId());
                    }
                } else if (provider == SyncProvider.GITHUB) {
                    String target = resolveGithubTarget(config, serviceName, overrideTarget);
                    if (target == null || target.isBlank()) {
                        violations.add(violation(
                                task.getId(),
                                task.getTitle(),
                                "MISSING_GITHUB_ROUTE",
                                ERROR,
                                "Task için GitHub hedefi bulunamadı. Service routing veya global repo tanımlayın."
                        ));
                        taskErrorIds.add(task.getId());
                    }
                }
            }
        }

        int errorCount = (int) violations.stream().filter(v -> ERROR.equals(v.getSeverity())).count();
        int warningCount = (int) violations.stream().filter(v -> WARNING.equals(v.getSeverity())).count();
        int eligibleTasks = Math.max(0, scopedTasks.size() - taskErrorIds.size());
        boolean passed = errorCount == 0;

        String message;
        if (passed) {
            message = String.format(Locale.ENGLISH,
                    "Policy gate passed. %d/%d task sync için uygun.",
                    eligibleTasks, scopedTasks.size());
        } else {
            message = String.format(Locale.ENGLISH,
                    "Policy gate failed. %d hata, %d uyarı.",
                    errorCount, warningCount);
        }

        return SyncPolicyCheckResponse.builder()
                .passed(passed)
                .status(passed ? "PASS" : "FAIL")
                .totalTasks(scopedTasks.size())
                .eligibleTasks(eligibleTasks)
                .errorCount(errorCount)
                .warningCount(warningCount)
                .message(message)
                .violations(violations)
                .build();
    }

    public SyncPolicyCheckResponse assertCanSync(Long analysisId, List<Long> taskIds) {
        SyncPolicyCheckResponse report = evaluate(analysisId, taskIds);
        if (!report.isPassed()) {
            throw new SyncPolicyViolationException(report);
        }
        return report;
    }

    public SyncPolicyCheckResponse assertCanSyncForProvider(
            Long analysisId, List<Long> taskIds, SyncProvider provider, String overrideTarget) {
        SyncPolicyCheckResponse report = evaluate(analysisId, taskIds, provider, overrideTarget);
        if (!report.isPassed()) {
            throw new SyncPolicyViolationException(report);
        }
        return report;
    }

    private IntegrationConfigDTO parseIntegrationConfig(String json) {
        if (json == null || json.isBlank()) return null;
        try {
            return objectMapper.readValue(json, IntegrationConfigDTO.class);
        } catch (Exception e) {
            return null;
        }
    }

    private String resolveJiraTarget(IntegrationConfigDTO config, String serviceName, String overrideTarget) {
        if (overrideTarget != null && !overrideTarget.isBlank()) return overrideTarget;
        IntegrationConfigDTO.ServiceRouting routing = findRouting(config, serviceName);
        if (routing != null && routing.getJiraProjectKey() != null && !routing.getJiraProjectKey().isBlank()) {
            return routing.getJiraProjectKey();
        }
        if (config != null && config.getJira() != null) {
            return config.getJira().getProjectKey();
        }
        return null;
    }

    private String resolveGithubTarget(IntegrationConfigDTO config, String serviceName, String overrideTarget) {
        if (overrideTarget != null && !overrideTarget.isBlank()) return overrideTarget;
        IntegrationConfigDTO.ServiceRouting routing = findRouting(config, serviceName);
        if (routing != null && routing.getGithubRepo() != null && !routing.getGithubRepo().isBlank()) {
            return routing.getGithubRepo();
        }
        if (config != null && config.getGithub() != null) {
            return config.getGithub().getRepo();
        }
        return null;
    }

    private IntegrationConfigDTO.ServiceRouting findRouting(IntegrationConfigDTO config, String serviceName) {
        if (config == null || config.getServiceRouting() == null || serviceName == null || serviceName.isBlank()) {
            return null;
        }
        IntegrationConfigDTO.ServiceRouting exact = config.getServiceRouting().get(serviceName);
        if (exact != null) return exact;
        for (var entry : config.getServiceRouting().entrySet()) {
            if (entry.getKey() != null && entry.getKey().equalsIgnoreCase(serviceName)) {
                return entry.getValue();
            }
        }
        return null;
    }

    private SyncPolicyCheckResponse.Violation violation(
            Long taskId, String taskTitle, String code, String severity, String message) {
        return SyncPolicyCheckResponse.Violation.builder()
                .taskId(taskId)
                .taskTitle(taskTitle)
                .code(code)
                .severity(severity)
                .message(message)
                .build();
    }
}
