package com.scopesmith.service;

import com.scopesmith.entity.SyncProviderType;
import com.scopesmith.entity.Task;
import com.scopesmith.entity.TaskSyncRef;
import com.scopesmith.repository.TaskSyncRefRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TaskSyncRefService {

    private final TaskSyncRefRepository taskSyncRefRepository;

    @Transactional
    public TaskSyncRef upsert(Task task, SyncProviderType provider, String target, String externalRef) {
        TaskSyncRef ref = taskSyncRefRepository
                .findFirstByTaskIdAndProviderAndTargetOrderByCreatedAtDesc(task.getId(), provider, target)
                .filter(existing -> externalRef.equals(existing.getExternalRef()))
                .orElse(null);

        if (ref == null) {
            ref = TaskSyncRef.builder()
                    .task(task)
                    .provider(provider)
                    .target(target)
                    .externalRef(externalRef)
                    .build();
        }
        ref.setSyncState("SYNCED");
        ref.setLastVerifiedAt(LocalDateTime.now());
        return taskSyncRefRepository.save(ref);
    }

    @Transactional
    public void markCleared(TaskSyncRef ref) {
        ref.setSyncState("CLEARED");
        ref.setLastVerifiedAt(LocalDateTime.now());
        taskSyncRefRepository.save(ref);
    }

    @Transactional(readOnly = true)
    public List<TaskSyncRef> findByTask(Long taskId) {
        return taskSyncRefRepository.findByTaskIdOrderByCreatedAtAsc(taskId);
    }
}
