package com.scopesmith.config;

import com.scopesmith.entity.Organization;
import com.scopesmith.entity.ProjectMembership;
import com.scopesmith.entity.ProjectRole;
import com.scopesmith.repository.AppUserRepository;
import com.scopesmith.repository.OrganizationRepository;
import com.scopesmith.repository.ProjectMembershipRepository;
import com.scopesmith.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class AdminSeeder implements ApplicationRunner {

    private final AppUserRepository appUserRepository;
    private final ProjectRepository projectRepository;
    private final ProjectMembershipRepository membershipRepository;
    private final OrganizationRepository organizationRepository;

    @Override
    public void run(ApplicationArguments args) {
        // User + org creation is handled by Flyway (V2 + V3)

        // Ensure default org exists (runtime safety for edge cases)
        Organization defaultOrg = organizationRepository.findBySlug("default")
                .orElseGet(() -> {
                    log.warn("Default organization missing — creating");
                    return organizationRepository.save(Organization.builder()
                            .name("Default")
                            .slug("default")
                            .build());
                });

        // Assign orphan users (no org) to default org
        appUserRepository.findAll().stream()
                .filter(u -> u.getOrganization() == null)
                .forEach(u -> {
                    u.setOrganization(defaultOrg);
                    appUserRepository.save(u);
                    log.info("Assigned user '{}' to default organization", u.getUsername());
                });

        // Ensure all existing projects have at least one membership (runtime safety)
        projectRepository.findAll().forEach(project -> {
            if (membershipRepository.findByProjectId(project.getId()).isEmpty()) {
                appUserRepository.findByUsername("admin").ifPresent(admin -> {
                    membershipRepository.save(ProjectMembership.builder()
                            .user(admin)
                            .project(project)
                            .role(ProjectRole.OWNER)
                            .build());
                    log.info("Auto-assigned admin as OWNER of project #{} ({})", project.getId(), project.getName());
                });
            }
        });
    }
}
