package com.scopesmith.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "requirements")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Requirement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    /**
     * Raw requirement text as received — email, meeting note, Slack message, etc.
     * This is the unstructured input that ScopeSmith will analyze.
     */
    @Column(nullable = false, columnDefinition = "TEXT")
    private String rawText;

    /**
     * Version number, incremented when the requirement changes.
     * Enables change impact analysis (Feature C).
     */
    @Builder.Default
    private Integer version = 1;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private RequirementType type = RequirementType.FEATURE;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private RequirementStatus status = RequirementStatus.DRAFT;

    @Builder.Default
    @OneToMany(mappedBy = "requirement", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Analysis> analyses = new ArrayList<>();

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
