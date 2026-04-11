package com.scopesmith.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.scopesmith.entity.PartialRefreshJob;
import com.scopesmith.entity.PartialRefreshJobStatus;
import com.scopesmith.entity.Project;
import com.scopesmith.repository.PartialRefreshJobRepository;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PartialRefreshStatusServiceTest {

    @Mock
    private PartialRefreshJobRepository repository;

    @Test
    void shouldStartNewJobWhenNoRunningJobExists() {
        PartialRefreshStatusService service = new PartialRefreshStatusService(repository, new ObjectMapper());
        Project project = Project.builder().id(10L).build();
        when(repository.existsByProjectIdAndStatus(10L, PartialRefreshJobStatus.RUNNING)).thenReturn(false);
        when(repository.save(any(PartialRefreshJob.class))).thenAnswer(invocation -> {
            PartialRefreshJob job = invocation.getArgument(0);
            job.setId(100L);
            return job;
        });

        PartialRefreshJob job = service.tryStart(project, "PARTIAL_REFRESH", 3);

        assertTrue(job != null && job.getId() == 100L);
        assertEquals(PartialRefreshJobStatus.RUNNING, job.getStatus());
    }

    @Test
    void shouldRenderLatestJobAsResponse() {
        PartialRefreshStatusService service = new PartialRefreshStatusService(repository, new ObjectMapper());
        PartialRefreshJob latest = PartialRefreshJob.builder()
                .id(55L)
                .status(PartialRefreshJobStatus.DONE)
                .recommendation("PARTIAL_REFRESH")
                .totalAnalyses(4)
                .processedAnalyses(4)
                .refreshedCount(2)
                .refreshedRequirementIds("[101,102]")
                .build();
        when(repository.findTopByProjectIdOrderByCreatedAtDesc(7L)).thenReturn(Optional.of(latest));

        var response = service.toResponse(7L);

        assertEquals("DONE", response.getStatus());
        assertEquals(55L, response.getJobId());
        assertEquals(List.of(101L, 102L), response.getRefreshedRequirementIds());
    }

    @Test
    void shouldReturnHistoryWithLimit() {
        PartialRefreshStatusService service = new PartialRefreshStatusService(repository, new ObjectMapper());
        PartialRefreshJob job1 = PartialRefreshJob.builder().id(11L).status(PartialRefreshJobStatus.DONE).refreshedRequirementIds("[]").build();
        PartialRefreshJob job2 = PartialRefreshJob.builder().id(10L).status(PartialRefreshJobStatus.FAILED).refreshedRequirementIds("[]").build();
        when(repository.findByProjectId(eq(9L), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(job1, job2)));

        var history = service.toHistory(9L, 0, 5);

        assertEquals(2, history.getItems().size());
        assertEquals(11L, history.getItems().getFirst().getJobId());
        assertEquals("FAILED", history.getItems().get(1).getStatus());
    }

    @Test
    void shouldCreateDoneJobForAudit() {
        PartialRefreshStatusService service = new PartialRefreshStatusService(repository, new ObjectMapper());
        Project project = Project.builder().id(77L).build();
        when(repository.save(any(PartialRefreshJob.class))).thenAnswer(invocation -> {
            PartialRefreshJob job = invocation.getArgument(0);
            job.setId(701L);
            return job;
        });

        PartialRefreshJob job = service.createDoneJob(project, "NO_ACTION", 0, 0, List.of());

        assertEquals(701L, job.getId());
        assertEquals(PartialRefreshJobStatus.DONE, job.getStatus());
    }
}
