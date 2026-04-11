package com.scopesmith.repository;

import com.scopesmith.entity.Requirement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface RequirementRepository extends JpaRepository<Requirement, Long> {
    List<Requirement> findByProjectIdOrderByCreatedAtDesc(Long projectId);

    @Query("SELECT COALESCE(MAX(r.sequenceNumber), 0) FROM Requirement r WHERE r.project.id = :projectId")
    int findMaxSequenceNumberByProjectId(@Param("projectId") Long projectId);

    @Query("SELECT r.project.id FROM Requirement r WHERE r.id = :requirementId")
    Optional<Long> findProjectIdByRequirementId(@Param("requirementId") Long requirementId);

    long countByProjectId(Long projectId);
}
