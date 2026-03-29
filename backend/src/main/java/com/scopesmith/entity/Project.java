package com.scopesmith.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "projects")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Project {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    /**
     * AI-generated free-text summary of the project's codebase.
     * Kept for backward compatibility and human-readable context.
     */
    @Column(columnDefinition = "TEXT")
    private String techContext;

    /**
     * Structured project context — parsed into queryable fields.
     * Stored as JSONB in PostgreSQL for efficient querying.
     */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private String structuredContext;

    /**
     * Per-project integration settings (Jira, GitHub, etc.) stored as JSONB.
     * Credentials stay in .env (server-level), this stores project-specific config
     * like Jira project key, GitHub repo, default issue type.
     */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private String integrationConfig;

    /**
     * Git repository URL (GitHub, Bitbucket, GitLab).
     * Null if project context is provided via local folder scan.
     */
    private String repoUrl;

    /**
     * Local folder path for projects accessed via filesystem.
     * Null if project context is provided via remote git.
     */
    private String localPath;

    /**
     * When the project's codebase was last scanned for context.
     * Null means never scanned. (ADR-007 Layer 1)
     */
    private LocalDateTime lastScannedAt;

    /**
     * Git commit hash at the time of last scan.
     * Used for staleness detection via git diff. (ADR-007 Layer 2)
     */
    private String lastScannedCommitHash;

    /**
     * Incremented on each context rescan.
     * Enables tracking which analysis used which context version.
     */
    @Builder.Default
    private Integer contextVersion = 0;

    @Builder.Default
    @OneToMany(mappedBy = "project", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Requirement> requirements = new ArrayList<>();

    @Builder.Default
    @OneToMany(mappedBy = "project", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Document> documents = new ArrayList<>();

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
