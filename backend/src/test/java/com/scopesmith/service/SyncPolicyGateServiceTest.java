package com.scopesmith.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.scopesmith.dto.SyncPolicyCheckResponse;
import com.scopesmith.entity.Analysis;
import com.scopesmith.entity.Project;
import com.scopesmith.entity.ProjectServiceNode;
import com.scopesmith.entity.Requirement;
import com.scopesmith.entity.ServiceType;
import com.scopesmith.entity.Task;
import com.scopesmith.repository.AnalysisRepository;
import com.scopesmith.repository.TaskRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SyncPolicyGateServiceTest {

    @Mock
    private AnalysisRepository analysisRepository;

    @Mock
    private TaskRepository taskRepository;

    @Mock
    private ObjectMapper objectMapper;

    @InjectMocks
    private SyncPolicyGateService syncPolicyGateService;

    @Test
    void shouldFailWhenTaskHasMissingQualityFields() {
        Long analysisId = 10L;
        Analysis analysis = Analysis.builder().id(analysisId).requirement(Requirement.builder().id(2L).build()).poSummary("ok").build();
        Task task = Task.builder()
                .id(1L)
                .analysis(analysis)
                .title("Auth endpoint")
                .spFinal(null)
                .acceptanceCriteria(" ")
                .build();

        when(analysisRepository.findByIdWithRequirement(analysisId)).thenReturn(Optional.of(analysis));
        when(taskRepository.findByAnalysisId(analysisId)).thenReturn(List.of(task));

        SyncPolicyCheckResponse response = syncPolicyGateService.evaluate(analysisId, null);

        assertFalse(response.isPassed());
        assertEquals(2, response.getErrorCount());
        assertEquals(0, response.getEligibleTasks());
    }

    @Test
    void shouldPassWithWarningWhenStakeholderSummaryMissing() {
        Long analysisId = 11L;
        Analysis analysis = Analysis.builder().id(analysisId).requirement(Requirement.builder().id(3L).build()).poSummary(null).build();
        Task task = Task.builder()
                .id(9L)
                .analysis(analysis)
                .title("Create migration")
                .spFinal(3)
                .acceptanceCriteria("- migration works")
                .build();

        when(analysisRepository.findByIdWithRequirement(analysisId)).thenReturn(Optional.of(analysis));
        when(taskRepository.findByAnalysisId(analysisId)).thenReturn(List.of(task));

        SyncPolicyCheckResponse response = syncPolicyGateService.evaluate(analysisId, List.of(9L));

        assertTrue(response.isPassed());
        assertEquals(0, response.getErrorCount());
        assertEquals(1, response.getWarningCount());
        assertEquals(1, response.getEligibleTasks());
    }

    @Test
    void shouldFailProviderCheckWhenServiceRouteMissing() throws Exception {
        Long analysisId = 12L;
        Project project = Project.builder().id(99L).integrationConfig("{\"serviceRouting\":{}}").build();
        Requirement requirement = Requirement.builder().id(4L).project(project).build();
        Analysis analysis = Analysis.builder().id(analysisId).requirement(requirement).poSummary("ok").build();
        ProjectServiceNode service = ProjectServiceNode.builder().id(1L).project(project).name("billing-api").serviceType(ServiceType.BACKEND).build();
        Task task = Task.builder()
                .id(10L)
                .analysis(analysis)
                .service(service)
                .title("Billing endpoint")
                .spFinal(5)
                .acceptanceCriteria("- endpoint works")
                .build();

        when(analysisRepository.findByIdWithRequirement(analysisId)).thenReturn(Optional.of(analysis));
        when(taskRepository.findByAnalysisId(analysisId)).thenReturn(List.of(task));
        when(objectMapper.readValue(project.getIntegrationConfig(), com.scopesmith.dto.IntegrationConfigDTO.class))
                .thenReturn(new com.scopesmith.dto.IntegrationConfigDTO());

        SyncPolicyCheckResponse response = syncPolicyGateService.evaluateForProvider(
                analysisId, null, SyncPolicyGateService.SyncProvider.GITHUB, null);

        assertFalse(response.isPassed());
        assertTrue(response.getViolations().stream().anyMatch(v -> "MISSING_GITHUB_ROUTE".equals(v.getCode())));
    }
}
