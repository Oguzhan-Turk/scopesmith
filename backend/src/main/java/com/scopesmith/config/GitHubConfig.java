package com.scopesmith.config;

import com.scopesmith.service.CredentialService;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Lazy;

@Configuration
@ConfigurationProperties(prefix = "github")
@Getter
@Setter
public class GitHubConfig {

    private String token;
    private String repo;

    @Lazy
    private final CredentialService credentialService;

    public GitHubConfig(@Lazy CredentialService credentialService) {
        this.credentialService = credentialService;
    }

    public String getToken() {
        return credentialService.get("GITHUB_TOKEN").orElse(token);
    }

    public String getRepo() {
        return credentialService.get("GITHUB_REPO").orElse(repo);
    }

    public boolean isConfigured() {
        String t = getToken();
        String r = getRepo();
        return t != null && !t.isBlank()
                && r != null && !r.isBlank();
    }
}
