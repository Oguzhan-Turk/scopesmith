package com.scopesmith.service;

import com.scopesmith.entity.Analysis;
import com.scopesmith.repository.AnalysisRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ContextFreshnessServiceTest {

    @Mock
    private AnalysisRepository analysisRepository;

    @InjectMocks
    private ContextFreshnessService contextFreshnessService;

    @Test
    void shouldDeriveImpactedModulesFromChangedFiles() {
        List<String> modules = contextFreshnessService.deriveImpactedModules(List.of(
                "backend/src/main/java/com/scopesmith/controller/ProjectController.java",
                "backend/src/main/java/com/scopesmith/service/RequirementAnalysisService.java",
                "frontend/src/pages/ProjectDetail.tsx"
        ));

        assertEquals(List.of("controller", "service", "pages"), modules);
    }

    @Test
    void shouldFilterLatestAnalysesByImpactedModules() {
        Analysis matching = Analysis.builder().id(1L).affectedModules("controller, billing").build();
        Analysis notMatching = Analysis.builder().id(2L).affectedModules("repository, dto").build();
        when(analysisRepository.findLatestByProjectId(7L)).thenReturn(List.of(matching, notMatching));

        List<Analysis> result = contextFreshnessService.findImpactedLatestAnalyses(7L, List.of("controller"), 10);

        assertEquals(1, result.size());
        assertEquals(1L, result.getFirst().getId());
    }
}
