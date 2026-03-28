package com.scopesmith.repository;

import com.scopesmith.entity.Analysis;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AnalysisRepository extends JpaRepository<Analysis, Long> {
    List<Analysis> findByRequirementIdOrderByCreatedAtDesc(Long requirementId);
}
