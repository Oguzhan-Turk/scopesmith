package com.scopesmith.service;

import com.scopesmith.config.PromptLoader;
import com.scopesmith.dto.TaskBreakdownResult;
import com.scopesmith.dto.TaskRefineResponse;
import com.scopesmith.dto.enums.TaskCategory;
import com.scopesmith.entity.*;
import com.scopesmith.repository.AnalysisRepository;
import com.scopesmith.repository.TaskRepository;
import com.scopesmith.service.validation.AiResultValidationService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TaskBreakdownServiceTest {

    @Mock private AiService aiService;
    @Mock private AnalysisRepository analysisRepository;
    @Mock private TaskRepository taskRepository;
    @Mock private DocumentService documentService;
    @Mock private CodeIntelligenceService codeIntelligenceService;
    @Mock private JiraService jiraService;
    @Mock private GitHubService gitHubService;
    @Mock private TaskSyncRefService taskSyncRefService;
    @Mock private PromptLoader promptLoader;
    @Mock private AiResultValidationService validationService;

    @InjectMocks
    private TaskBreakdownService taskBreakdownService;

    @Test
    void replaceTasksWithRefined_shouldPreserveMatchedSyncRefsAndCloseOrphans() {
        Long analysisId = 55L;

        Project project = Project.builder().id(7L).integrationConfig("acme/demo-repo").build();
        Requirement requirement = Requirement.builder().id(8L).project(project).build();
        Analysis analysis = Analysis.builder().id(analysisId).requirement(requirement).tasks(new ArrayList<>()).build();

        Task matchedOld = Task.builder()
                .id(100L)
                .analysis(analysis)
                .title("Eski API Task")
                .priority(TaskPriority.MEDIUM)
                .spFinal(5)
                .jiraKey("SCOPE-77")
                .syncRefs(new ArrayList<>())
                .build();
        matchedOld.getSyncRefs().add(TaskSyncRef.builder()
                .provider(SyncProviderType.JIRA)
                .externalRef("SCOPE-77")
                .target("SCOPE")
                .syncState("SYNCED")
                .build());

        Task orphanOld = Task.builder()
                .id(200L)
                .analysis(analysis)
                .title("Eski UI Task")
                .priority(TaskPriority.MEDIUM)
                .syncRefs(new ArrayList<>())
                .build();
        orphanOld.getSyncRefs().add(TaskSyncRef.builder()
                .provider(SyncProviderType.GITHUB)
                .externalRef("#42")
                .target("acme/demo-repo")
                .syncState("SYNCED")
                .build());

        analysis.getTasks().add(matchedOld);
        analysis.getTasks().add(orphanOld);

        when(analysisRepository.findById(analysisId)).thenReturn(Optional.of(analysis));
        when(taskRepository.save(any(Task.class))).thenAnswer(invocation -> {
            Task t = invocation.getArgument(0);
            if (t.getId() == null) t.setId(999L);
            return t;
        });

        TaskBreakdownResult.TaskItem refinedItem = new TaskBreakdownResult.TaskItem();
        refinedItem.setTitle("Yeni API Task");
        refinedItem.setDescription("Refined");
        refinedItem.setAcceptanceCriteria("AC");
        refinedItem.setSpSuggestion(5);
        refinedItem.setSpRationale("Reason");
        refinedItem.setPriority(TaskPriority.HIGH);
        refinedItem.setCategory(TaskCategory.BACKEND);
        refinedItem.setPreviousTaskId(100L);

        TaskBreakdownResult result = new TaskBreakdownResult();
        result.setTasks(List.of(refinedItem));

        TaskRefineResponse response = taskBreakdownService.replaceTasksWithRefined(analysisId, result);

        assertEquals(List.of("SCOPE-77"), response.getPreservedIssues());
        assertEquals(List.of("#42"), response.getOrphanedIssues());
        assertEquals(1, response.getTasks().size());
        assertEquals("SCOPE-77", response.getTasks().getFirst().getJiraKey());
        // spFinal should NOT be preserved on refine — scope changed, user re-estimates.
        assertNull(response.getTasks().getFirst().getSpFinal());

        verify(taskSyncRefService, times(1))
                .upsert(any(Task.class), eq(SyncProviderType.JIRA), eq("SCOPE"), eq("SCOPE-77"));
        verify(gitHubService, times(1)).closeIssue("acme/demo-repo", "#42");
        verify(jiraService, never()).closeIssue(anyString());
    }

    @Test
    void readRefineData_shouldPreferSyncRefsOverLegacyJiraKeyInSyncLabel() {
        Long analysisId = 88L;
        Project project = Project.builder().id(11L).build();
        Requirement requirement = Requirement.builder().id(12L).project(project).build();
        Analysis analysis = Analysis.builder()
                .id(analysisId)
                .requirement(requirement)
                .structuredSummary("Summary")
                .tasks(new ArrayList<>())
                .build();

        Task task = Task.builder()
                .id(300L)
                .analysis(analysis)
                .title("Task A")
                .description("Desc")
                .priority(TaskPriority.MEDIUM)
                .spSuggestion(3)
                .jiraKey("LEGACY-1")
                .syncRefs(new ArrayList<>())
                .build();
        task.getSyncRefs().add(TaskSyncRef.builder()
                .provider(SyncProviderType.GITHUB)
                .externalRef("#123")
                .syncState("SYNCED")
                .build());
        analysis.getTasks().add(task);

        when(analysisRepository.findById(analysisId)).thenReturn(Optional.of(analysis));

        String message = taskBreakdownService.readRefineData(analysisId, "split etme");

        assertTrue(message.contains("SYNCED:GITHUB:#123"));
        verify(analysisRepository, times(1)).findById(analysisId);
    }
}
