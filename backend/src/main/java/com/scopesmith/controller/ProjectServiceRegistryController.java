package com.scopesmith.controller;

import com.scopesmith.dto.ProjectServiceRequest;
import com.scopesmith.dto.ProjectServiceResponse;
import com.scopesmith.dto.ServiceDependencyRequest;
import com.scopesmith.dto.ServiceDependencyResponse;
import com.scopesmith.dto.FederatedContextResponse;
import com.scopesmith.dto.ServiceScanRequest;
import com.scopesmith.dto.ServiceScanResponse;
import com.scopesmith.dto.ServiceGraphResponse;
import com.scopesmith.service.ResourceAccessService;
import com.scopesmith.service.ProjectServiceRegistryService;
import com.scopesmith.service.ServiceContextScanService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/projects/{projectId}/services")
@RequiredArgsConstructor
public class ProjectServiceRegistryController {

    private final ProjectServiceRegistryService registryService;
    private final ResourceAccessService resourceAccessService;
    private final ServiceContextScanService serviceContextScanService;

    @GetMapping
    public List<ProjectServiceResponse> list(@PathVariable Long projectId) {
        resourceAccessService.assertProjectAccess(projectId);
        return registryService.listServices(projectId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ProjectServiceResponse create(
            @PathVariable Long projectId,
            @RequestBody ProjectServiceRequest request) {
        resourceAccessService.assertProjectEdit(projectId);
        return registryService.createService(projectId, request);
    }

    @PutMapping("/{serviceId}")
    public ProjectServiceResponse update(
            @PathVariable Long projectId,
            @PathVariable Long serviceId,
            @RequestBody ProjectServiceRequest request) {
        resourceAccessService.assertProjectEdit(projectId);
        return registryService.updateService(projectId, serviceId, request);
    }

    @DeleteMapping("/{serviceId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(
            @PathVariable Long projectId,
            @PathVariable Long serviceId) {
        resourceAccessService.assertProjectEdit(projectId);
        registryService.deleteService(projectId, serviceId);
    }

    @GetMapping("/graph")
    public ServiceGraphResponse graph(@PathVariable Long projectId) {
        resourceAccessService.assertProjectAccess(projectId);
        return registryService.getGraph(projectId);
    }

    @GetMapping("/federated-context")
    public FederatedContextResponse federatedContext(@PathVariable Long projectId) {
        resourceAccessService.assertProjectAccess(projectId);
        return registryService.getFederatedContext(projectId);
    }

    @PostMapping("/{serviceId}/scan")
    public ServiceScanResponse scanService(
            @PathVariable Long projectId,
            @PathVariable Long serviceId,
            @RequestBody(required = false) ServiceScanRequest request) {
        resourceAccessService.assertProjectEdit(projectId);
        String folderPath = request != null ? request.getFolderPath() : null;
        return serviceContextScanService.scanService(projectId, serviceId, folderPath);
    }

    @PostMapping("/dependencies")
    @ResponseStatus(HttpStatus.CREATED)
    public ServiceDependencyResponse addDependency(
            @PathVariable Long projectId,
            @RequestBody ServiceDependencyRequest request) {
        resourceAccessService.assertProjectEdit(projectId);
        return registryService.addDependency(projectId, request);
    }

    @DeleteMapping("/dependencies/{dependencyId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteDependency(
            @PathVariable Long projectId,
            @PathVariable Long dependencyId) {
        resourceAccessService.assertProjectEdit(projectId);
        registryService.deleteDependency(projectId, dependencyId);
    }
}
