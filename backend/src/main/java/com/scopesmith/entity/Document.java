package com.scopesmith.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "documents")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Document {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    /**
     * Optional link to a specific requirement.
     * null = project-level document, non-null = requirement-specific document.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "requirement_id")
    private Requirement requirement;

    @Column(nullable = false)
    private String filename;

    /**
     * Document content stored as text.
     * For PDFs, the extracted text is stored here.
     * Max 10KB enforced at service level.
     */
    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    /**
     * AI-generated summary of the document content.
     * Generated using LIGHT tier model on upload.
     */
    @Column(columnDefinition = "TEXT")
    private String summary;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private DocumentType docType = DocumentType.OTHER;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;
}
