package com.scopesmith.service;

import com.scopesmith.dto.ProjectServiceRequest;
import com.scopesmith.dto.ProjectServiceResponse;
import com.scopesmith.dto.ServiceDependencyRequest;
import com.scopesmith.dto.ServiceDependencyResponse;
import com.scopesmith.dto.FederatedContextResponse;
import com.scopesmith.dto.ServiceGraphResponse;
import com.scopesmith.entity.Project;
import com.scopesmith.entity.ProjectServiceNode;
import com.scopesmith.entity.ServiceDependency;
import com.scopesmith.entity.ServiceType;
import com.scopesmith.repository.ProjectServiceNodeRepository;
import com.scopesmith.repository.ServiceDependencyRepository;
import com.scopesmith.util.StructuredContextFormatter;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class ProjectServiceRegistryService {

    private final ProjectService projectService;
    private final ProjectServiceNodeRepository projectServiceNodeRepository;
    private final ServiceDependencyRepository serviceDependencyRepository;

    @Transactional(readOnly = true)
    public List<ProjectServiceResponse> listServices(Long projectId) {
        projectService.getProjectOrThrow(projectId);
        return projectServiceNodeRepository.findByProjectIdOrderByNameAsc(projectId)
                .stream()
                .map(ProjectServiceResponse::from)
                .toList();
    }

    @Transactional
    public ProjectServiceResponse createService(Long projectId, ProjectServiceRequest request) {
        Project project = projectService.getProjectOrThrow(projectId);
        validateName(request.getName());

        if (projectServiceNodeRepository.existsByProjectIdAndNameIgnoreCase(projectId, request.getName().trim())) {
            throw new IllegalArgumentException("Aynı isimde service zaten mevcut.");
        }

        ProjectServiceNode service = ProjectServiceNode.builder()
                .project(project)
                .name(request.getName().trim())
                .serviceType(request.getServiceType() != null ? request.getServiceType() : ServiceType.OTHER)
                .repoUrl(blankToNull(request.getRepoUrl()))
                .localPath(blankToNull(request.getLocalPath()))
                .defaultBranch(blankToNull(request.getDefaultBranch()))
                .ownerTeam(blankToNull(request.getOwnerTeam()))
                .active(request.getActive() != null ? request.getActive() : Boolean.TRUE)
                .build();

        return ProjectServiceResponse.from(projectServiceNodeRepository.save(service));
    }

    @Transactional
    public ProjectServiceResponse updateService(Long projectId, Long serviceId, ProjectServiceRequest request) {
        ProjectServiceNode service = findServiceOrThrow(projectId, serviceId);

        if (request.getName() != null) {
            validateName(request.getName());
            String normalized = request.getName().trim();
            if (!service.getName().equalsIgnoreCase(normalized)
                    && projectServiceNodeRepository.existsByProjectIdAndNameIgnoreCase(projectId, normalized)) {
                throw new IllegalArgumentException("Aynı isimde service zaten mevcut.");
            }
            service.setName(normalized);
        }
        if (request.getServiceType() != null) service.setServiceType(request.getServiceType());
        if (request.getRepoUrl() != null) service.setRepoUrl(blankToNull(request.getRepoUrl()));
        if (request.getLocalPath() != null) service.setLocalPath(blankToNull(request.getLocalPath()));
        if (request.getDefaultBranch() != null) service.setDefaultBranch(blankToNull(request.getDefaultBranch()));
        if (request.getOwnerTeam() != null) service.setOwnerTeam(blankToNull(request.getOwnerTeam()));
        if (request.getActive() != null) service.setActive(request.getActive());

        return ProjectServiceResponse.from(projectServiceNodeRepository.save(service));
    }

    @Transactional
    public void deleteService(Long projectId, Long serviceId) {
        ProjectServiceNode service = findServiceOrThrow(projectId, serviceId);
        projectServiceNodeRepository.delete(service);
    }

    @Transactional(readOnly = true)
    public ServiceGraphResponse getGraph(Long projectId) {
        projectService.getProjectOrThrow(projectId);
        List<ProjectServiceResponse> services = projectServiceNodeRepository.findByProjectIdOrderByNameAsc(projectId).stream()
                .map(ProjectServiceResponse::from)
                .toList();
        List<ServiceDependencyResponse> dependencies = serviceDependencyRepository.findByProjectIdOrderByIdAsc(projectId).stream()
                .map(ServiceDependencyResponse::from)
                .toList();
        return ServiceGraphResponse.builder()
                .projectId(projectId)
                .services(services)
                .dependencies(dependencies)
                .build();
    }

    @Transactional(readOnly = true)
    public FederatedContextResponse getFederatedContext(Long projectId) {
        projectService.getProjectOrThrow(projectId);
        List<ProjectServiceNode> services = projectServiceNodeRepository.findByProjectIdOrderByNameAsc(projectId)
                .stream()
                .filter(s -> Boolean.TRUE.equals(s.getActive()))
                .toList();

        StringBuilder combined = new StringBuilder();
        List<FederatedContextResponse.ServiceContextItem> items = services.stream()
                .map(s -> {
                    combined.append("## Service: ").append(s.getName())
                            .append(" (").append(s.getServiceType()).append(")\n\n");
                    if (s.getTechContext() != null && !s.getTechContext().isBlank()) {
                        combined.append(s.getTechContext()).append("\n\n");
                    }
                    String structured = StructuredContextFormatter.format(s.getStructuredContext());
                    if (!structured.isBlank()) {
                        combined.append(structured);
                    }
                    return FederatedContextResponse.ServiceContextItem.builder()
                            .serviceId(s.getId())
                            .name(s.getName())
                            .serviceType(s.getServiceType())
                            .contextVersion(s.getContextVersion())
                            .lastScannedAt(s.getLastScannedAt())
                            .hasContext((s.getTechContext() != null && !s.getTechContext().isBlank())
                                    || (s.getStructuredContext() != null && !s.getStructuredContext().isBlank()))
                            .build();
                })
                .toList();

        return FederatedContextResponse.builder()
                .projectId(projectId)
                .generatedAt(LocalDateTime.now())
                .serviceCount(items.size())
                .services(items)
                .combinedContext(combined.toString().trim())
                .build();
    }

    @Transactional
    public ServiceDependencyResponse addDependency(Long projectId, ServiceDependencyRequest request) {
        if (request.getFromServiceId() == null || request.getToServiceId() == null) {
            throw new IllegalArgumentException("fromServiceId ve toServiceId zorunludur.");
        }
        if (request.getFromServiceId().equals(request.getToServiceId())) {
            throw new IllegalArgumentException("Service kendi kendine bağımlı olamaz.");
        }
        Project project = projectService.getProjectOrThrow(projectId);
        ProjectServiceNode from = findServiceOrThrow(projectId, request.getFromServiceId());
        ProjectServiceNode to = findServiceOrThrow(projectId, request.getToServiceId());
        if (serviceDependencyRepository.existsByProjectIdAndFromServiceIdAndToServiceId(
                projectId, from.getId(), to.getId())) {
            throw new IllegalArgumentException("Bu bağımlılık zaten kayıtlı.");
        }

        ServiceDependency dependency = ServiceDependency.builder()
                .project(project)
                .fromService(from)
                .toService(to)
                .dependencyType(blankToNull(request.getDependencyType()) != null
                        ? request.getDependencyType().trim().toUpperCase(java.util.Locale.ENGLISH)
                        : "SYNC")
                .build();

        return ServiceDependencyResponse.from(serviceDependencyRepository.save(dependency));
    }

    @Transactional
    public void deleteDependency(Long projectId, Long dependencyId) {
        ServiceDependency dependency = serviceDependencyRepository.findByIdAndProjectId(dependencyId, projectId)
                .orElseThrow(() -> new EntityNotFoundException("Service dependency not found: " + dependencyId));
        serviceDependencyRepository.delete(dependency);
    }

    private ProjectServiceNode findServiceOrThrow(Long projectId, Long serviceId) {
        return projectServiceNodeRepository.findByIdAndProjectId(serviceId, projectId)
                .orElseThrow(() -> new EntityNotFoundException("Project service not found: " + serviceId));
    }

    private void validateName(String name) {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("Service name boş olamaz.");
        }
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
