package com.scopesmith.repository;

import com.scopesmith.entity.ServiceDependency;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ServiceDependencyRepository extends JpaRepository<ServiceDependency, Long> {
    List<ServiceDependency> findByProjectIdOrderByIdAsc(Long projectId);
    Optional<ServiceDependency> findByIdAndProjectId(Long id, Long projectId);
    boolean existsByProjectIdAndFromServiceIdAndToServiceId(Long projectId, Long fromServiceId, Long toServiceId);
}
