package com.scopesmith.repository;

import com.scopesmith.entity.ProjectMembership;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ProjectMembershipRepository extends JpaRepository<ProjectMembership, Long> {

    boolean existsByUserIdAndProjectId(Long userId, Long projectId);

    Optional<ProjectMembership> findByUserIdAndProjectId(Long userId, Long projectId);

    List<ProjectMembership> findByUserId(Long userId);

    List<ProjectMembership> findByProjectId(Long projectId);

    @Query("SELECT pm.project.id FROM ProjectMembership pm WHERE pm.user.id = :userId")
    List<Long> findProjectIdsByUserId(@Param("userId") Long userId);

    void deleteByProjectId(Long projectId);
}
