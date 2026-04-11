package com.scopesmith.repository;

import com.scopesmith.entity.Document;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface DocumentRepository extends JpaRepository<Document, Long> {

    List<Document> findByProjectId(Long projectId);

    /** Project-level documents only (requirement_id IS NULL) */
    List<Document> findByProjectIdAndRequirementIsNull(Long projectId);

    /** Requirement-specific documents */
    List<Document> findByRequirementId(Long requirementId);

    @Query("SELECT d.project.id FROM Document d WHERE d.id = :documentId")
    Optional<Long> findProjectIdByDocumentId(@Param("documentId") Long documentId);
}
