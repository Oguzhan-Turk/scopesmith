package com.scopesmith.config;

import com.scopesmith.service.CredentialService;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Lazy;

@Configuration
@ConfigurationProperties(prefix = "jira")
@Getter
@Setter
public class JiraConfig {

    private String url;
    private String email;
    private String apiToken;
    private String projectKey;

    @Lazy
    private final CredentialService credentialService;

    public JiraConfig(@Lazy CredentialService credentialService) {
        this.credentialService = credentialService;
    }

    public String getUrl() {
        return credentialService.get("JIRA_URL").orElse(url);
    }

    public String getEmail() {
        return credentialService.get("JIRA_EMAIL").orElse(email);
    }

    public String getApiToken() {
        return credentialService.get("JIRA_API_TOKEN").orElse(apiToken);
    }

    public boolean isConfigured() {
        String u = getUrl();
        String e = getEmail();
        String t = getApiToken();
        return u != null && !u.isBlank()
                && e != null && !e.isBlank()
                && t != null && !t.isBlank();
    }
}
