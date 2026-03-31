package com.scopesmith.config;

import com.scopesmith.entity.AppUser;
import com.scopesmith.entity.ProjectMembership;
import com.scopesmith.entity.ProjectRole;
import com.scopesmith.entity.Role;
import com.scopesmith.repository.AppUserRepository;
import com.scopesmith.repository.ProjectMembershipRepository;
import com.scopesmith.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class AdminSeeder implements ApplicationRunner {

    private final AppUserRepository appUserRepository;
    private final ProjectRepository projectRepository;
    private final ProjectMembershipRepository membershipRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(ApplicationArguments args) {
        if (appUserRepository.findByUsername("admin").isEmpty()) {
            AppUser admin = AppUser.builder()
                    .username("admin")
                    .passwordHash(passwordEncoder.encode("admin123"))
                    .role(Role.ADMIN)
                    .build();
            appUserRepository.save(admin);
            log.info("Default admin user created (admin/admin123)");
        }

        if (appUserRepository.findByUsername("user").isEmpty()) {
            AppUser user = AppUser.builder()
                    .username("user")
                    .passwordHash(passwordEncoder.encode("user123"))
                    .role(Role.USER)
                    .build();
            appUserRepository.save(user);
            log.info("Default user created (user/user123)");
        }

        // Ensure all existing projects have at least one membership (migration safety)
        projectRepository.findAll().forEach(project -> {
            if (membershipRepository.findByProjectId(project.getId()).isEmpty()) {
                // Assign admin as OWNER for orphaned projects
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
