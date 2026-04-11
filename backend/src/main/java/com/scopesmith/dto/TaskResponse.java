package com.scopesmith.dto;

import com.scopesmith.entity.Task;
import com.scopesmith.entity.TaskSyncRef;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class TaskResponse {

    private Long id;
    private Long analysisId;
    private String title;
    private String description;
    private String acceptanceCriteria;
    private Integer spSuggestion;
    private String spRationale;
    private Integer spFinal;
    private String spDivergenceReason;
    private String priority;
    private String category;
    private Long serviceId;
    private String serviceName;
    private String dependencyTitle;
    private String jiraKey;
    private List<SyncRefInfo> syncRefs;
    private String agentSessionId;
    private String agentStatus;
    private String agentBranch;
    private LocalDateTime createdAt;

    public static TaskResponse from(Task task) {
        return TaskResponse.builder()
                .id(task.getId())
                .analysisId(task.getAnalysis().getId())
                .title(task.getTitle())
                .description(task.getDescription())
                .acceptanceCriteria(task.getAcceptanceCriteria())
                .spSuggestion(task.getSpSuggestion())
                .spRationale(task.getSpRationale())
                .spFinal(task.getSpFinal())
                .spDivergenceReason(task.getSpDivergenceReason())
                .priority(task.getPriority().name())
                .category(task.getCategory())
                .serviceId(task.getService() != null ? task.getService().getId() : null)
                .serviceName(task.getService() != null ? task.getService().getName() : null)
                .dependencyTitle(task.getDependency() != null ? task.getDependency().getTitle() : null)
                .jiraKey(task.getJiraKey())
                .syncRefs(task.getSyncRefs() == null ? List.of() : task.getSyncRefs().stream().map(SyncRefInfo::from).toList())
                .agentSessionId(task.getAgentSessionId())
                .agentStatus(task.getAgentStatus())
                .agentBranch(task.getAgentBranch())
                .createdAt(task.getCreatedAt())
                .build();
    }

    @Data
    @Builder
    public static class SyncRefInfo {
        private Long id;
        private String provider;
        private String externalRef;
        private String target;
        private String syncState;
        private LocalDateTime lastVerifiedAt;

        public static SyncRefInfo from(TaskSyncRef ref) {
            return SyncRefInfo.builder()
                    .id(ref.getId())
                    .provider(ref.getProvider().name())
                    .externalRef(ref.getExternalRef())
                    .target(ref.getTarget())
                    .syncState(ref.getSyncState())
                    .lastVerifiedAt(ref.getLastVerifiedAt())
                    .build();
        }
    }
}
