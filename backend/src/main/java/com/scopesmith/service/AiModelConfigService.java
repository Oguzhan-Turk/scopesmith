package com.scopesmith.service;

import com.scopesmith.dto.AiModelConfigDTO;
import com.scopesmith.entity.AiModelConfig;
import com.scopesmith.entity.ModelTier;
import com.scopesmith.repository.AiModelConfigRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AiModelConfigService {

    private final AiModelConfigRepository repository;

    @Transactional(readOnly = true)
    public List<AiModelConfigDTO> findAll() {
        return repository.findAll().stream()
                .sorted((a, b) -> a.getTier().name().compareTo(b.getTier().name()))
                .map(AiModelConfigDTO::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public AiModelConfig findByTier(ModelTier tier) {
        return repository.findByTier(tier).orElse(null);
    }

    @Transactional
    public AiModelConfigDTO upsert(ModelTier tier, AiModelConfigDTO request) {
        AiModelConfig model = repository.findByTier(tier)
                .orElse(AiModelConfig.builder().tier(tier).build());

        if (request.getProvider() == null || request.getProvider().isBlank()) {
            throw new IllegalArgumentException("provider cannot be empty");
        }
        if (request.getModelName() == null || request.getModelName().isBlank()) {
            throw new IllegalArgumentException("modelName cannot be empty");
        }

        model.setProvider(request.getProvider().trim().toUpperCase(java.util.Locale.ENGLISH));
        model.setModelName(request.getModelName().trim());
        model.setActive(request.getActive() == null || request.getActive());
        model.setInputPerMillion(normalizeMoney(request.getInputPerMillion()));
        model.setOutputPerMillion(normalizeMoney(request.getOutputPerMillion()));
        model.setLatencyClass(normalizeLabel(request.getLatencyClass()));
        model.setQualityClass(normalizeLabel(request.getQualityClass()));

        return AiModelConfigDTO.from(repository.save(model));
    }

    private BigDecimal normalizeMoney(BigDecimal value) {
        if (value == null) return null;
        if (value.signum() < 0) throw new IllegalArgumentException("pricing cannot be negative");
        return value.setScale(2, java.math.RoundingMode.HALF_UP);
    }

    private String normalizeLabel(String value) {
        if (value == null || value.isBlank()) return null;
        return value.trim().toUpperCase(java.util.Locale.ENGLISH);
    }
}
