package com.scopesmith.repository;

import com.scopesmith.entity.Analysis;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface AnalysisRepository extends JpaRepository<Analysis, Long> {

    @Query("SELECT a FROM Analysis a JOIN FETCH a.requirement WHERE a.requirement.id = :requirementId ORDER BY a.createdAt DESC")
    List<Analysis> findByRequirementIdOrderByCreatedAtDesc(@Param("requirementId") Long requirementId);

    @Query("SELECT a FROM Analysis a JOIN FETCH a.requirement WHERE a.id = :id")
    Optional<Analysis> findByIdWithRequirement(@Param("id") Long id);

    /**
     * All analyses for a project — used by InsightService for pattern detection.
     */
    @Query("SELECT a FROM Analysis a JOIN a.requirement r WHERE r.project.id = :projectId ORDER BY a.createdAt DESC")
    List<Analysis> findByProjectId(@Param("projectId") Long projectId);

    /**
     * Risk level distribution for a project.
     */
    @Query("SELECT a.riskLevel, COUNT(a) FROM Analysis a JOIN a.requirement r WHERE r.project.id = :projectId GROUP BY a.riskLevel")
    List<Object[]> countByRiskLevelForProject(@Param("projectId") Long projectId);

    /**
     * Cross-project: find analyses from OTHER projects with same requirement type.
     */
    @Query("SELECT a FROM Analysis a JOIN FETCH a.requirement r WHERE r.project.id != :excludeProjectId AND r.type = :type ORDER BY a.createdAt DESC")
    List<Analysis> findByOtherProjectsAndType(@Param("excludeProjectId") Long excludeProjectId, @Param("type") com.scopesmith.entity.RequirementType type);
}
