package com.scopesmith.service;

import com.scopesmith.config.PromptLoader;
import com.scopesmith.dto.DocumentRequest;
import com.scopesmith.dto.DocumentResponse;
import com.scopesmith.entity.*;
import com.scopesmith.repository.DocumentRepository;
import com.scopesmith.repository.RequirementRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class DocumentService {

    private final DocumentRepository documentRepository;
    private final RequirementRepository requirementRepository;
    private final ProjectService projectService;
    private final AiService aiService;
    private final PromptLoader promptLoader;

    /** Maximum document content size: 10KB */
    private static final int MAX_CONTENT_LENGTH = 10_240;

    /** Maximum total document context for AI prompts: 30KB */
    private static final int MAX_TOTAL_CONTEXT = 30_720;

    // ── Project-level documents ──

    @Transactional
    public DocumentResponse addDocument(Long projectId, DocumentRequest request) {
        Project project = projectService.getProjectOrThrow(projectId);
        validateContentSize(request.getContent());

        Document document = Document.builder()
                .project(project)
                .filename(request.getFilename())
                .content(request.getContent())
                .docType(parseDocType(request.getDocType()))
                .build();

        Document saved = documentRepository.save(document);
        log.info("Adding document '{}' to project #{}", request.getFilename(), projectId);

        // Generate summary using LIGHT tier (async-friendly, but sync for now)
        generateSummary(saved, projectId);

        return DocumentResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public List<DocumentResponse> findByProject(Long projectId) {
        projectService.getProjectOrThrow(projectId);
        return documentRepository.findByProjectIdAndRequirementIsNull(projectId).stream()
                .map(DocumentResponse::from)
                .toList();
    }

    // ── Requirement-level documents ──

    @Transactional
    public DocumentResponse addRequirementDocument(Long requirementId, DocumentRequest request) {
        Requirement requirement = requirementRepository.findById(requirementId)
                .orElseThrow(() -> new EntityNotFoundException("Requirement not found: " + requirementId));
        validateContentSize(request.getContent());

        Document document = Document.builder()
                .project(requirement.getProject())
                .requirement(requirement)
                .filename(request.getFilename())
                .content(request.getContent())
                .docType(parseDocType(request.getDocType()))
                .build();

        Document saved = documentRepository.save(document);
        log.info("Adding document '{}' to requirement #{}", request.getFilename(), requirementId);

        generateSummary(saved, requirement.getProject().getId());

        return DocumentResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public List<DocumentResponse> findByRequirement(Long requirementId) {
        return documentRepository.findByRequirementId(requirementId).stream()
                .map(DocumentResponse::from)
                .toList();
    }

    // ── Delete ──

    @Transactional
    public void delete(Long documentId) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new EntityNotFoundException("Document not found with id: " + documentId));
        documentRepository.delete(document);
    }

    // ── AI Context builders ──

    /**
     * Get project-level document context for AI analysis.
     * Only includes documents not attached to a specific requirement.
     * Uses summaries when total content exceeds budget.
     */
    @Transactional(readOnly = true)
    public String getProjectDocumentContext(Long projectId) {
        List<Document> documents = documentRepository.findByProjectIdAndRequirementIsNull(projectId);
        return buildDocumentContext(documents);
    }

    /**
     * Get requirement-specific document context for AI analysis.
     */
    @Transactional(readOnly = true)
    public String getRequirementDocumentContext(Long requirementId) {
        List<Document> documents = documentRepository.findByRequirementId(requirementId);
        return buildDocumentContext(documents);
    }

    // ── Internal helpers ──

    private String buildDocumentContext(List<Document> documents) {
        if (documents.isEmpty()) return null;

        // Calculate total content size
        int totalSize = documents.stream().mapToInt(d -> d.getContent().length()).sum();
        boolean useSummaries = totalSize > MAX_TOTAL_CONTEXT;

        StringBuilder context = new StringBuilder();
        for (Document doc : documents) {
            context.append("### ").append(doc.getFilename())
                    .append(" (").append(doc.getDocType().name()).append(")\n");

            if (useSummaries && doc.getSummary() != null) {
                context.append("[Özet] ").append(doc.getSummary());
            } else {
                context.append(doc.getContent());
            }
            context.append("\n\n");
        }
        return context.toString();
    }

    private void generateSummary(Document document, Long projectId) {
        try {
            String summary = aiService.chat(
                    promptLoader.load("document-summary"),
                    document.getContent(),
                    OperationType.DOCUMENT_SUMMARY,
                    projectId,
                    ModelTier.LIGHT
            );
            document.setSummary(summary);
            documentRepository.save(document);
            log.info("Document summary generated for '{}' ({} chars → {} chars)",
                    document.getFilename(), document.getContent().length(),
                    summary != null ? summary.length() : 0);
        } catch (Exception e) {
            log.warn("Failed to generate document summary for '{}': {}",
                    document.getFilename(), e.getMessage());
            // Non-fatal — document is saved without summary
        }
    }

    private void validateContentSize(String content) {
        if (content != null && content.length() > MAX_CONTENT_LENGTH) {
            throw new IllegalArgumentException(
                    "Belge içeriği çok büyük (%d karakter). Maksimum %d karakter destekleniyor."
                            .formatted(content.length(), MAX_CONTENT_LENGTH));
        }
    }

    private DocumentType parseDocType(String docType) {
        if (docType == null) return DocumentType.OTHER;
        try {
            return DocumentType.valueOf(docType.toUpperCase(java.util.Locale.ENGLISH));
        } catch (Exception e) {
            return DocumentType.OTHER;
        }
    }
}
