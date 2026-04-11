package com.scopesmith.repository;

import com.scopesmith.entity.ProjectServiceNode;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ProjectServiceNodeRepository extends JpaRepository<ProjectServiceNode, Long> {
    List<ProjectServiceNode> findByProjectIdOrderByNameAsc(Long projectId);
    Optional<ProjectServiceNode> findByIdAndProjectId(Long id, Long projectId);
    boolean existsByProjectIdAndNameIgnoreCase(Long projectId, String name);
}
