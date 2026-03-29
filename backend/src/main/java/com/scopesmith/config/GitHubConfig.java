package com.scopesmith.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "github")
@Getter
@Setter
public class GitHubConfig {

    private String token;
    private String repo; // "owner/repo" format

    public boolean isConfigured() {
        return token != null && !token.isBlank()
                && repo != null && !repo.isBlank();
    }
}
