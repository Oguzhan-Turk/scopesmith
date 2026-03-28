package com.scopesmith.repository;

import com.scopesmith.entity.Document;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DocumentRepository extends JpaRepository<Document, Long> {
    List<Document> findByProjectId(Long projectId);
}
