package com.scopesmith.repository;

import com.scopesmith.entity.Requirement;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RequirementRepository extends JpaRepository<Requirement, Long> {
    List<Requirement> findByProjectIdOrderByCreatedAtDesc(Long projectId);
}
