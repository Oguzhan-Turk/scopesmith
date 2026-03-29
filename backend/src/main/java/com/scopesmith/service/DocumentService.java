package com.scopesmith.service;

import com.scopesmith.dto.DocumentRequest;
import com.scopesmith.dto.DocumentResponse;
import com.scopesmith.entity.Document;
import com.scopesmith.entity.DocumentType;
import com.scopesmith.entity.Project;
import com.scopesmith.repository.DocumentRepository;
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
    private final ProjectService projectService;

    @Transactional
    public DocumentResponse addDocument(Long projectId, DocumentRequest request) {
        Project project = projectService.getProjectOrThrow(projectId);

        Document document = Document.builder()
                .project(project)
                .filename(request.getFilename())
                .content(request.getContent())
                .docType(parseDocType(request.getDocType()))
                .build();

        log.info("Adding document '{}' to project #{}", request.getFilename(), projectId);
        return DocumentResponse.from(documentRepository.save(document));
    }

    @Transactional(readOnly = true)
    public List<DocumentResponse> findByProject(Long projectId) {
        projectService.getProjectOrThrow(projectId);
        return documentRepository.findByProjectId(projectId).stream()
                .map(DocumentResponse::from)
                .toList();
    }

    @Transactional
    public void delete(Long documentId) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new EntityNotFoundException("Document not found with id: " + documentId));
        documentRepository.delete(document);
    }

    /**
     * Get all document contents for a project — used as AI context during analysis.
     * Returns concatenated text of all documents.
     */
    @Transactional(readOnly = true)
    public String getProjectDocumentContext(Long projectId) {
        List<Document> documents = documentRepository.findByProjectId(projectId);
        if (documents.isEmpty()) {
            return null;
        }

        StringBuilder context = new StringBuilder();
        for (Document doc : documents) {
            context.append("### ").append(doc.getFilename())
                    .append(" (").append(doc.getDocType().name()).append(")\n");
            context.append(doc.getContent());
            context.append("\n\n");
        }
        return context.toString();
    }

    private DocumentType parseDocType(String docType) {
        if (docType == null) return DocumentType.OTHER;
        try {
            return DocumentType.valueOf(docType.toUpperCase());
        } catch (Exception e) {
            return DocumentType.OTHER;
        }
    }
}
