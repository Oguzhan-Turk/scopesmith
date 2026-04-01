package com.scopesmith.repository;

import com.scopesmith.entity.Task;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface TaskRepository extends JpaRepository<Task, Long> {
    List<Task> findByAnalysisId(Long analysisId);

    /**
     * Find all tasks in a project that have been finalized (spFinal != null).
     * Used for Learning SP — team calibration (Layer 1) and similar task reference (Layer 3).
     */
    @Query("SELECT t FROM Task t " +
            "JOIN t.analysis a " +
            "JOIN a.requirement r " +
            "WHERE r.project.id = :projectId " +
            "AND t.spFinal IS NOT NULL " +
            "ORDER BY t.createdAt DESC")
    List<Task> findFinalizedTasksByProjectId(@Param("projectId") Long projectId);

    /**
     * Count finalized tasks in a project — used to check minimum threshold (20+).
     */
    @Query("SELECT COUNT(t) FROM Task t " +
            "JOIN t.analysis a " +
            "JOIN a.requirement r " +
            "WHERE r.project.id = :projectId " +
            "AND t.spFinal IS NOT NULL")
    long countFinalizedTasksByProjectId(@Param("projectId") Long projectId);

    /**
     * All finalized tasks across ALL projects — org-level SP calibration.
     */
    @Query("SELECT t FROM Task t " +
            "JOIN FETCH t.analysis a " +
            "JOIN FETCH a.requirement r " +
            "JOIN FETCH r.project " +
            "WHERE t.spFinal IS NOT NULL " +
            "ORDER BY t.createdAt DESC " +
            "LIMIT 50")
    List<Task> findAllFinalizedTasks();

    @Query("SELECT COUNT(t) FROM Task t WHERE t.spFinal IS NOT NULL")
    long countAllFinalizedTasks();
}
