package com.scopesmith.dto;

import com.scopesmith.entity.AiModelConfig;
import com.scopesmith.entity.ModelTier;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiModelConfigDTO {
    private Long id;
    private ModelTier tier;
    private String provider;
    private String modelName;
    private Boolean active;
    private BigDecimal inputPerMillion;
    private BigDecimal outputPerMillion;
    private String latencyClass;
    private String qualityClass;
    private LocalDateTime updatedAt;

    public static AiModelConfigDTO from(AiModelConfig model) {
        return AiModelConfigDTO.builder()
                .id(model.getId())
                .tier(model.getTier())
                .provider(model.getProvider())
                .modelName(model.getModelName())
                .active(model.isActive())
                .inputPerMillion(model.getInputPerMillion())
                .outputPerMillion(model.getOutputPerMillion())
                .latencyClass(model.getLatencyClass())
                .qualityClass(model.getQualityClass())
                .updatedAt(model.getUpdatedAt())
                .build();
    }
}
