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

    @Query("SELECT a.requirement.project.id FROM Analysis a WHERE a.id = :analysisId")
    Optional<Long> findProjectIdByAnalysisId(@Param("analysisId") Long analysisId);

    /**
     * All analyses for a project — used by InsightService for pattern detection.
     */
    @Query("SELECT a FROM Analysis a JOIN a.requirement r WHERE r.project.id = :projectId ORDER BY a.createdAt DESC")
    List<Analysis> findByProjectId(@Param("projectId") Long projectId);

    @Query("""
            SELECT a
            FROM Analysis a
            JOIN FETCH a.requirement r
            WHERE r.project.id = :projectId
              AND a.createdAt = (
                SELECT MAX(a2.createdAt)
                FROM Analysis a2
                WHERE a2.requirement.id = r.id
              )
            ORDER BY a.createdAt DESC
            """)
    List<Analysis> findLatestByProjectId(@Param("projectId") Long projectId);

    /**
     * Risk level distribution for a project.
     */
    @Query("SELECT a.riskLevel, COUNT(a) FROM Analysis a JOIN a.requirement r WHERE r.project.id = :projectId GROUP BY a.riskLevel")
    List<Object[]> countByRiskLevelForProject(@Param("projectId") Long projectId);

    /**
     * Cross-project within the same organization only.
     * Prevents organizational data leakage in insight prompts.
     */
    @Query("""
            SELECT a
            FROM Analysis a
            JOIN FETCH a.requirement r
            JOIN r.project p
            WHERE p.id != :excludeProjectId
              AND p.organization.id = :organizationId
              AND r.type = :type
            ORDER BY a.createdAt DESC
            """)
    List<Analysis> findByOtherProjectsInOrganizationAndType(
            @Param("excludeProjectId") Long excludeProjectId,
            @Param("organizationId") Long organizationId,
            @Param("type") com.scopesmith.entity.RequirementType type
    );
}
