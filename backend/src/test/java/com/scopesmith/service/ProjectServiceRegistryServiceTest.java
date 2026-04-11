package com.scopesmith.service;

import com.scopesmith.dto.ProjectServiceRequest;
import com.scopesmith.dto.ProjectServiceResponse;
import com.scopesmith.dto.ServiceDependencyRequest;
import com.scopesmith.dto.FederatedContextResponse;
import com.scopesmith.dto.ServiceGraphResponse;
import com.scopesmith.entity.Project;
import com.scopesmith.entity.ProjectServiceNode;
import com.scopesmith.entity.ServiceDependency;
import com.scopesmith.entity.ServiceType;
import com.scopesmith.repository.ProjectServiceNodeRepository;
import com.scopesmith.repository.ServiceDependencyRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProjectServiceRegistryServiceTest {

    @Mock
    private ProjectService projectService;

    @Mock
    private ProjectServiceNodeRepository projectServiceNodeRepository;

    @Mock
    private ServiceDependencyRepository serviceDependencyRepository;

    @InjectMocks
    private ProjectServiceRegistryService registryService;

    @Test
    void shouldCreateServiceWithDefaults() {
        Long projectId = 11L;
        Project project = Project.builder().id(projectId).name("ScopeSmith").build();
        ProjectServiceRequest request = new ProjectServiceRequest();
        request.setName("billing-api");
        request.setServiceType(ServiceType.BACKEND);

        when(projectService.getProjectOrThrow(projectId)).thenReturn(project);
        when(projectServiceNodeRepository.existsByProjectIdAndNameIgnoreCase(projectId, "billing-api")).thenReturn(false);
        when(projectServiceNodeRepository.save(org.mockito.ArgumentMatchers.any(ProjectServiceNode.class)))
                .thenAnswer(invocation -> {
                    ProjectServiceNode s = invocation.getArgument(0);
                    s.setId(50L);
                    return s;
                });

        ProjectServiceResponse response = registryService.createService(projectId, request);

        assertEquals(50L, response.getId());
        assertEquals("billing-api", response.getName());
        assertEquals(ServiceType.BACKEND, response.getServiceType());

        ArgumentCaptor<ProjectServiceNode> captor = ArgumentCaptor.forClass(ProjectServiceNode.class);
        verify(projectServiceNodeRepository).save(captor.capture());
        assertEquals(projectId, captor.getValue().getProject().getId());
    }

    @Test
    void shouldRejectDuplicateDependency() {
        Long projectId = 3L;
        Project project = Project.builder().id(projectId).build();
        ProjectServiceNode from = ProjectServiceNode.builder().id(1L).project(project).name("api").build();
        ProjectServiceNode to = ProjectServiceNode.builder().id(2L).project(project).name("web").build();
        ServiceDependencyRequest request = new ServiceDependencyRequest();
        request.setFromServiceId(1L);
        request.setToServiceId(2L);

        when(projectService.getProjectOrThrow(projectId)).thenReturn(project);
        when(projectServiceNodeRepository.findByIdAndProjectId(1L, projectId)).thenReturn(Optional.of(from));
        when(projectServiceNodeRepository.findByIdAndProjectId(2L, projectId)).thenReturn(Optional.of(to));
        when(serviceDependencyRepository.existsByProjectIdAndFromServiceIdAndToServiceId(projectId, 1L, 2L)).thenReturn(true);

        assertThrows(IllegalArgumentException.class, () -> registryService.addDependency(projectId, request));
    }

    @Test
    void shouldBuildGraph() {
        Long projectId = 9L;
        Project project = Project.builder().id(projectId).build();
        ProjectServiceNode api = ProjectServiceNode.builder().id(1L).project(project).name("api").serviceType(ServiceType.BACKEND).build();
        ProjectServiceNode web = ProjectServiceNode.builder().id(2L).project(project).name("web").serviceType(ServiceType.FRONTEND).build();
        ServiceDependency dep = ServiceDependency.builder().id(7L).project(project).fromService(api).toService(web).dependencyType("ASYNC").build();

        when(projectService.getProjectOrThrow(projectId)).thenReturn(project);
        when(projectServiceNodeRepository.findByProjectIdOrderByNameAsc(projectId)).thenReturn(List.of(api, web));
        when(serviceDependencyRepository.findByProjectIdOrderByIdAsc(projectId)).thenReturn(List.of(dep));

        ServiceGraphResponse graph = registryService.getGraph(projectId);

        assertEquals(2, graph.getServices().size());
        assertEquals(1, graph.getDependencies().size());
        assertEquals("api", graph.getDependencies().getFirst().getFromServiceName());
    }

    @Test
    void shouldBuildFederatedContextFromActiveServices() {
        Long projectId = 5L;
        Project project = Project.builder().id(projectId).build();
        ProjectServiceNode api = ProjectServiceNode.builder()
                .id(1L)
                .project(project)
                .name("api")
                .serviceType(ServiceType.BACKEND)
                .active(true)
                .techContext("API context")
                .build();
        ProjectServiceNode passive = ProjectServiceNode.builder()
                .id(2L)
                .project(project)
                .name("legacy")
                .serviceType(ServiceType.BACKEND)
                .active(false)
                .techContext("legacy")
                .build();

        when(projectService.getProjectOrThrow(projectId)).thenReturn(project);
        when(projectServiceNodeRepository.findByProjectIdOrderByNameAsc(projectId)).thenReturn(List.of(api, passive));

        FederatedContextResponse response = registryService.getFederatedContext(projectId);

        assertEquals(1, response.getServiceCount());
        assertEquals(1, response.getServices().size());
        assertEquals("api", response.getServices().getFirst().getName());
    }
}
