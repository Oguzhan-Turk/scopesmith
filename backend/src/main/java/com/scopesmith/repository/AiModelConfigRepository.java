package com.scopesmith.repository;

import com.scopesmith.entity.AiModelConfig;
import com.scopesmith.entity.ModelTier;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AiModelConfigRepository extends JpaRepository<AiModelConfig, Long> {
    Optional<AiModelConfig> findByTier(ModelTier tier);
}
