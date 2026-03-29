package com.scopesmith.service;

import com.scopesmith.dto.ProjectRequest;
import com.scopesmith.dto.ProjectResponse;
import com.scopesmith.entity.Project;
import com.scopesmith.repository.ProjectRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ProjectService {

    private final ProjectRepository projectRepository;

    @Transactional
    public ProjectResponse create(ProjectRequest request) {
        Project project = Project.builder()
                .name(request.getName())
                .description(request.getDescription())
                .repoUrl(request.getRepoUrl())
                .build();

        return ProjectResponse.from(projectRepository.save(project));
    }

    @Transactional(readOnly = true)
    public List<ProjectResponse> findAll() {
        return projectRepository.findAll().stream()
                .map(ProjectResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public ProjectResponse findById(Long id) {
        return ProjectResponse.from(getProjectOrThrow(id));
    }

    @Transactional
    public ProjectResponse update(Long id, ProjectRequest request) {
        Project project = getProjectOrThrow(id);
        project.setName(request.getName());
        project.setDescription(request.getDescription());
        project.setRepoUrl(request.getRepoUrl());

        return ProjectResponse.from(projectRepository.save(project));
    }

    @Transactional
    public void delete(Long id) {
        Project project = getProjectOrThrow(id);
        projectRepository.delete(project);
    }

    @Transactional
    public void save(Project project) {
        projectRepository.save(project);
    }

    /**
     * Internal helper — used by other services that need the entity, not the DTO.
     */
    public Project getProjectOrThrow(Long id) {
        return projectRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Project not found with id: " + id));
    }
}
