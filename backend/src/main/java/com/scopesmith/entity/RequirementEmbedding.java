package com.scopesmith.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "requirement_embeddings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RequirementEmbedding {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "requirement_id", nullable = false, unique = true)
    private Long requirementId;

    /**
     * Embedding vector stored as pgvector type.
     * Uses float[] in Java — mapped via custom Hibernate type.
     * 1536 dimensions = text-embedding-3-small (OpenAI).
     */
    @Column(name = "embedding", columnDefinition = "vector(1536)", nullable = false)
    private float[] embedding;

    /**
     * false = initial embed (rawText only).
     * true = rich embed (rawText + summary + modules + risk), overrides initial.
     */
    @Column(name = "is_rich", nullable = false)
    @Builder.Default
    private boolean rich = false;

    @CreationTimestamp
    @Column(name = "embedded_at", updatable = false)
    private LocalDateTime embeddedAt;
}
