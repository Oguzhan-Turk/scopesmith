package com.scopesmith.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;

@Entity
@Table(name = "project_services")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProjectServiceNode {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "service_type", nullable = false)
    @Builder.Default
    private ServiceType serviceType = ServiceType.OTHER;

    @Column(name = "repo_url")
    private String repoUrl;

    @Column(name = "local_path")
    private String localPath;

    @Column(name = "default_branch")
    private String defaultBranch;

    @Column(name = "owner_team")
    private String ownerTeam;

    @Builder.Default
    private Boolean active = true;

    @Column(name = "tech_context", columnDefinition = "TEXT")
    private String techContext;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "structured_context", columnDefinition = "jsonb")
    private String structuredContext;

    @Builder.Default
    @Column(name = "context_version", nullable = false)
    private Integer contextVersion = 0;

    @Column(name = "last_scanned_at")
    private LocalDateTime lastScannedAt;

    @Column(name = "last_scanned_commit_hash")
    private String lastScannedCommitHash;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
