package com.scopesmith.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "questions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Question {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "analysis_id", nullable = false)
    private Analysis analysis;

    /**
     * The question AI generated — to be asked to PO/stakeholder.
     */
    @Column(nullable = false, columnDefinition = "TEXT")
    private String questionText;

    /**
     * AI-suggested answer based on project context.
     */
    @Column(columnDefinition = "TEXT")
    private String suggestedAnswer;

    /**
     * Question type: OPEN, SINGLE_CHOICE, MULTIPLE_CHOICE
     */
    @Builder.Default
    private String questionType = "OPEN";

    /**
     * Choices for SINGLE/MULTIPLE_CHOICE questions.
     * Stored as JSON array string: ["CSV","Excel","JSON"]
     */
    @Column(columnDefinition = "TEXT")
    private String options;

    /**
     * Answer provided by user/PO.
     * Null means the question is still open.
     */
    @Column(columnDefinition = "TEXT")
    private String answer;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private QuestionStatus status = QuestionStatus.OPEN;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime answeredAt;
}
