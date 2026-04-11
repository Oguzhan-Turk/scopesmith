package com.scopesmith.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "ai_model_configs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiModelConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, unique = true, length = 20)
    private ModelTier tier;

    @Column(nullable = false, length = 50)
    private String provider;

    @Column(name = "model_name", nullable = false)
    private String modelName;

    @Builder.Default
    @Column(nullable = false)
    private boolean active = true;

    @Column(precision = 10, scale = 2)
    private BigDecimal inputPerMillion;

    @Column(precision = 10, scale = 2)
    private BigDecimal outputPerMillion;

    @Column(length = 20)
    private String latencyClass;

    @Column(length = 20)
    private String qualityClass;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
