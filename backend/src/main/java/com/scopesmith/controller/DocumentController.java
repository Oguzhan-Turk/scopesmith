package com.scopesmith.controller;

import com.scopesmith.dto.DocumentRequest;
import com.scopesmith.dto.DocumentResponse;
import com.scopesmith.service.DocumentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class DocumentController {

    private final DocumentService documentService;

    @PostMapping("/projects/{projectId}/documents")
    @ResponseStatus(HttpStatus.CREATED)
    public DocumentResponse addDocument(
            @PathVariable Long projectId,
            @Valid @RequestBody DocumentRequest request) {
        return documentService.addDocument(projectId, request);
    }

    @GetMapping("/projects/{projectId}/documents")
    public List<DocumentResponse> findByProject(@PathVariable Long projectId) {
        return documentService.findByProject(projectId);
    }

    @DeleteMapping("/documents/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        documentService.delete(id);
    }
}
