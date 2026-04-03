package com.scopesmith.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "tasks")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Task {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "analysis_id", nullable = false)
    private Analysis analysis;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(columnDefinition = "TEXT")
    private String acceptanceCriteria;

    /**
     * AI-suggested story point value.
     * This is a suggestion, not the final decision.
     */
    private Integer spSuggestion;

    /**
     * AI's rationale for the SP suggestion.
     * Includes: affected services, DB changes, integrations, similar past tasks, risk factors.
     */
    @Column(columnDefinition = "TEXT")
    private String spRationale;

    /**
     * Final SP decided by the team.
     * Null until the team makes a decision.
     */
    private Integer spFinal;

    /**
     * Why the team deviated from AI suggestion. Feeds Learning SP calibration.
     */
    private String spDivergenceReason;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private TaskPriority priority = TaskPriority.MEDIUM;

    /**
     * Development discipline category — determines which team works on this task.
     * AI-determined, user-overridable. Stored as String for custom category support.
     * Standard values: BACKEND, FRONTEND, MOBILE, DATABASE, DEVOPS, TESTING
     */
    private String category;

    /**
     * If this task depends on another task being completed first.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dependency_task_id")
    private Task dependency;

    /**
     * Jira issue key after sync (e.g., "SCOPE-123").
     * Null if not yet synced to Jira.
     */
    private String jiraKey;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;
}
