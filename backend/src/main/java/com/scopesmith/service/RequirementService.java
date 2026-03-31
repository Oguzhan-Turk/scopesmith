package com.scopesmith.service;

import com.scopesmith.dto.RequirementRequest;
import com.scopesmith.dto.RequirementResponse;
import com.scopesmith.entity.Project;
import com.scopesmith.entity.Requirement;
import com.scopesmith.entity.RequirementType;
import com.scopesmith.repository.RequirementRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class RequirementService {

    private final RequirementRepository requirementRepository;
    private final ProjectService projectService;

    @Transactional
    public RequirementResponse create(Long projectId, RequirementRequest request) {
        Project project = projectService.getProjectOrThrow(projectId);

        RequirementType type = parseType(request.getType());
        int nextSeq = requirementRepository.findMaxSequenceNumberByProjectId(projectId) + 1;

        Requirement requirement = Requirement.builder()
                .project(project)
                .rawText(request.getRawText())
                .type(type)
                .sequenceNumber(nextSeq)
                .build();

        return RequirementResponse.from(requirementRepository.save(requirement));
    }

    @Transactional(readOnly = true)
    public List<RequirementResponse> findByProject(Long projectId) {
        // Validate project exists
        projectService.getProjectOrThrow(projectId);

        return requirementRepository.findByProjectIdOrderByCreatedAtDesc(projectId).stream()
                .map(RequirementResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public RequirementResponse findById(Long id) {
        return RequirementResponse.from(getRequirementOrThrow(id));
    }

    /**
     * Updates the raw text and increments the version.
     * This enables change impact analysis (Feature C).
     */
    @Transactional
    public RequirementResponse update(Long id, RequirementRequest request) {
        Requirement requirement = getRequirementOrThrow(id);
        requirement.setRawText(request.getRawText());
        requirement.setVersion(requirement.getVersion() + 1);

        return RequirementResponse.from(requirementRepository.save(requirement));
    }

    @Transactional
    public void delete(Long id) {
        Requirement requirement = getRequirementOrThrow(id);
        requirementRepository.delete(requirement);
    }

    private RequirementType parseType(String type) {
        if (type == null || type.isBlank()) return RequirementType.FEATURE;
        try {
            return RequirementType.valueOf(type.toUpperCase(java.util.Locale.ENGLISH));
        } catch (IllegalArgumentException e) {
            return RequirementType.FEATURE;
        }
    }

    public Requirement getRequirementOrThrow(Long id) {
        return requirementRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Requirement not found with id: " + id));
    }
}
