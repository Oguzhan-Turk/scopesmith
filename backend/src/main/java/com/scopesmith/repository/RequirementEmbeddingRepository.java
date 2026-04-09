package com.scopesmith.repository;

import com.scopesmith.entity.RequirementEmbedding;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface RequirementEmbeddingRepository extends JpaRepository<RequirementEmbedding, Long> {
    Optional<RequirementEmbedding> findByRequirementId(Long requirementId);
}
