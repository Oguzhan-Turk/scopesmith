package com.scopesmith.repository;

import com.scopesmith.entity.SyncProviderType;
import com.scopesmith.entity.TaskSyncRef;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface TaskSyncRefRepository extends JpaRepository<TaskSyncRef, Long> {

    List<TaskSyncRef> findByTaskIdOrderByCreatedAtAsc(Long taskId);

    Optional<TaskSyncRef> findFirstByTaskIdAndProviderAndTargetOrderByCreatedAtDesc(
            Long taskId, SyncProviderType provider, String target);

    @Query("""
            SELECT r
            FROM TaskSyncRef r
            JOIN r.task t
            WHERE t.analysis.id = :analysisId
              AND r.provider = :provider
            ORDER BY r.createdAt DESC
            """)
    List<TaskSyncRef> findByAnalysisIdAndProvider(@Param("analysisId") Long analysisId,
                                                   @Param("provider") SyncProviderType provider);

    @Query("""
            SELECT r
            FROM TaskSyncRef r
            JOIN r.task t
            WHERE t.analysis.id = :analysisId
            ORDER BY r.createdAt DESC
            """)
    List<TaskSyncRef> findByAnalysisId(@Param("analysisId") Long analysisId);
}
