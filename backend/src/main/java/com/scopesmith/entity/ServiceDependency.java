package com.scopesmith.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "service_dependencies")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ServiceDependency {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "from_service_id", nullable = false)
    private ProjectServiceNode fromService;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "to_service_id", nullable = false)
    private ProjectServiceNode toService;

    @Column(name = "dependency_type", nullable = false)
    @Builder.Default
    private String dependencyType = "SYNC";

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;
}
