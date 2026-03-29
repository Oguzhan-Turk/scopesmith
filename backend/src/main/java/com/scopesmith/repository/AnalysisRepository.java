package com.scopesmith.repository;

import com.scopesmith.entity.Analysis;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface AnalysisRepository extends JpaRepository<Analysis, Long> {

    /**
     * Fetch analyses with requirement eagerly loaded to avoid N+1 queries
     * when mapping to AnalysisResponse (which accesses requirement.getId()).
     */
    @Query("SELECT a FROM Analysis a JOIN FETCH a.requirement WHERE a.requirement.id = :requirementId ORDER BY a.createdAt DESC")
    List<Analysis> findByRequirementIdOrderByCreatedAtDesc(@Param("requirementId") Long requirementId);

    /**
     * Fetch single analysis with requirement eagerly loaded.
     */
    @Query("SELECT a FROM Analysis a JOIN FETCH a.requirement WHERE a.id = :id")
    Optional<Analysis> findByIdWithRequirement(@Param("id") Long id);
}
