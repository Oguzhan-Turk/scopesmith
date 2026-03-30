package com.scopesmith.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "usage_records")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UsageRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long projectId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OperationType operationType;

    private Integer inputTokens;
    private Integer outputTokens;
    private Integer totalTokens;

    private String model;

    @Column(precision = 10, scale = 6)
    private BigDecimal estimatedCostUsd;

    private Long durationMs;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;
}
