package com.scopesmith.service;

import com.scopesmith.repository.AnalysisRepository;
import com.scopesmith.repository.DocumentRepository;
import com.scopesmith.repository.QuestionRepository;
import com.scopesmith.repository.RequirementRepository;
import com.scopesmith.repository.TaskRepository;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ResourceAccessServiceTest {

    @Mock
    private ProjectAccessService projectAccessService;
    @Mock
    private RequirementRepository requirementRepository;
    @Mock
    private AnalysisRepository analysisRepository;
    @Mock
    private TaskRepository taskRepository;
    @Mock
    private DocumentRepository documentRepository;
    @Mock
    private QuestionRepository questionRepository;

    @InjectMocks
    private ResourceAccessService resourceAccessService;

    @Test
    void shouldThrowForbiddenWhenProjectAccessDenied() {
        when(projectAccessService.canAccess(10L)).thenReturn(false);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> resourceAccessService.assertProjectAccess(10L));

        assertEquals(403, ex.getStatusCode().value());
    }

    @Test
    void shouldAllowAnalysisAccessWhenMembershipExists() {
        when(analysisRepository.findProjectIdByAnalysisId(15L)).thenReturn(Optional.of(3L));
        when(projectAccessService.canAccess(3L)).thenReturn(true);

        assertDoesNotThrow(() -> resourceAccessService.assertAnalysisAccess(15L));
    }

    @Test
    void shouldThrowNotFoundWhenTaskIsMissing() {
        when(taskRepository.findProjectIdByTaskId(99L)).thenReturn(Optional.empty());

        assertThrows(EntityNotFoundException.class, () -> resourceAccessService.assertTaskEdit(99L));
    }
}
