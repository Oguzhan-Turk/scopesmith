package com.scopesmith.service;

import com.scopesmith.repository.AnalysisRepository;
import com.scopesmith.repository.DocumentRepository;
import com.scopesmith.repository.QuestionRepository;
import com.scopesmith.repository.RequirementRepository;
import com.scopesmith.repository.TaskRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class ResourceAccessService {

    private final ProjectAccessService projectAccessService;
    private final RequirementRepository requirementRepository;
    private final AnalysisRepository analysisRepository;
    private final TaskRepository taskRepository;
    private final DocumentRepository documentRepository;
    private final QuestionRepository questionRepository;

    public void assertProjectAccess(Long projectId) {
        if (!projectAccessService.canAccess(projectId)) {
            throw forbidden(projectId);
        }
    }

    public void assertProjectEdit(Long projectId) {
        if (!projectAccessService.canEdit(projectId)) {
            throw forbidden(projectId);
        }
    }

    public void assertRequirementAccess(Long requirementId) {
        assertProjectAccess(resolveProjectIdByRequirement(requirementId));
    }

    public void assertRequirementEdit(Long requirementId) {
        assertProjectEdit(resolveProjectIdByRequirement(requirementId));
    }

    public void assertAnalysisAccess(Long analysisId) {
        assertProjectAccess(resolveProjectIdByAnalysis(analysisId));
    }

    public void assertAnalysisEdit(Long analysisId) {
        assertProjectEdit(resolveProjectIdByAnalysis(analysisId));
    }

    public void assertTaskAccess(Long taskId) {
        assertProjectAccess(resolveProjectIdByTask(taskId));
    }

    public void assertTaskEdit(Long taskId) {
        assertProjectEdit(resolveProjectIdByTask(taskId));
    }

    public void assertDocumentAccess(Long documentId) {
        assertProjectAccess(resolveProjectIdByDocument(documentId));
    }

    public void assertDocumentEdit(Long documentId) {
        assertProjectEdit(resolveProjectIdByDocument(documentId));
    }

    public void assertQuestionEdit(Long questionId) {
        assertProjectEdit(resolveProjectIdByQuestion(questionId));
    }

    private Long resolveProjectIdByRequirement(Long requirementId) {
        return requirementRepository.findProjectIdByRequirementId(requirementId)
                .orElseThrow(() -> new EntityNotFoundException("Requirement not found with id: " + requirementId));
    }

    private Long resolveProjectIdByAnalysis(Long analysisId) {
        return analysisRepository.findProjectIdByAnalysisId(analysisId)
                .orElseThrow(() -> new EntityNotFoundException("Analysis not found with id: " + analysisId));
    }

    private Long resolveProjectIdByTask(Long taskId) {
        return taskRepository.findProjectIdByTaskId(taskId)
                .orElseThrow(() -> new EntityNotFoundException("Task not found with id: " + taskId));
    }

    private Long resolveProjectIdByDocument(Long documentId) {
        return documentRepository.findProjectIdByDocumentId(documentId)
                .orElseThrow(() -> new EntityNotFoundException("Document not found with id: " + documentId));
    }

    private Long resolveProjectIdByQuestion(Long questionId) {
        return questionRepository.findProjectIdByQuestionId(questionId)
                .orElseThrow(() -> new EntityNotFoundException("Question not found with id: " + questionId));
    }

    private ResponseStatusException forbidden(Long projectId) {
        return new ResponseStatusException(
                HttpStatus.FORBIDDEN,
                "Bu projeye erişim yetkiniz yok (projectId=" + projectId + ")"
        );
    }
}
