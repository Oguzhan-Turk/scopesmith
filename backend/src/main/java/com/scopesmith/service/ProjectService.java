package com.scopesmith.service;

import com.scopesmith.dto.ProjectRequest;
import com.scopesmith.dto.ProjectResponse;
import com.scopesmith.entity.AppUser;
import com.scopesmith.entity.Project;
import com.scopesmith.entity.ProjectRole;
import com.scopesmith.repository.ProjectMembershipRepository;
import com.scopesmith.repository.ProjectRepository;
import com.scopesmith.repository.RequirementRepository;
import com.scopesmith.repository.UsageRecordRepository;
import java.time.LocalDateTime;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final ProjectAccessService accessService;
    private final ProjectMembershipRepository membershipRepository;
    private final UsageRecordRepository usageRecordRepository;
    private final RequirementRepository requirementRepository;

    @Transactional
    public ProjectResponse create(ProjectRequest request) {
        AppUser currentUser = accessService.getCurrentUser()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));

        Project project = Project.builder()
                .name(request.getName())
                .description(request.getDescription())
                .repoUrl(request.getRepoUrl())
                .organization(currentUser.getOrganization())
                .build();

        Project saved = projectRepository.save(project);

        // Auto-assign OWNER to creator
        accessService.addMembership(currentUser.getId(), saved.getId(), ProjectRole.OWNER);

        return ProjectResponse.from(saved);
    }

    /**
     * List projects — admin sees all, users see only their org's projects (filtered by membership).
     */
    @Transactional(readOnly = true)
    public List<ProjectResponse> findAll() {
        List<Long> accessibleIds = accessService.getAccessibleProjectIds();

        List<Project> projects;
        if (accessibleIds == null) {
            // Admin — all projects across all organizations
            projects = projectRepository.findAll(Sort.by(Sort.Direction.DESC, "id"));
        } else if (accessibleIds.isEmpty()) {
            return List.of();
        } else {
            projects = projectRepository.findByIdInOrderByIdDesc(accessibleIds);
        }

        return projects.stream()
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

    /**
     * Returns counts of what would be deleted — shown in the confirmation dialog.
     */
    @Transactional(readOnly = true)
    public Map<String, Long> getDeleteSummary(Long id) {
        Project project = getProjectOrThrow(id);
        long reqCount = requirementRepository.countByProjectId(id);
        long usageCount = usageRecordRepository.countByProjectId(id);
        return Map.of(
            "requirements", reqCount,
            "documents", (long) project.getDocuments().size(),
            "aiCalls", usageCount
        );
    }

    /**
     * Soft delete — sets deleted_at timestamp, project disappears from all queries.
     * Restore: UPDATE projects SET deleted_at = NULL WHERE id = ?
     */
    @Transactional
    public void deleteWithConfirmation(Long id, String confirmName) {
        Project project = getProjectOrThrow(id);
        if (!project.getName().equals(confirmName)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Proje adı eşleşmiyor. Silme işlemi iptal edildi.");
        }
        project.setDeletedAt(java.time.LocalDateTime.now());
        projectRepository.save(project);
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
