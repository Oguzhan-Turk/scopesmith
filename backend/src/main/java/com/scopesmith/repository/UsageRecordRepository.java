package com.scopesmith.repository;

import com.scopesmith.entity.OperationType;
import com.scopesmith.entity.UsageRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface UsageRecordRepository extends JpaRepository<UsageRecord, Long> {

    List<UsageRecord> findByProjectIdOrderByCreatedAtDesc(Long projectId);

    @Query("SELECT COALESCE(SUM(u.inputTokens), 0), COALESCE(SUM(u.outputTokens), 0), " +
            "COALESCE(SUM(u.estimatedCostUsd), 0), COUNT(u), COALESCE(SUM(u.durationMs), 0) " +
            "FROM UsageRecord u WHERE u.projectId = :projectId")
    Object[] getProjectSummary(@Param("projectId") Long projectId);

    @Query("SELECT u.operationType, COUNT(u), COALESCE(SUM(u.estimatedCostUsd), 0), " +
            "COALESCE(AVG(u.durationMs), 0) " +
            "FROM UsageRecord u WHERE u.projectId = :projectId GROUP BY u.operationType")
    List<Object[]> getProjectSummaryByOperation(@Param("projectId") Long projectId);

    @Query("SELECT COALESCE(SUM(u.inputTokens), 0), COALESCE(SUM(u.outputTokens), 0), " +
            "COALESCE(SUM(u.estimatedCostUsd), 0), COUNT(u), COALESCE(SUM(u.durationMs), 0) " +
            "FROM UsageRecord u")
    Object[] getGlobalSummary();

    long countByProjectIdAndOperationType(Long projectId, OperationType operationType);
}
