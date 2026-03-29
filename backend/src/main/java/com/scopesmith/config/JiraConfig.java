package com.scopesmith.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "jira")
@Getter
@Setter
public class JiraConfig {

    private String url;
    private String email;
    private String apiToken;
    private String projectKey;

    public boolean isConfigured() {
        return url != null && !url.isBlank()
                && email != null && !email.isBlank()
                && apiToken != null && !apiToken.isBlank();
    }
}
