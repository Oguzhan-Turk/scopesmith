package com.scopesmith.repository;

import com.scopesmith.entity.PartialRefreshJob;
import com.scopesmith.entity.PartialRefreshJobStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PartialRefreshJobRepository extends JpaRepository<PartialRefreshJob, Long> {
    Optional<PartialRefreshJob> findTopByProjectIdOrderByCreatedAtDesc(Long projectId);
    Page<PartialRefreshJob> findByProjectId(Long projectId, Pageable pageable);
    boolean existsByProjectIdAndStatus(Long projectId, PartialRefreshJobStatus status);
}
