package com.scopesmith.config;

import com.scopesmith.service.ProjectAccessService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Intercepts all /api/v1/projects/{projectId}/** requests and checks access.
 * Admin bypasses all checks. Regular users need ProjectMembership.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ProjectAccessInterceptor implements HandlerInterceptor {

    private final ProjectAccessService projectAccessService;

    private static final Pattern PROJECT_PATH = Pattern.compile("/api/v1/projects/(\\d+)");

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        String path = request.getRequestURI();

        Matcher matcher = PROJECT_PATH.matcher(path);
        if (matcher.find()) {
            Long projectId = Long.parseLong(matcher.group(1));
            if (!projectAccessService.canAccess(projectId)) {
                log.warn("Access denied to project #{} for user", projectId);
                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                response.getWriter().write("{\"error\":\"Forbidden\",\"message\":\"Bu projeye erişim yetkiniz yok\"}");
                response.setContentType("application/json");
                return false;
            }
        }

        return true;
    }
}
