package com.scopesmith.repository;

import com.scopesmith.entity.Document;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DocumentRepository extends JpaRepository<Document, Long> {

    List<Document> findByProjectId(Long projectId);

    /** Project-level documents only (requirement_id IS NULL) */
    List<Document> findByProjectIdAndRequirementIsNull(Long projectId);

    /** Requirement-specific documents */
    List<Document> findByRequirementId(Long requirementId);
}
