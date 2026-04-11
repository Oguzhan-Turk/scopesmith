package com.scopesmith.service;

import com.scopesmith.entity.AppUser;
import com.scopesmith.entity.ProjectMembership;
import com.scopesmith.entity.ProjectRole;
import com.scopesmith.entity.Role;
import com.scopesmith.repository.AppUserRepository;
import com.scopesmith.repository.ProjectMembershipRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProjectAccessServiceTest {

    @Mock
    private AppUserRepository appUserRepository;
    @Mock
    private ProjectMembershipRepository membershipRepository;

    @InjectMocks
    private ProjectAccessService projectAccessService;

    @Test
    void canManageMembersShouldAllowAdmin() {
        AppUser admin = AppUser.builder().id(1L).username("admin").role(Role.ADMIN).build();
        assertTrue(projectAccessService.canManageMembers(admin, 99L));
    }

    @Test
    void canManageMembersShouldAllowOnlyOwnerForNonAdmin() {
        AppUser editor = AppUser.builder().id(2L).username("editor").role(Role.USER).build();
        ProjectMembership membership = ProjectMembership.builder().role(ProjectRole.EDITOR).build();
        when(membershipRepository.findByUserIdAndProjectId(2L, 10L)).thenReturn(Optional.of(membership));

        assertFalse(projectAccessService.canManageMembers(editor, 10L));
    }

    @Test
    void canManageMembersShouldAllowOwnerForNonAdmin() {
        AppUser owner = AppUser.builder().id(3L).username("owner").role(Role.USER).build();
        ProjectMembership membership = ProjectMembership.builder().role(ProjectRole.OWNER).build();
        when(membershipRepository.findByUserIdAndProjectId(3L, 11L)).thenReturn(Optional.of(membership));

        assertTrue(projectAccessService.canManageMembers(owner, 11L));
    }
}
