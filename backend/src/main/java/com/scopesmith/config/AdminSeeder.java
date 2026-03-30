package com.scopesmith.config;

import com.scopesmith.entity.AppUser;
import com.scopesmith.entity.Role;
import com.scopesmith.repository.AppUserRepository;
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
    }
}
