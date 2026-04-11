package com.scopesmith.controller;

import com.scopesmith.dto.DocumentRequest;
import com.scopesmith.dto.DocumentResponse;
import com.scopesmith.service.DocumentService;
import com.scopesmith.service.ResourceAccessService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class DocumentController {

    private final DocumentService documentService;
    private final ResourceAccessService resourceAccessService;

    // ── Project-level documents ──

    @PostMapping("/projects/{projectId}/documents")
    @ResponseStatus(HttpStatus.CREATED)
    public DocumentResponse addDocument(
            @PathVariable Long projectId,
            @Valid @RequestBody DocumentRequest request) {
        return documentService.addDocument(projectId, request);
    }

    @PostMapping("/projects/{projectId}/documents/upload")
    @ResponseStatus(HttpStatus.CREATED)
    public DocumentResponse uploadDocument(
            @PathVariable Long projectId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "docType", required = false, defaultValue = "OTHER") String docType) throws IOException {
        String content = new String(file.getBytes(), StandardCharsets.UTF_8);
        DocumentRequest request = new DocumentRequest();
        request.setFilename(file.getOriginalFilename());
        request.setContent(content);
        request.setDocType(docType);
        return documentService.addDocument(projectId, request);
    }

    @GetMapping("/projects/{projectId}/documents")
    public List<DocumentResponse> findByProject(@PathVariable Long projectId) {
        return documentService.findByProject(projectId);
    }

    // ── Requirement-level documents ──

    @PostMapping("/requirements/{requirementId}/documents")
    @ResponseStatus(HttpStatus.CREATED)
    public DocumentResponse addRequirementDocument(
            @PathVariable Long requirementId,
            @Valid @RequestBody DocumentRequest request) {
        resourceAccessService.assertRequirementEdit(requirementId);
        return documentService.addRequirementDocument(requirementId, request);
    }

    @PostMapping("/requirements/{requirementId}/documents/upload")
    @ResponseStatus(HttpStatus.CREATED)
    public DocumentResponse uploadRequirementDocument(
            @PathVariable Long requirementId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "docType", required = false, defaultValue = "OTHER") String docType) throws IOException {
        resourceAccessService.assertRequirementEdit(requirementId);
        String content = new String(file.getBytes(), StandardCharsets.UTF_8);
        DocumentRequest request = new DocumentRequest();
        request.setFilename(file.getOriginalFilename());
        request.setContent(content);
        request.setDocType(docType);
        return documentService.addRequirementDocument(requirementId, request);
    }

    @GetMapping("/requirements/{requirementId}/documents")
    public List<DocumentResponse> findByRequirement(@PathVariable Long requirementId) {
        resourceAccessService.assertRequirementAccess(requirementId);
        return documentService.findByRequirement(requirementId);
    }

    // ── Delete (works for both project and requirement docs) ──

    @DeleteMapping("/documents/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        resourceAccessService.assertDocumentEdit(id);
        documentService.delete(id);
    }
}
