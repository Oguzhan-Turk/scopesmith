package com.scopesmith.service;

import com.scopesmith.dto.PartialRefreshStatusResponse;
import com.scopesmith.dto.PartialRefreshHistoryResponse;
import com.scopesmith.entity.PartialRefreshJob;
import com.scopesmith.entity.PartialRefreshJobStatus;
import com.scopesmith.entity.Project;
import com.scopesmith.repository.PartialRefreshJobRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PartialRefreshStatusService {

    private static final TypeReference<List<Long>> LONG_LIST_TYPE = new TypeReference<>() {};

    private final PartialRefreshJobRepository jobRepository;
    private final ObjectMapper objectMapper;

    @Transactional
    public PartialRefreshJob tryStart(Project project, String recommendation, int totalAnalyses) {
        boolean runningExists = jobRepository.existsByProjectIdAndStatus(project.getId(), PartialRefreshJobStatus.RUNNING);
        if (runningExists) {
            return null;
        }
        return jobRepository.save(PartialRefreshJob.builder()
                .project(project)
                .status(PartialRefreshJobStatus.RUNNING)
                .recommendation(recommendation)
                .totalAnalyses(totalAnalyses)
                .processedAnalyses(0)
                .refreshedCount(0)
                .refreshedRequirementIds("[]")
                .build());
    }

    @Transactional
    public PartialRefreshJob createDoneJob(Project project, String recommendation, int totalAnalyses,
                                           int refreshedCount, List<Long> refreshedRequirementIds) {
        return jobRepository.save(PartialRefreshJob.builder()
                .project(project)
                .status(PartialRefreshJobStatus.DONE)
                .recommendation(recommendation)
                .totalAnalyses(totalAnalyses)
                .processedAnalyses(totalAnalyses)
                .refreshedCount(refreshedCount)
                .refreshedRequirementIds(toJson(refreshedRequirementIds))
                .startedAt(java.time.LocalDateTime.now())
                .completedAt(java.time.LocalDateTime.now())
                .build());
    }

    @Transactional
    public void setProgress(Long jobId, int processed, int refreshed, List<Long> refreshedRequirementIds) {
        PartialRefreshJob job = jobRepository.findById(jobId).orElse(null);
        if (job == null || job.getStatus() != PartialRefreshJobStatus.RUNNING) {
            return;
        }
        job.setProcessedAnalyses(processed);
        job.setRefreshedCount(refreshed);
        job.setRefreshedRequirementIds(toJson(refreshedRequirementIds));
        jobRepository.save(job);
    }

    @Transactional
    public void setDone(Long jobId, int processed, int refreshed, List<Long> refreshedRequirementIds) {
        PartialRefreshJob job = jobRepository.findById(jobId).orElse(null);
        if (job == null) return;
        job.setStatus(PartialRefreshJobStatus.DONE);
        job.setProcessedAnalyses(processed);
        job.setRefreshedCount(refreshed);
        job.setRefreshedRequirementIds(toJson(refreshedRequirementIds));
        job.setCompletedAt(java.time.LocalDateTime.now());
        job.setError(null);
        jobRepository.save(job);
    }

    @Transactional
    public void setFailed(Long jobId, String error) {
        PartialRefreshJob job = jobRepository.findById(jobId).orElse(null);
        if (job == null) return;
        job.setStatus(PartialRefreshJobStatus.FAILED);
        job.setError(error);
        job.setCompletedAt(java.time.LocalDateTime.now());
        jobRepository.save(job);
    }

    public PartialRefreshStatusResponse toResponse(Long projectId) {
        PartialRefreshJob job = jobRepository.findTopByProjectIdOrderByCreatedAtDesc(projectId).orElse(null);
        if (job == null) {
            return PartialRefreshStatusResponse.builder()
                    .status("IDLE")
                    .totalAnalyses(0)
                    .processedAnalyses(0)
                    .refreshedCount(0)
                    .refreshedRequirementIds(List.of())
                    .build();
        }

        return toDto(job);
    }

    public PartialRefreshHistoryResponse toHistory(Long projectId, int page, int size) {
        int safePage = Math.max(0, page);
        int safeSize = Math.max(1, Math.min(size, 20));
        Page<PartialRefreshJob> result = jobRepository.findByProjectId(
                projectId,
                PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.DESC, "createdAt"))
        );
        return PartialRefreshHistoryResponse.builder()
                .page(result.getNumber())
                .size(result.getSize())
                .totalElements(result.getTotalElements())
                .totalPages(result.getTotalPages())
                .items(result.getContent().stream().map(this::toDto).toList())
                .build();
    }

    private String toJson(List<Long> ids) {
        try {
            return objectMapper.writeValueAsString(ids != null ? ids : List.of());
        } catch (Exception e) {
            return "[]";
        }
    }

    private List<Long> fromJson(String json) {
        if (json == null || json.isBlank()) return List.of();
        try {
            return objectMapper.readValue(json, LONG_LIST_TYPE);
        } catch (Exception e) {
            return List.of();
        }
    }

    private PartialRefreshStatusResponse toDto(PartialRefreshJob job) {
        return PartialRefreshStatusResponse.builder()
                .jobId(job.getId())
                .status(job.getStatus().name())
                .recommendation(job.getRecommendation())
                .totalAnalyses(job.getTotalAnalyses())
                .processedAnalyses(job.getProcessedAnalyses())
                .refreshedCount(job.getRefreshedCount())
                .refreshedRequirementIds(fromJson(job.getRefreshedRequirementIds()))
                .error(job.getError())
                .startedAt(job.getStartedAt())
                .completedAt(job.getCompletedAt())
                .build();
    }
}
