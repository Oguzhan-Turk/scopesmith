package com.scopesmith.entity;

import com.scopesmith.dto.enums.RiskLevel;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "analyses")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Analysis {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "requirement_id", nullable = false)
    private Requirement requirement;

    /**
     * AI-generated structured summary of the requirement.
     * Stored as JSON string for flexibility.
     */
    @Column(columnDefinition = "TEXT")
    private String structuredSummary;

    /**
     * Assumptions the AI made during analysis.
     * These should be validated by the user.
     */
    @Column(columnDefinition = "TEXT")
    private String assumptions;

    /**
     * Risk assessment: LOW, MEDIUM, HIGH
     */
    private RiskLevel riskLevel;

    @Column(columnDefinition = "TEXT")
    private String riskReason;

    /**
     * Modules/services in the existing project affected by this requirement.
     */
    @Column(columnDefinition = "TEXT")
    private String affectedModules;

    /**
     * PO-friendly executive summary (Feature D).
     */
    @Column(columnDefinition = "TEXT")
    private String poSummary;

    /**
     * Which version of the requirement this analysis is based on.
     */
    private Integer requirementVersion;

    /**
     * Project context version at the time of analysis.
     * Used to detect stale analyses when context is updated.
     */
    private Integer contextVersion;

    /**
     * How long the AI analysis took, in milliseconds. (ADR-008)
     */
    private Long durationMs;

    /**
     * Which AI model tier was used for this analysis.
     */
    @Enumerated(EnumType.STRING)
    private ModelTier modelTier;

    @Builder.Default
    @OneToMany(mappedBy = "analysis", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Question> questions = new ArrayList<>();

    @Builder.Default
    @OneToMany(mappedBy = "analysis", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Task> tasks = new ArrayList<>();

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;
}
