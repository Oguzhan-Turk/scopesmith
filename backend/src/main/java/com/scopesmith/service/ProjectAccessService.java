package com.scopesmith.service;

import com.scopesmith.entity.AppUser;
import com.scopesmith.entity.ProjectMembership;
import com.scopesmith.entity.ProjectRole;
import com.scopesmith.entity.Role;
import com.scopesmith.repository.AppUserRepository;
import com.scopesmith.repository.ProjectMembershipRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

/**
 * Central access control for projects.
 * Admin bypasses all checks. Regular users need ProjectMembership.
 * Default deny — if no membership exists, access is denied.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ProjectAccessService {

    private final AppUserRepository appUserRepository;
    private final ProjectMembershipRepository membershipRepository;

    /**
     * Get the currently authenticated user.
     */
    public Optional<AppUser> getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            return Optional.empty();
        }
        return appUserRepository.findByUsername(auth.getName());
    }

    /**
     * Can this user access this project?
     * Admin: always true. Others: need membership.
     */
    public boolean canAccess(Long projectId) {
        return getCurrentUser().map(user -> canAccess(user, projectId)).orElse(false);
    }

    public boolean canAccess(AppUser user, Long projectId) {
        if (user.getRole() == Role.ADMIN) return true;
        return membershipRepository.existsByUserIdAndProjectId(user.getId(), projectId);
    }

    /**
     * Can this user edit this project? (OWNER or EDITOR role required)
     */
    public boolean canEdit(Long projectId) {
        return getCurrentUser().map(user -> {
            if (user.getRole() == Role.ADMIN) return true;
            return membershipRepository.findByUserIdAndProjectId(user.getId(), projectId)
                    .map(m -> m.getRole() != ProjectRole.VIEWER)
                    .orElse(false);
        }).orElse(false);
    }

    /**
     * Get project IDs accessible by current user.
     * Admin: null (means all). Others: membership-based list.
     */
    public List<Long> getAccessibleProjectIds() {
        return getCurrentUser().map(user -> {
            if (user.getRole() == Role.ADMIN) return (List<Long>) null;
            return membershipRepository.findProjectIdsByUserId(user.getId());
        }).orElse(List.of());
    }

    /**
     * Add membership — used when creating projects or inviting users.
     */
    public void addMembership(Long userId, Long projectId, ProjectRole role) {
        if (membershipRepository.existsByUserIdAndProjectId(userId, projectId)) {
            log.info("Membership already exists for user #{} on project #{}", userId, projectId);
            return;
        }
        AppUser user = appUserRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found: " + userId));
        com.scopesmith.entity.Project project = new com.scopesmith.entity.Project();
        project.setId(projectId);

        membershipRepository.save(ProjectMembership.builder()
                .user(user)
                .project(project)
                .role(role)
                .build());
        log.info("Added {} membership for user #{} on project #{}", role, userId, projectId);
    }
}
