package com.scopesmith.service;

import com.scopesmith.dto.TraceabilityResponse;
import com.scopesmith.entity.Analysis;
import com.scopesmith.entity.Requirement;
import com.scopesmith.entity.RequirementType;
import com.scopesmith.entity.SyncProviderType;
import com.scopesmith.entity.Task;
import com.scopesmith.entity.TaskSyncRef;
import com.scopesmith.repository.AnalysisRepository;
import com.scopesmith.repository.RequirementRepository;
import com.scopesmith.repository.TaskRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TraceabilityServiceTest {

    @Mock
    private RequirementRepository requirementRepository;

    @Mock
    private AnalysisRepository analysisRepository;

    @Mock
    private TaskRepository taskRepository;

    @InjectMocks
    private TraceabilityService traceabilityService;

    @Test
    void shouldBuildCoverageMetricsFromLatestAnalyses() {
        Long projectId = 7L;
        Requirement requirement = Requirement.builder()
                .id(100L)
                .sequenceNumber(3)
                .type(RequirementType.FEATURE)
                .rawText("As a user, I want to export report")
                .build();
        Analysis analysis = Analysis.builder()
                .id(200L)
                .requirement(requirement)
                .build();
        Task synced = Task.builder().id(1L).analysis(analysis).title("API export").spFinal(5).jiraKey("SCOPE-22").build();
        Task ready = Task.builder().id(2L).analysis(analysis).title("UI action").spFinal(3).jiraKey(null).build();

        when(requirementRepository.findByProjectIdOrderByCreatedAtDesc(projectId)).thenReturn(List.of(requirement));
        when(analysisRepository.findLatestByProjectId(projectId)).thenReturn(List.of(analysis));
        when(taskRepository.findByAnalysisId(analysis.getId())).thenReturn(List.of(synced, ready));

        TraceabilityResponse response = traceabilityService.buildProjectTraceability(projectId);

        assertEquals(1, response.getSummary().getTotalRequirements());
        assertEquals(1, response.getSummary().getAnalyzedRequirements());
        assertEquals(2, response.getSummary().getApprovedTasks());
        assertEquals(1, response.getSummary().getSyncedTasks());
        assertEquals(50.0, response.getSummary().getSyncCoveragePercent());
    }

    @Test
    void shouldPreferSyncRefsAndExposeMultiProviderTargets() {
        Long projectId = 9L;
        Requirement requirement = Requirement.builder()
                .id(101L)
                .sequenceNumber(4)
                .type(RequirementType.FEATURE)
                .rawText("As a user, I want sync visibility")
                .build();
        Analysis analysis = Analysis.builder()
                .id(201L)
                .requirement(requirement)
                .build();

        Task task = Task.builder()
                .id(11L)
                .analysis(analysis)
                .title("Sync task")
                .spFinal(3)
                .jiraKey("LEGACY-12")
                .syncRefs(List.of(
                        TaskSyncRef.builder().provider(SyncProviderType.GITHUB).externalRef("#88").target("acme/repo").syncState("SYNCED").build(),
                        TaskSyncRef.builder().provider(SyncProviderType.JIRA).externalRef("SCOPE-88").target("SCOPE").syncState("SYNCED").build()
                ))
                .build();

        when(requirementRepository.findByProjectIdOrderByCreatedAtDesc(projectId)).thenReturn(List.of(requirement));
        when(analysisRepository.findLatestByProjectId(projectId)).thenReturn(List.of(analysis));
        when(taskRepository.findByAnalysisId(analysis.getId())).thenReturn(List.of(task));

        TraceabilityResponse response = traceabilityService.buildProjectTraceability(projectId);

        TraceabilityResponse.Item item = response.getItems().getFirst();
        TraceabilityResponse.TaskLink link = item.getTasks().getFirst();

        assertEquals("SYNCED", link.getSyncStatus());
        assertEquals("#88", link.getSyncRef()); // first synced ref is preferred over jiraKey
        assertEquals("GITHUB", link.getSyncTarget());
        assertEquals(2, link.getSyncRefs().size());
        assertTrue(item.getSyncTargets().contains("GITHUB"));
        assertTrue(item.getSyncTargets().contains("JIRA"));
    }
}
