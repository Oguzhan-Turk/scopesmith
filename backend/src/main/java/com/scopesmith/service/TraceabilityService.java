package com.scopesmith.service;

import com.scopesmith.dto.TraceabilityResponse;
import com.scopesmith.entity.Analysis;
import com.scopesmith.entity.Requirement;
import com.scopesmith.entity.Task;
import com.scopesmith.repository.AnalysisRepository;
import com.scopesmith.repository.RequirementRepository;
import com.scopesmith.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TraceabilityService {

    private final RequirementRepository requirementRepository;
    private final AnalysisRepository analysisRepository;
    private final TaskRepository taskRepository;

    @Transactional(readOnly = true)
    public TraceabilityResponse buildProjectTraceability(Long projectId) {
        List<Requirement> requirements = requirementRepository.findByProjectIdOrderByCreatedAtDesc(projectId);
        List<Analysis> latestAnalyses = analysisRepository.findLatestByProjectId(projectId);
        Map<Long, Analysis> analysisByRequirementId = latestAnalyses.stream()
                .collect(Collectors.toMap(a -> a.getRequirement().getId(), Function.identity()));

        List<TraceabilityResponse.Item> items = new ArrayList<>();
        int analyzedRequirements = 0;
        int requirementsWithTasks = 0;
        int totalTasks = 0;
        int approvedTasks = 0;
        int syncedTasks = 0;

        for (Requirement requirement : requirements) {
            Analysis analysis = analysisByRequirementId.get(requirement.getId());
            List<Task> tasks = analysis != null ? taskRepository.findByAnalysisId(analysis.getId()) : List.of();

            if (analysis != null) {
                analyzedRequirements++;
            }
            if (!tasks.isEmpty()) {
                requirementsWithTasks++;
            }

            int itemApprovedTasks = 0;
            int itemSyncedTasks = 0;
            List<TraceabilityResponse.TaskLink> taskLinks = new ArrayList<>();
            LinkedHashSet<String> syncTargets = new LinkedHashSet<>();

            for (Task task : tasks) {
                List<TraceabilityResponse.SyncRef> syncRefs = task.getSyncRefs() == null ? List.of()
                        : task.getSyncRefs().stream()
                        .filter(r -> "SYNCED".equalsIgnoreCase(r.getSyncState()))
                        .map(r -> TraceabilityResponse.SyncRef.builder()
                                .provider(r.getProvider().name())
                                .externalRef(r.getExternalRef())
                                .target(r.getTarget())
                                .syncState(r.getSyncState())
                                .build())
                        .toList();

                String syncRef = !syncRefs.isEmpty() ? syncRefs.getFirst().getExternalRef() : task.getJiraKey();
                String syncTarget = !syncRefs.isEmpty() ? syncRefs.getFirst().getProvider()
                        : (syncRef != null && !syncRef.isBlank() ? (syncRef.startsWith("#") ? "GITHUB" : "JIRA") : null);
                String syncStatus;
                if (task.getSpFinal() == null) {
                    syncStatus = "DRAFT";
                } else if (syncRef != null && !syncRef.isBlank()) {
                    syncStatus = "SYNCED";
                    if (syncRefs.isEmpty()) {
                        syncTargets.add(syncTarget);
                    } else {
                        syncRefs.forEach(r -> syncTargets.add(r.getProvider()));
                    }
                    itemSyncedTasks++;
                } else {
                    syncStatus = "READY";
                }

                if (task.getSpFinal() != null) {
                    itemApprovedTasks++;
                }

                taskLinks.add(TraceabilityResponse.TaskLink.builder()
                        .taskId(task.getId())
                        .title(task.getTitle())
                        .spFinal(task.getSpFinal())
                        .syncRef(syncRef)
                        .syncTarget(syncTarget)
                        .syncStatus(syncStatus)
                        .syncRefs(syncRefs)
                        .build());
            }

            totalTasks += tasks.size();
            approvedTasks += itemApprovedTasks;
            syncedTasks += itemSyncedTasks;

            items.add(TraceabilityResponse.Item.builder()
                    .requirementId(requirement.getId())
                    .requirementSeq(requirement.getSequenceNumber())
                    .requirementType(requirement.getType() != null ? requirement.getType().name() : "FEATURE")
                    .requirementPreview(truncate(requirement.getRawText(), 120))
                    .analysisId(analysis != null ? analysis.getId() : null)
                    .analysisCreatedAt(analysis != null ? analysis.getCreatedAt() : null)
                    .taskCount(tasks.size())
                    .approvedTaskCount(itemApprovedTasks)
                    .syncedTaskCount(itemSyncedTasks)
                    .syncTargets(new ArrayList<>(syncTargets))
                    .tasks(taskLinks)
                    .build());
        }

        double syncCoveragePercent = approvedTasks == 0 ? 0.0 : (syncedTasks * 100.0) / approvedTasks;

        return TraceabilityResponse.builder()
                .projectId(projectId)
                .generatedAt(LocalDateTime.now())
                .summary(TraceabilityResponse.Summary.builder()
                        .totalRequirements(requirements.size())
                        .analyzedRequirements(analyzedRequirements)
                        .requirementsWithTasks(requirementsWithTasks)
                        .totalTasks(totalTasks)
                        .approvedTasks(approvedTasks)
                        .syncedTasks(syncedTasks)
                        .syncCoveragePercent(syncCoveragePercent)
                        .build())
                .items(items)
                .build();
    }

    private String truncate(String text, int max) {
        if (text == null) {
            return "";
        }
        return text.length() > max ? text.substring(0, max) + "..." : text;
    }
}
