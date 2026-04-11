package com.scopesmith.service;

import com.scopesmith.entity.Organization;
import com.scopesmith.entity.Project;
import com.scopesmith.entity.RequirementType;
import com.scopesmith.repository.AnalysisRepository;
import com.scopesmith.repository.QuestionRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class InsightServiceTest {

    @Mock private AnalysisRepository analysisRepository;
    @Mock private QuestionRepository questionRepository;
    @Mock private EmbeddingService embeddingService;

    @InjectMocks
    private InsightService insightService;

    @Test
    void buildInsightsSection_shouldNotQueryCrossProjectWhenDisabled() {
        ReflectionTestUtils.setField(insightService, "crossProjectInsightsEnabled", false);

        Project project = Project.builder()
                .id(10L)
                .organization(Organization.builder().id(5L).build())
                .build();

        when(analysisRepository.countByRiskLevelForProject(anyLong())).thenReturn(List.of());
        when(analysisRepository.findByProjectId(anyLong())).thenReturn(List.of());
        when(questionRepository.findAnsweredByProjectId(anyLong())).thenReturn(List.of());
        String insights = insightService.buildInsightsSection(project, RequirementType.FEATURE);

        assertNull(insights);
        verify(analysisRepository, never())
                .findByOtherProjectsInOrganizationAndType(anyLong(), anyLong(), any());
    }
}
